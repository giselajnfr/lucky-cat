-- 014: Chicken Hand pays from the bank (winner +1, nobody pays) and room-code guessing is limited.
-- Run after migration_013. Safe to run twice.

-- ============ 1. Chicken Hand: not zero-sum ============
create or replace function public.record_hand_internal(
  p_owner uuid, p_game uuid, p_request uuid, p_expected_hand int,
  p_winner uuid, p_discarder uuid, p_method text, p_total_fan int, p_points int,
  p_hand_tiles jsonb, p_hand_detail jsonb, p_fans jsonb, p_changes jsonb, p_next jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.games; hid uuid; n int; dealer uuid; changed int; total int; want_total int;
begin
  select * into g from games where id = p_game for update;
  if g.id is null or g.owner_id <> p_owner then raise exception 'Not allowed'; end if;
  if g.status <> 'in_progress' then raise exception 'Game is not in progress'; end if;

  select id into hid from game_hands where game_id = p_game and client_request_id = p_request;   -- duplicate submit: return the original
  if hid is not null then return jsonb_build_object('hand_id', hid, 'duplicate', true); end if;

  select coalesce(max(hand_number), 0) + 1 into n from game_hands where game_id = p_game;
  if n <> p_expected_hand then raise exception 'Another hand was recorded first. Refresh and try again.'; end if;
  if p_method not in ('self_draw','discard','draw') then raise exception 'Invalid winning method'; end if;
  if (p_method = 'draw') <> (p_winner is null) then raise exception 'A draw has no winner and a win needs one'; end if;
  if p_method = 'draw' and (p_total_fan <> 0 or p_points <> 0) then raise exception 'A draw cannot award points'; end if;
  if p_method <> 'draw' and p_total_fan < g.min_fan then raise exception 'Hand does not meet the minimum faan'; end if;
  if p_method = 'discard' and (p_discarder is null or p_discarder = p_winner) then raise exception 'Invalid discarding player'; end if;

  select (select gp.id from game_players gp where gp.game_id = p_game and gp.seat_position = g.current_dealer_seat) into dealer;
  if dealer is null then raise exception 'Dealer seat has no player'; end if;

  select coalesce(sum((x->>'change')::int), 0) into total from jsonb_array_elements(p_changes) x;
  -- Chicken Hand: the winner gets +1 and nobody pays, so a win adds exactly 1 point in total. Every other table must balance to zero.
  want_total := 0;
  if g.rule_preset = 'chicken' and p_method <> 'draw' then want_total := 1; end if;
  if total <> want_total then
    if g.rule_preset = 'chicken' then raise exception 'Chicken Hand: the winner gets 1 point and nobody pays'; end if;
    raise exception 'Score changes must balance to zero';
  end if;

  insert into game_hands (game_id, hand_number, round_wind, dealer_player_id, winner_player_id, winning_method, discard_player_id,
                          total_fan, final_points, hand_tiles, hand_detail, client_request_id, state_before)
  values (p_game, n, g.current_round_wind, dealer, p_winner, p_method, p_discarder, p_total_fan, p_points, p_hand_tiles, p_hand_detail, p_request,
          jsonb_build_object('round_wind', g.current_round_wind, 'dealer_seat', g.current_dealer_seat, 'dealer_rotations', g.dealer_rotations))
  returning id into hid;

  insert into hand_fan_details (hand_id, fan_name, fan_value, fan_id, category)
  select hid, f->>'name', (f->>'fan')::int, f->>'id', f->>'category' from jsonb_array_elements(p_fans) f;

  -- ONE statement updates all affected players (the scores trigger emits a single SCORE_UPDATED per statement).
  with ch as (select (x->>'player_id')::uuid pid, (x->>'change')::int chg from jsonb_array_elements(p_changes) x),
  upd as (
    update game_players gp set current_score = gp.current_score + ch.chg
    from ch where gp.id = ch.pid and gp.game_id = p_game
    returning gp.id, ch.chg, gp.current_score
  ), ins as (
    insert into score_transactions (game_id, hand_id, player_id, points_change, score_after)
    select p_game, hid, id, chg, current_score from upd returning 1
  )
  select count(*) into changed from ins;
  if changed <> jsonb_array_length(p_changes) then raise exception 'Score update touched an unexpected number of players'; end if;

  update games set current_round_wind = p_next->>'round_wind', current_dealer_seat = (p_next->>'dealer_seat')::int,
    dealer_rotations = (p_next->>'dealer_rotations')::int where id = p_game;

  return jsonb_build_object('hand_id', hid, 'hand_number', n, 'duplicate', false);
end $$;
revoke all on function public.record_hand_internal(uuid, uuid, uuid, int, uuid, uuid, text, int, int, jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.record_hand_internal(uuid, uuid, uuid, int, uuid, uuid, text, int, int, jsonb, jsonb, jsonb, jsonb, jsonb) to service_role;

create or replace function public.replace_game_hands_internal(p_user uuid, p_game uuid, p_expected int, p_hands jsonb, p_final jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.games; h jsonb; cnt int; hid uuid; chg_sum int; changed int; want_total int;
begin
  select * into g from games where id = p_game for update;
  if g.id is null then raise exception 'Game not found'; end if;
  if not (g.owner_id = p_user or exists (select 1 from game_members where game_id = p_game and user_id = p_user)
          or exists (select 1 from profiles where id = p_user and role = 'ADMIN')) then raise exception 'Not allowed'; end if;

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
    want_total := 0;
    if g.rule_preset = 'chicken' and h->>'winning_method' <> 'draw' then want_total := 1; end if;
    if chg_sum <> want_total then
      if g.rule_preset = 'chicken' then raise exception 'Chicken Hand: the winner gets 1 point and nobody pays'; end if;
      raise exception 'Score changes must balance to zero';
    end if;

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
  -- A finished game stays editable (a hand was entered wrong, or the table ended it by mistake): its final ranking follows the new scores.
  if g.status = 'finished' then
    update game_players gp set final_rank = r.rk
      from (select id, rank() over (order by current_score desc) rk from game_players where game_id = p_game) r where gp.id = r.id;
  end if;
  return jsonb_build_object('hands', cnt);
end $$;
revoke all on function public.replace_game_hands_internal(uuid, uuid, int, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.replace_game_hands_internal(uuid, uuid, int, jsonb, jsonb) to service_role;

-- ============ 2. Limit wrong room codes: 7 wrong codes per 1 minute per user ============
create table if not exists public.join_attempts (id bigserial primary key, user_id uuid not null, at timestamptz not null default now());
create index if not exists join_attempts_user_at on public.join_attempts (user_id, at desc);
alter table public.join_attempts enable row level security;
revoke all on public.join_attempts from anon, authenticated;

-- Returns the game id, or null when the code is wrong (a wrong code is stored, so it counts toward the limit).
create or replace function public.join_game(code text) returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if (select count(*) from public.join_attempts where user_id = auth.uid() and at > now() - interval '1 minute') >= 7 then
    raise exception 'Too many wrong codes. Try again in 1 minute';
  end if;
  select id into gid from public.games where room_code = upper(btrim(coalesce(code, '')));
  if gid is null then
    insert into public.join_attempts (user_id) values (auth.uid());
    return null;
  end if;
  insert into public.game_members (game_id, user_id) values (gid, auth.uid()) on conflict do nothing;
  return gid;
end $$;
grant execute on function public.join_game(text) to authenticated;
notify pgrst, 'reload schema';
