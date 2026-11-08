-- Smoke test for migration 003. Run in the Supabase SQL editor against a DEV project after the migrations.
-- It creates temporary data inside one transaction and ROLLS BACK, so nothing is left behind.
-- Replace the two UUIDs with real auth.users ids from your dev project (owner A and stranger B).
begin;
do $$
declare
  a uuid := '00000000-0000-0000-0000-00000000000a';  -- REPLACE: an existing auth.users id (owner)
  b uuid := '00000000-0000-0000-0000-00000000000b';  -- REPLACE: another existing auth.users id (stranger)
  gid uuid; ps jsonb; h jsonb; r jsonb; pid uuid; req uuid := gen_random_uuid(); cnt int; thrown boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  -- 1. fewer than four players is rejected
  thrown := false;
  begin perform public.create_game('t', now(), '[{"seat":0,"name":"A"},{"seat":1,"name":"B"},{"seat":2,"name":"C"}]'::jsonb);
  exception when others then thrown := true; end;
  assert thrown, 'a 3-player game must be rejected';

  -- 2. duplicate seats are rejected
  thrown := false;
  begin perform public.create_game('t', now(), '[{"seat":0,"name":"A"},{"seat":0,"name":"B"},{"seat":2,"name":"C"},{"seat":3,"name":"D"}]'::jsonb);
  exception when others then thrown := true; end;
  assert thrown, 'duplicate seats must be rejected';

  -- 3. the same player cannot take two seats
  thrown := false;
  begin perform public.create_game('t', now(), '[{"seat":0,"name":"A"},{"seat":1,"name":"a"},{"seat":2,"name":"C"},{"seat":3,"name":"D"}]'::jsonb);
  exception when others then thrown := true; end;
  assert thrown, 'the same player on two seats must be rejected';

  -- 4. a valid game with guests
  gid := public.create_game('smoke', now(), '[{"seat":0,"name":"Ana"},{"seat":1,"name":"Budi"},{"seat":2,"name":"Cici"},{"seat":3,"name":"Dedi"}]'::jsonb);
  select count(*) into cnt from public.game_players where game_id = gid; assert cnt = 4, 'game must have 4 players';

  -- 5. the browser role can NOT write scores directly
  thrown := false;
  begin update public.game_players set current_score = 999 where game_id = gid; exception when others then thrown := true; end;
  assert thrown, 'direct score updates must be denied';
  thrown := false;
  begin perform public.record_hand_internal(a, gid, req, 1, null, null, 'draw', 0, 0, '[]', '{}', '[]', '[]', '{"round_wind":"east","dealer_seat":0,"dealer_rotations":0}');
  exception when others then thrown := true; end;
  assert thrown, 'record_hand_internal must not be callable by authenticated users';

  -- 6. as service role: a draw records, is idempotent, and awards nothing
  perform set_config('role', 'service_role', true);
  r := public.record_hand_internal(a, gid, req, 1, null, null, 'draw', 0, 0, '[]', '{}', '[]', '[]', '{"round_wind":"east","dealer_seat":0,"dealer_rotations":0}');
  assert (r->>'duplicate')::boolean = false, 'first submit is not a duplicate';
  r := public.record_hand_internal(a, gid, req, 2, null, null, 'draw', 0, 0, '[]', '{}', '[]', '[]', '{"round_wind":"east","dealer_seat":0,"dealer_rotations":0}');
  assert (r->>'duplicate')::boolean = true, 'same request id must be idempotent';
  select count(*) into cnt from public.game_hands where game_id = gid; assert cnt = 1, 'exactly one hand';

  -- 7. unbalanced score changes are rejected and leave nothing behind
  select id into pid from public.game_players where game_id = gid and seat_position = 1;
  thrown := false;
  begin perform public.record_hand_internal(a, gid, gen_random_uuid(), 2, pid, null, 'self_draw', 5, 5, '[]', '{}', '[{"id":"self-draw","name":"Self Draw","fan":5,"category":"additional"}]',
        json_build_array(json_build_object('player_id', pid, 'change', 5))::jsonb, '{"round_wind":"east","dealer_seat":1,"dealer_rotations":1}');
  exception when others then thrown := true; end;
  assert thrown, 'unbalanced changes must be rejected';
  select count(*) into cnt from public.game_hands where game_id = gid; assert cnt = 1, 'failed hand must leave no partial rows';

  -- 8. below-minimum wins are rejected
  thrown := false;
  begin perform public.record_hand_internal(a, gid, gen_random_uuid(), 2, pid, null, 'self_draw', 2, 2, '[]', '{}', '[]', '[]', '{"round_wind":"east","dealer_seat":1,"dealer_rotations":1}');
  exception when others then thrown := true; end;
  assert thrown, 'a 2-faan win must be rejected';

  -- 9. another user cannot see or finish the game
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.games where id = gid; assert cnt = 0, 'a stranger must not see the game (RLS)';
  thrown := false; begin perform public.finish_game(gid); exception when others then thrown := true; end;
  assert thrown, 'a stranger must not finish the game';

  -- 10. the owner finishes once; finishing twice fails
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform public.finish_game(gid);
  thrown := false; begin perform public.finish_game(gid); exception when others then thrown := true; end;
  assert thrown, 'a game cannot be completed twice';
  raise notice 'ALL SMOKE TESTS PASSED';
end $$;
rollback;
