-- Lucky Cat Mahjong — migration 004: admin-opened rooms, players who join can score, editable hands.
-- Run AFTER schema.sql, migration_002 and migration_003.

-- ============ 1. Who may do what ============
-- can_play_game: owner (the admin who opened the table), anyone who joined with the room code, or any admin.
create or replace function public.can_play_game(gid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.games where id = gid and owner_id = auth.uid())
    or exists (select 1 from public.game_members where game_id = gid and user_id = auth.uid())
    or public.is_admin()) $$;
grant execute on function public.can_play_game(uuid) to authenticated;

-- Only admins open tables. Enforced in the database, so it cannot be bypassed from the browser.
-- (auth.uid() is null for the SQL editor / service role, so seed scripts and maintenance still work.)
create or replace function public.require_admin_to_open_game() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'Only admins can open a table'; end if;
  return new;
end $$;
drop trigger if exists games_admin_only_insert on public.games;
create trigger games_admin_only_insert before insert on public.games for each row execute function public.require_admin_to_open_game();

-- Pause / finish: the owner or any admin. (Players who joined can record, edit and undo hands, but not end the game.)
create or replace function public.set_game_paused(p_game uuid, p_paused boolean) returns void language plpgsql security definer set search_path = public as $$
declare g public.games;
begin
  select * into g from games where id = p_game for update;
  if g.id is null or (g.owner_id <> auth.uid() and not public.is_admin()) then raise exception 'Not allowed'; end if;
  if g.status = 'finished' then raise exception 'Game is already finished'; end if;
  update games set status = case when p_paused then 'paused' else 'in_progress' end where id = p_game;
end $$;

create or replace function public.finish_game(p_game uuid) returns void language plpgsql security definer set search_path = public as $$
declare g public.games;
begin
  select * into g from games where id = p_game for update;
  if g.id is null or (g.owner_id <> auth.uid() and not public.is_admin()) then raise exception 'Not allowed'; end if;
  if g.status = 'finished' then raise exception 'Game is already finished'; end if;
  update games set status = 'finished', finished_at = now() where id = p_game;
  update game_players gp set final_rank = r.rk
    from (select id, rank() over (order by current_score desc) rk from game_players where game_id = p_game) r where gp.id = r.id;
end $$;

create or replace function public.undo_last_hand(p_game uuid) returns int language plpgsql security definer set search_path = public as $$
declare g public.games; h public.game_hands;
begin
  select * into g from games where id = p_game for update;
  if g.id is null or not public.can_play_game(p_game) then raise exception 'Not allowed'; end if;
  if g.status = 'finished' then raise exception 'A finished game cannot be changed'; end if;
  select * into h from game_hands where game_id = p_game order by hand_number desc limit 1;
  if h.id is null then raise exception 'No hand to undo'; end if;
  update game_players gp set current_score = gp.current_score - t.sum_change
    from (select player_id, sum(points_change) sum_change from score_transactions where hand_id = h.id group by player_id) t where gp.id = t.player_id;
  delete from game_hands where id = h.id;
  update games set current_round_wind = h.state_before->>'round_wind', current_dealer_seat = (h.state_before->>'dealer_seat')::int,
    dealer_rotations = (h.state_before->>'dealer_rotations')::int where id = p_game;
  return h.hand_number;
end $$;

-- ============ 2. Editing a hand ============
alter table public.game_hands add column if not exists edited_at timestamptz;

-- Called ONLY by the Next.js server (service role) after it REPLAYED the whole game with the shared scoring engine.
-- Rewrites every hand + faan + score history and the final scores/dealer/round in ONE transaction: all or nothing.
create or replace function public.replace_game_hands_internal(p_user uuid, p_game uuid, p_expected int, p_hands jsonb, p_final jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.games; h jsonb; cnt int; hid uuid; chg_sum int; changed int;
begin
  select * into g from games where id = p_game for update;
  if g.id is null then raise exception 'Game not found'; end if;
  if not (g.owner_id = p_user or exists (select 1 from game_members where game_id = p_game and user_id = p_user)
          or exists (select 1 from profiles where id = p_user and role = 'ADMIN')) then raise exception 'Not allowed'; end if;
  if g.status = 'finished' then raise exception 'A finished game cannot be changed'; end if;

  select count(*) into cnt from game_hands where game_id = p_game;
  if cnt <> p_expected or jsonb_array_length(p_hands) <> cnt then raise exception 'Another hand was recorded first. Refresh and try again.'; end if;

  delete from score_transactions where game_id = p_game;
  delete from hand_fan_details where hand_id in (select id from game_hands where game_id = p_game);

  for h in select * from jsonb_array_elements(p_hands) loop
    hid := (h->>'id')::uuid;
    if h->>'winning_method' not in ('self_draw','discard','draw') then raise exception 'Invalid winning method'; end if;
    if (h->>'winning_method' = 'draw') <> (h->>'winner_player_id' is null) then raise exception 'A draw has no winner and a win needs one'; end if;
    if h->>'winning_method' = 'discard' and (h->>'discard_player_id' is null or h->>'discard_player_id' = h->>'winner_player_id') then raise exception 'Invalid discarding player'; end if;
    if h->>'winning_method' <> 'draw' and (h->>'total_fan')::int < g.min_fan then raise exception 'Hand % does not meet the minimum faan', h->>'hand_number'; end if;
    select coalesce(sum((x->>'change')::int), 0) into chg_sum from jsonb_array_elements(h->'changes') x;
    if chg_sum <> 0 then raise exception 'Score changes must balance to zero'; end if;

    update game_hands set round_wind = h->>'round_wind', dealer_player_id = (h->>'dealer_player_id')::uuid,
      winner_player_id = (h->>'winner_player_id')::uuid, winning_method = h->>'winning_method', discard_player_id = (h->>'discard_player_id')::uuid,
      total_fan = (h->>'total_fan')::int, final_points = (h->>'final_points')::int, hand_tiles = h->'hand_tiles', hand_detail = h->'hand_detail',
      state_before = h->'state_before', edited_at = case when (h->>'edited')::boolean then now() else edited_at end
    where id = hid and game_id = p_game;
    if not found then raise exception 'Hand not found in this game'; end if;

    insert into hand_fan_details (hand_id, fan_name, fan_value, fan_id, category)
      select hid, f->>'name', (f->>'fan')::int, f->>'id', f->>'category' from jsonb_array_elements(h->'fans') f;
    insert into score_transactions (game_id, hand_id, player_id, points_change, score_after)
      select p_game, hid, (c->>'player_id')::uuid, (c->>'change')::int, (c->>'score_after')::int from jsonb_array_elements(h->'changes') c;
  end loop;

  -- ONE statement for all players (the scores trigger then emits a single SCORE_UPDATED).
  update game_players gp set current_score = s.score
    from jsonb_to_recordset(p_final->'scores') as s(player_id uuid, score int) where gp.id = s.player_id and gp.game_id = p_game;
  get diagnostics changed = row_count;
  if changed <> 4 then raise exception 'Final scores must cover all four players'; end if;

  update games set current_round_wind = p_final->>'round_wind', current_dealer_seat = (p_final->>'dealer_seat')::int,
    dealer_rotations = (p_final->>'dealer_rotations')::int where id = p_game;
  return jsonb_build_object('hands', cnt);
end $$;
revoke all on function public.replace_game_hands_internal(uuid, uuid, int, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.replace_game_hands_internal(uuid, uuid, int, jsonb, jsonb) to service_role;

-- Players who joined the room record hands too, so they must also be able to trigger the TV "HU!" highlight.
create or replace function public.publish_winning_hand(p_hand uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare h public.game_hands; ct public.cafe_tables; w public.game_players; ev uuid := gen_random_uuid(); fans jsonb;
begin
  select * into h from public.game_hands where id = p_hand;
  if h.id is null then raise exception 'Hand not found'; end if;
  if not public.can_play_game(h.game_id) then raise exception 'Not allowed'; end if;
  if h.winner_player_id is null then return null; end if;                       -- draws are not highlighted
  select * into ct from public.cafe_tables where current_game_id = h.game_id;
  if ct.id is null then return null; end if;                                    -- only cafe tables appear on the TV
  select * into w from public.game_players where id = h.winner_player_id;
  select coalesce(jsonb_agg(jsonb_build_object('name', fan_name, 'fan', fan_value)), '[]') into fans from public.hand_fan_details where hand_id = p_hand;
  insert into public.game_events (id, game_id, table_id, hand_id, event_type, payload) values (ev, h.game_id, ct.id, p_hand, 'WINNING_HAND', jsonb_build_object(
    'eventId', ev, 'gameId', h.game_id, 'tableNumber', ct.table_number, 'winner', jsonb_build_object('id', w.id, 'name', w.player_name),
    'roundWind', h.round_wind, 'winningMethod', h.winning_method, 'detectedFan', fans, 'totalFan', h.total_fan, 'points', h.final_points,
    'handTiles', coalesce(h.hand_tiles, '[]'::jsonb), 'photoUrl', h.photo_url, 'createdAt', now()))
  on conflict do nothing;
  return ev;
end $$;

notify pgrst, 'reload schema';
