-- Rulesets: Hong Kong Classic / New 6 / New 18. Run after migration_006.
-- Existing games keep playing exactly as before: they become 'new18' and keep their own max_fan (null = no cap).
alter table public.games add column if not exists ruleset text not null default 'new18';
do $$ begin
  alter table public.games add constraint games_ruleset_check check (ruleset in ('classic', 'new6', 'new18'));
exception when duplicate_object then null; end $$;

-- setup_game gets one more argument (p_ruleset). The old signature is dropped so there is a single version.
drop function if exists public.setup_game(uuid, jsonb, text, int, int, text, text);
create or replace function public.setup_game(
  p_game uuid, p_players jsonb, p_preset text, p_max_fan int default null, p_starting_points int default 1000,
  p_round_wind text default 'east', p_last_round_wind text default 'north', p_ruleset text default 'new18'
) returns void language plpgsql security definer set search_path = public as $$
declare g public.games; x jsonb; pid uuid; pname text; puser uuid; seats int[] := '{}'; pids uuid[] := '{}'; minf int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into g from public.games where id = p_game for update;
  if g.id is null or not public.can_play_game(p_game) then raise exception 'Not allowed'; end if;
  if g.status = 'finished' then raise exception 'Game is already finished'; end if;
  if g.setup_complete then raise exception 'This table has already been set up'; end if;

  if p_ruleset is null or p_ruleset not in ('classic', 'new6', 'new18') then raise exception 'Choose Classic, New 6 or New 18'; end if;
  minf := case p_preset when 'chicken' then 0 when 'beginner' then 3 when 'advanced' then 5 else null end;
  if minf is null then raise exception 'Choose Chicken Hand, Beginner or Advanced'; end if;
  if p_preset = 'chicken' then p_max_fan := null; end if;
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

  update public.games set rule_preset = p_preset, ruleset = p_ruleset, min_fan = minf, max_fan = p_max_fan, starting_points = p_starting_points,
    current_round_wind = p_round_wind, last_round_wind = p_last_round_wind, setup_complete = true, played_at = now()
  where id = p_game;
  update public.cafe_tables set status = 'PLAYING', updated_at = now() where current_game_id = p_game;
  insert into public.game_events (game_id, table_id, event_type) select p_game, id, 'GAME_STARTED' from public.cafe_tables where current_game_id = p_game;
end $$;

revoke all on function public.setup_game(uuid, jsonb, text, int, int, text, text, text) from public, anon;
grant execute on function public.setup_game(uuid, jsonb, text, int, int, text, text, text) to authenticated;
notify pgrst, 'reload schema';
