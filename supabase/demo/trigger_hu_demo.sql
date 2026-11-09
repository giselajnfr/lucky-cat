-- LIVE DEMO: makes the /tv screen show the "HU!" highlight right now, using the latest winning hand of a table.
-- Open /tv on a screen, then run this. Change the table number and run it again for another highlight.
do $$
declare tn int := 2;   -- <- table number to celebrate
        h record; ev uuid := gen_random_uuid(); fans jsonb;
begin
  select gh.*, ct.id as tid, ct.table_number as tnum, gp.id as wid, gp.player_name as wname into h
  from public.game_hands gh join public.cafe_tables ct on ct.current_game_id = gh.game_id
  join public.game_players gp on gp.id = gh.winner_player_id
  where ct.table_number = tn and gh.winner_player_id is not null order by gh.hand_number desc limit 1;
  if h.id is null then raise exception 'Table % has no winning hand yet', tn; end if;
  select coalesce(jsonb_agg(jsonb_build_object('name', fan_name, 'fan', fan_value)), '[]') into fans from public.hand_fan_details where hand_id = h.id;
  insert into public.game_events (id, game_id, table_id, event_type, payload) values (ev, h.game_id, h.tid, 'WINNING_HAND', jsonb_build_object(
    'eventId', ev, 'gameId', h.game_id, 'tableNumber', h.tnum, 'winner', jsonb_build_object('id', h.wid, 'name', h.wname),
    'roundWind', h.round_wind, 'winningMethod', h.winning_method, 'detectedFan', fans, 'totalFan', h.total_fan, 'points', h.final_points,
    'handTiles', coalesce(h.hand_tiles, '[]'::jsonb), 'photoUrl', null, 'createdAt', now()));
end $$;
