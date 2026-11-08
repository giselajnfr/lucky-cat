-- Lucky Cat Mahjong — migration 003: Game Tracker, player roster, atomic scoring, HK18.
-- Run AFTER schema.sql and migration_002_admin_tv.sql. Safe to read top to bottom; every change is additive
-- except section 5, which deliberately removes direct client writes to scoring tables (see comments there).

-- ============ 1. New columns on existing tables (backward compatible) ============
alter table public.games
  add column if not exists name text,
  add column if not exists played_at timestamptz not null default now(),
  add column if not exists rules_id text not null default 'HK18',
  add column if not exists min_fan int not null default 3 check (min_fan between 1 and 99),
  add column if not exists last_round_wind text not null default 'north' check (last_round_wind in ('east','south','west','north'));
-- HK18 points equal faan, so a new game starts at 0. (Legacy columns fan_cap / fan_conversion are no longer used.)
alter table public.games alter column starting_points set default 0;

alter table public.game_hands
  add column if not exists client_request_id uuid,                 -- idempotency key: a double-submit cannot score twice
  add column if not exists hand_detail jsonb,                      -- structured hand: melds, concealed tiles, flowers, context
  add column if not exists state_before jsonb;                     -- round wind / dealer before this hand (used by undo)
create unique index if not exists game_hands_request_uq on public.game_hands(game_id, client_request_id) where client_request_id is not null;
create index if not exists game_hands_winner_idx on public.game_hands(winner_player_id);

alter table public.hand_fan_details
  add column if not exists fan_id text,
  add column if not exists category text check (category in ('pattern','additional'));

-- One transaction row per player per hand: duplicates are impossible at the database level.
create unique index if not exists score_tx_hand_player_uq on public.score_transactions(hand_id, player_id);
create index if not exists games_status_idx on public.games(status, created_at desc);

-- ============ 2. Player roster (registered players and guests, owned by the game creator) ============
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  user_id uuid references public.profiles(id) on delete set null,  -- null = guest (no account needed)
  created_at timestamptz not null default now()
);
create unique index if not exists players_owner_name_uq on public.players(owner_id, lower(btrim(name)));
create unique index if not exists players_owner_user_uq on public.players(owner_id, user_id) where user_id is not null;

alter table public.game_players add column if not exists player_id uuid references public.players(id) on delete set null;
create index if not exists game_players_player_idx on public.game_players(player_id);

alter table public.players enable row level security;
create policy "players roster read" on public.players for select to authenticated using (owner_id = auth.uid() or public.is_admin());
create policy "players roster insert" on public.players for insert to authenticated with check (owner_id = auth.uid());
create policy "players roster update" on public.players for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "players roster delete" on public.players for delete to authenticated using (owner_id = auth.uid());

-- The roster entry for the signed-in user ("Me").
create or replace function public.ensure_self_player() returns uuid language plpgsql security definer set search_path = public as $$
declare pid uuid; nm text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into pid from players where owner_id = auth.uid() and user_id = auth.uid();
  if pid is not null then return pid; end if;
  select coalesce(display_name, 'Saya') into nm from profiles where id = auth.uid();
  insert into players (owner_id, name, user_id) values (auth.uid(), nm, auth.uid())
    on conflict (owner_id, lower(btrim(name))) do update set user_id = excluded.user_id
    returning id into pid;
  return pid;
end $$;

-- Find registered users by display name. Returns ONLY id + display name (never email).
create or replace function public.search_profiles(q text) returns table (id uuid, display_name text) language sql stable security definer set search_path = public as $$
  select p.id, p.display_name from profiles p
  where auth.uid() is not null and char_length(btrim(q)) >= 2 and p.id <> auth.uid() and p.display_name ilike '%' || btrim(q) || '%'
  order by p.display_name limit 10 $$;

-- ============ 3. Create a game (exactly four players, unique seats, unique players) ============
-- p_players = [{"seat":0,"player_id":"<roster uuid>"} | {"seat":1,"name":"Guest name"} | {"seat":2,"user_id":"<profile uuid>"} ...]
create or replace function public.create_game(
  p_name text, p_played_at timestamptz, p_players jsonb, p_starting_points int default 0,
  p_round_wind text default 'east', p_min_fan int default 3, p_last_round_wind text default 'north'
) returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid := gen_random_uuid(); code text; x jsonb; pid uuid; pname text; puser uuid; seats int[] := '{}'; pids uuid[] := '{}'; tries int := 0; i int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if jsonb_typeof(p_players) <> 'array' or jsonb_array_length(p_players) <> 4 then raise exception 'A game needs exactly four players'; end if;
  if p_round_wind not in ('east','south','west','north') or p_last_round_wind not in ('east','south','west','north') then raise exception 'Invalid wind'; end if;

  loop   -- 4 chars from an unambiguous alphabet (no I, O, 0, 1): about 1 million codes, retried on collision
    code := '';
    for i in 1..4 loop code := code || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1); end loop;
    exit when not exists (select 1 from games where room_code = code);
    tries := tries + 1; if tries > 50 then raise exception 'Could not allocate a room code'; end if;
  end loop;

  insert into games (id, room_code, owner_id, name, played_at, starting_points, current_round_wind, min_fan, last_round_wind)
  values (gid, code, auth.uid(), nullif(btrim(p_name), ''), coalesce(p_played_at, now()), p_starting_points, p_round_wind, p_min_fan, p_last_round_wind);

  for x in select * from jsonb_array_elements(p_players) loop
    if (x->>'seat') is null or (x->>'seat')::int not between 0 and 3 then raise exception 'Invalid seat'; end if;
    if (x->>'seat')::int = any (seats) then raise exception 'Two players cannot share a seat'; end if;
    seats := seats || (x->>'seat')::int;

    pid := null; pname := null; puser := null;
    if x ? 'player_id' and (x->>'player_id') is not null then
      select id, name, user_id into pid, pname, puser from players where id = (x->>'player_id')::uuid and owner_id = auth.uid();
      if pid is null then raise exception 'Player not found in your roster'; end if;
    elsif x ? 'user_id' and (x->>'user_id') is not null then
      select p.display_name into pname from profiles p where p.id = (x->>'user_id')::uuid;
      if pname is null then raise exception 'Registered player not found'; end if;
      puser := (x->>'user_id')::uuid;
      insert into players (owner_id, name, user_id) values (auth.uid(), pname, puser)
        on conflict (owner_id, user_id) where user_id is not null do update set name = excluded.name returning id into pid;
    else
      pname := btrim(coalesce(x->>'name', ''));
      if char_length(pname) = 0 then raise exception 'Every seat needs a player'; end if;
      insert into players (owner_id, name) values (auth.uid(), pname)
        on conflict (owner_id, lower(btrim(name))) do update set name = players.name returning id, user_id into pid, puser;
    end if;

    if pid = any (pids) then raise exception 'The same player cannot take two seats'; end if;
    pids := pids || pid;
    insert into game_players (game_id, user_id, player_id, player_name, seat_position, current_score)
    values (gid, puser, pid, pname, (x->>'seat')::int, p_starting_points);
  end loop;
  return gid;
end $$;
grant execute on function public.create_game(text, timestamptz, jsonb, int, text, int, text) to authenticated;
grant execute on function public.ensure_self_player() to authenticated;
grant execute on function public.search_profiles(text) to authenticated;

-- ============ 4. Game lifecycle ============
create or replace function public.set_game_paused(p_game uuid, p_paused boolean) returns void language plpgsql security definer set search_path = public as $$
declare g public.games;
begin
  select * into g from games where id = p_game for update;
  if g.id is null or g.owner_id <> auth.uid() then raise exception 'Not allowed'; end if;
  if g.status = 'finished' then raise exception 'Game is already finished'; end if;
  update games set status = case when p_paused then 'paused' else 'in_progress' end where id = p_game;
end $$;

create or replace function public.finish_game(p_game uuid) returns void language plpgsql security definer set search_path = public as $$
declare g public.games;
begin
  select * into g from games where id = p_game for update;     -- row lock: two simultaneous requests cannot both finish it
  if g.id is null or g.owner_id <> auth.uid() then raise exception 'Not allowed'; end if;
  if g.status = 'finished' then raise exception 'Game is already finished'; end if;
  update games set status = 'finished', finished_at = now() where id = p_game;
  update game_players gp set final_rank = r.rk
    from (select id, rank() over (order by current_score desc) rk from game_players where game_id = p_game) r where gp.id = r.id;
end $$;

-- Undo the most recent hand (mistakes happen at the table). Restores scores AND dealer/round from the stored snapshot.
create or replace function public.undo_last_hand(p_game uuid) returns int language plpgsql security definer set search_path = public as $$
declare g public.games; h public.game_hands;
begin
  select * into g from games where id = p_game for update;
  if g.id is null or g.owner_id <> auth.uid() then raise exception 'Not allowed'; end if;
  if g.status = 'finished' then raise exception 'A finished game cannot be changed'; end if;
  select * into h from game_hands where game_id = p_game order by hand_number desc limit 1;
  if h.id is null then raise exception 'No hand to undo'; end if;
  update game_players gp set current_score = gp.current_score - t.sum_change
    from (select player_id, sum(points_change) sum_change from score_transactions where hand_id = h.id group by player_id) t where gp.id = t.player_id;
  delete from game_hands where id = h.id;                      -- cascades to fan details, transactions, events
  update games set current_round_wind = h.state_before->>'round_wind', current_dealer_seat = (h.state_before->>'dealer_seat')::int,
    dealer_rotations = (h.state_before->>'dealer_rotations')::int where id = p_game;
  return h.hand_number;
end $$;
grant execute on function public.set_game_paused(uuid, boolean), public.finish_game(uuid), public.undo_last_hand(uuid) to authenticated;

-- ============ 5. Atomic hand recording ============
-- Called ONLY by the Next.js server (service role) AFTER it recalculated the hand with the shared scoring engine.
-- Everything below runs in one transaction: either the hand, its faan, every score change and the new dealer/round
-- are all saved, or nothing is.
create or replace function public.record_hand_internal(
  p_owner uuid, p_game uuid, p_request uuid, p_expected_hand int,
  p_winner uuid, p_discarder uuid, p_method text, p_total_fan int, p_points int,
  p_hand_tiles jsonb, p_hand_detail jsonb, p_fans jsonb, p_changes jsonb, p_next jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.games; hid uuid; n int; dealer uuid; changed int; total int;
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
  if total <> 0 then raise exception 'Score changes must balance to zero'; end if;

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

-- ============ 6. Tighten write access ============
-- Scores, hands, faan, transactions, dealer/round and players are now changed ONLY through the functions above.
-- Without this, any signed-in owner could write arbitrary scores straight from the browser.
drop policy if exists "hands write" on public.game_hands;
drop policy if exists "fan write" on public.hand_fan_details;
drop policy if exists "tx write" on public.score_transactions;
drop policy if exists "players write" on public.game_players;
drop policy if exists "games insert" on public.games;
drop policy if exists "games update owner" on public.games;
revoke insert, update, delete on public.game_hands, public.hand_fan_details, public.score_transactions, public.game_players from authenticated, anon;
revoke insert, update on public.games from authenticated, anon;
-- Owners may still rename a game, change its date, and delete it (cascades to everything beneath it).
grant update (name, played_at) on public.games to authenticated;
create policy "games update owner meta" on public.games for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ============ 7. Realtime ============
-- games, game_players, game_hands and score_transactions are already in the supabase_realtime publication (schema.sql).
