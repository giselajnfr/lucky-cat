-- Lucky Cat Mahjong — migration 005: room-first flow.
-- Admin opens a ROOM (room code + play-time guide). The PLAYERS then enter names and choose the rules
-- (Chicken Hand / Beginner / Advanced, starting points, faan cap) and start the session.
-- Run AFTER migrations 002, 003 and 004. Additive: existing games keep working (setup_complete defaults to true).

-- ============ 1. New columns ============
alter table public.games
  add column if not exists session_minutes int check (session_minutes is null or session_minutes between 1 and 1440),  -- play time bought at the till; null = no clock
  add column if not exists session_started_at timestamptz not null default now(),                                      -- when the admin opened the room
  add column if not exists setup_complete boolean not null default true,                                               -- false = room opened, players have not started yet
  add column if not exists max_fan int,                                                                                -- faan cap; null = no cap
  add column if not exists rule_preset text not null default 'beginner';

-- Rule presets. 'custom' only exists for games created before this migration with another minimum.
alter table public.games drop constraint if exists games_rule_preset_check;
alter table public.games add constraint games_rule_preset_check check (rule_preset in ('chicken','beginner','advanced','custom'));
update public.games set rule_preset = case min_fan when 0 then 'chicken' when 3 then 'beginner' when 5 then 'advanced' else 'custom' end;

-- Chicken Hand = no minimum, so min_fan may now be 0.
alter table public.games drop constraint if exists games_min_fan_check;
alter table public.games add constraint games_min_fan_check check (min_fan between 0 and 99);
alter table public.games drop constraint if exists games_max_fan_check;
alter table public.games add constraint games_max_fan_check check (max_fan is null or (max_fan between 1 and 99 and max_fan >= min_fan));

-- ============ 2. Admin: open a room (code + time guide only) ============
-- The admin does NOT choose players or rules. Returns the room code to hand to the table.
create or replace function public.admin_open_room(p_table uuid, p_minutes int default null)
returns text language plpgsql security definer set search_path = public as $$
declare gid uuid := gen_random_uuid(); code text; tries int := 0; i int; ct public.cafe_tables;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_minutes is not null and p_minutes not between 1 and 1440 then raise exception 'Play time must be between 1 minute and 24 hours'; end if;
  select * into ct from public.cafe_tables where id = p_table for update;
  if ct.id is null then raise exception 'Table not found'; end if;
  if ct.current_game_id is not null then raise exception 'This table already has a room. Release it first'; end if;

  loop   -- same 4-character alphabet as create_game (no I, O, 0, 1)
    code := '';
    for i in 1..4 loop code := code || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1); end loop;
    exit when not exists (select 1 from public.games where room_code = code);
    tries := tries + 1; if tries > 50 then raise exception 'Could not allocate a room code'; end if;
  end loop;

  insert into public.games (id, room_code, owner_id, played_at, starting_points, session_minutes, session_started_at, setup_complete)
  values (gid, code, auth.uid(), now(), 0, p_minutes, now(), false);
  update public.cafe_tables set current_game_id = gid, status = 'WAITING', updated_at = now() where id = p_table;
  perform public.admin_log('ADMIN_OPENED_ROOM', gid, ct.table_number, null, jsonb_build_object('room', code, 'minutes', p_minutes));
  return code;
end $$;

-- Change the TOTAL play time (guide only: nothing closes when it runs out). null = remove the clock.
create or replace function public.admin_set_session_minutes(p_game uuid, p_minutes int)
returns void language plpgsql security definer set search_path = public as $$
declare g public.games; tn int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_minutes is not null and p_minutes not between 1 and 1440 then raise exception 'Play time must be between 1 minute and 24 hours'; end if;
  select * into g from public.games where id = p_game for update;
  if g.id is null then raise exception 'Game not found'; end if;
  update public.games set session_minutes = p_minutes where id = p_game;
  select table_number into tn from public.cafe_tables where current_game_id = p_game;
  perform public.admin_log('ADMIN_SET_PLAY_TIME', p_game, tn, null, jsonb_build_object('previous', g.session_minutes, 'new', p_minutes));
end $$;

-- ============ 3. Players: enter names, choose rules, start the session ============
-- p_players = [{"seat":0,"name":"Weldon"} | {"seat":1,"player_id":"<roster uuid>"}, ...] (seat 0..3 = East, South, West, North)
-- p_preset decides the rules: chicken = no faan at all, every valid win is 1 point (minimum 0, no cap); beginner = minimum 3 faan; advanced = minimum 5 faan.
-- The server ignores any other number.
-- Allowed for the admin who opened the room, any admin, and anyone who joined with the room code. Only the first call wins.
create or replace function public.setup_game(
  p_game uuid, p_players jsonb, p_preset text, p_max_fan int default null, p_starting_points int default 0,
  p_round_wind text default 'east', p_last_round_wind text default 'north'
) returns void language plpgsql security definer set search_path = public as $$
declare g public.games; x jsonb; pid uuid; pname text; puser uuid; seats int[] := '{}'; pids uuid[] := '{}'; minf int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into g from public.games where id = p_game for update;       -- row lock: two players submitting at once cannot both set up
  if g.id is null or not public.can_play_game(p_game) then raise exception 'Not allowed'; end if;
  if g.status = 'finished' then raise exception 'Game is already finished'; end if;
  if g.setup_complete then raise exception 'This table has already been set up'; end if;

  minf := case p_preset when 'chicken' then 0 when 'beginner' then 3 when 'advanced' then 5 else null end;
  if minf is null then raise exception 'Choose Chicken Hand, Beginner or Advanced'; end if;
  if p_preset = 'chicken' then p_max_fan := null; end if;   -- Chicken Hand has no faan, so there is no cap
  if p_max_fan is not null and (p_max_fan > 99 or p_max_fan < greatest(minf, 1)) then raise exception 'The faan cap must be at least the minimum faan'; end if;
  if p_starting_points is null or p_starting_points not between 0 and 10000000 then raise exception 'Starting points must be between 0 and 10,000,000'; end if;
  if p_round_wind not in ('east','south','west','north') or p_last_round_wind not in ('east','south','west','north') then raise exception 'Invalid wind'; end if;
  if jsonb_typeof(p_players) <> 'array' or jsonb_array_length(p_players) <> 4 then raise exception 'A game needs exactly four players'; end if;

  for x in select * from jsonb_array_elements(p_players) loop
    if (x->>'seat') is null or (x->>'seat')::int not between 0 and 3 then raise exception 'Invalid seat'; end if;
    if (x->>'seat')::int = any (seats) then raise exception 'Two players cannot share a seat'; end if;
    seats := seats || (x->>'seat')::int;

    pid := null; pname := null; puser := null;
    if x ? 'player_id' and (x->>'player_id') is not null then
      select id, name, user_id into pid, pname, puser from public.players where id = (x->>'player_id')::uuid and owner_id = auth.uid();
      if pid is null then raise exception 'Player not found in your roster'; end if;
    else
      pname := btrim(coalesce(x->>'name', ''));
      if char_length(pname) = 0 then raise exception 'Every seat needs a player'; end if;
      if char_length(pname) > 40 then raise exception 'A name can have at most 40 characters'; end if;
      insert into public.players (owner_id, name) values (auth.uid(), pname)
        on conflict (owner_id, lower(btrim(name))) do update set name = public.players.name returning id, user_id into pid, puser;
    end if;

    if pid = any (pids) then raise exception 'The same player cannot take two seats'; end if;
    pids := pids || pid;
    insert into public.game_players (game_id, user_id, player_id, player_name, seat_position, current_score)
    values (p_game, puser, pid, pname, (x->>'seat')::int, p_starting_points);
  end loop;

  update public.games set rule_preset = p_preset, min_fan = minf, max_fan = p_max_fan, starting_points = p_starting_points,
    current_round_wind = p_round_wind, last_round_wind = p_last_round_wind, setup_complete = true, played_at = now()
  where id = p_game;
  update public.cafe_tables set status = 'PLAYING', updated_at = now() where current_game_id = p_game;
  insert into public.game_events (game_id, table_id, event_type) select p_game, id, 'GAME_STARTED' from public.cafe_tables where current_game_id = p_game;
end $$;

revoke all on function public.admin_open_room(uuid, int) from public, anon;
revoke all on function public.admin_set_session_minutes(uuid, int) from public, anon;
revoke all on function public.setup_game(uuid, jsonb, text, int, int, text, text) from public, anon;
grant execute on function public.admin_open_room(uuid, int) to authenticated;
grant execute on function public.admin_set_session_minutes(uuid, int) to authenticated;
grant execute on function public.setup_game(uuid, jsonb, text, int, int, text, text) to authenticated;

-- ============ 4. TV: expose the starting points so scores can be coloured against them (red below, green otherwise) ============
create or replace view public.tv_live_tables as
select ct.id as table_id, ct.table_number, ct.status,
  g.current_round_wind as round_wind, g.current_dealer_seat as dealer_seat,
  case when g.id is null then null else (select count(*) from public.game_hands h where h.game_id = g.id) + 1 end as hand_number,
  coalesce((select jsonb_agg(jsonb_build_object('name', p.player_name, 'seat', p.seat_position, 'score', p.current_score) order by p.seat_position)
            from public.game_players p where p.game_id = g.id), '[]'::jsonb) as players,
  g.starting_points as starting_points
from public.cafe_tables ct left join public.games g on g.id = ct.current_game_id;

notify pgrst, 'reload schema';
