-- Lucky Cat Mahjong — DEMO DATA for client presentations.
-- Fills the admin dashboard, Live Tables and the /tv screen with realistic games.
-- Safe to re-run: it first removes its own earlier demo games (room codes DM01–DM07), then recreates them.
-- Requires: schema.sql, migration_002, migration_003 already applied, and your account set to ADMIN.
-- NOTE: it takes over cafe tables 1–6 (resets them first). Remove everything later with remove_demo_data.sql.

-- ---------- 0. Clean up any earlier run ----------
delete from public.games where room_code in ('DM01','DM02','DM03','DM04','DM05','DM06','DM07');
update public.cafe_tables set current_game_id = null, status = 'WAITING', updated_at = now() where table_number between 1 and 6;

drop table if exists _g; drop table if exists _h; drop table if exists _f;
create temp table _g (code text, gname text, status text, rnd text, dealer int, rot int, tno int, p text[], hands int, age_min int, fin_min int);
create temp table _h (code text, n int, rnd text, dealer int, winner int, method text, discarder int, fans text);
create temp table _f (code text, id text, name text, fan int, cat text);

-- Fan building blocks (names follow the HK18 table in the app; faan = points)
insert into _f values
  ('AP','all-pongs','All Pongs',3,'pattern'), ('HF','half-flush','Half Flush',3,'pattern'),
  ('FF','full-flush','Full Flush',7,'pattern'), ('LD','little-dragon','Little Dragon',5,'pattern'),
  ('SD','self-draw','Self Draw',1,'additional'), ('SW','seat-wind','Seat Wind',1,'additional');

-- Games: code, name, status, round wind, dealer seat, dealer changes this round, table no., players (E,S,W,N seats), hands, age offset, finished-minutes-ago
insert into _g values
  ('DM01','Meja 1 · Malam Minggu','in_progress','east',  3,3,1,'{Mega,Rama,Medi,Mida}',   5,   0,null),
  ('DM02','Meja 2 · Santai',      'in_progress','south', 1,1,2,'{Andi,Budi,Kevin,Sarah}', 7,   0,null),
  ('DM03','Meja 3',               'in_progress','east',  2,2,3,'{Dewi,Rizky,Putri,Bayu}', 3,   0,null),
  ('DM04','Meja 4',               'paused',     'east',  3,3,4,'{Citra,Dimas,Eka,Farah}', 4,   0,null),
  ('DM05','Meja 6',               'finished',   'west',  1,1,6,'{Galih,Hana,Indra,Joko}', 6,   0,5),
  ('DM06','Game sore',            'finished',   'south', 0,0,null,'{Kirana,Lukas,Maya,Nanda}',4,120,100),
  ('DM07','Game kemarin',         'finished',   'south', 3,3,null,'{Mega,Andi,Dewi,Citra}',4,1440,1440);

-- Hands: game, no., round, dealer seat, winner seat, method, discarder seat, fan codes
insert into _h values
  ('DM01',1,'east',0,1,'discard',0,'AP'),('DM01',2,'east',1,1,'self_draw',null,'HF+SD'),('DM01',3,'east',1,3,'discard',2,'FF'),
  ('DM01',4,'east',2,2,'self_draw',null,'AP+SD'),('DM01',5,'east',2,0,'discard',1,'HF'),
  ('DM02',1,'east',0,0,'self_draw',null,'LD+SD'),('DM02',2,'east',0,2,'discard',0,'AP'),('DM02',3,'east',1,3,'discard',1,'HF'),
  ('DM02',4,'east',2,1,'self_draw',null,'AP+SD'),('DM02',5,'east',3,3,'discard',2,'FF'),('DM02',6,'east',3,0,'discard',3,'AP'),
  ('DM02',7,'south',0,1,'self_draw',null,'HF+SD'),
  ('DM03',1,'east',0,2,'self_draw',null,'AP+SD'),('DM03',2,'east',1,1,'discard',3,'HF'),('DM03',3,'east',1,0,'discard',1,'LD'),
  ('DM04',1,'east',0,0,'self_draw',null,'FF+SD'),('DM04',2,'east',0,2,'discard',3,'AP'),('DM04',3,'east',1,3,'self_draw',null,'HF+SD'),('DM04',4,'east',2,1,'discard',0,'AP'),
  ('DM05',1,'east',0,1,'discard',2,'AP'),('DM05',2,'east',1,1,'self_draw',null,'AP+SD'),('DM05',3,'east',1,2,'discard',1,'HF'),
  ('DM05',4,'south',2,0,'discard',3,'FF'),('DM05',5,'south',3,3,'self_draw',null,'LD+SD'),('DM05',6,'west',0,2,'discard',1,'AP'),
  ('DM06',1,'east',0,2,'discard',1,'HF'),('DM06',2,'east',1,3,'self_draw',null,'AP+SD'),('DM06',3,'east',2,2,'discard',0,'AP'),('DM06',4,'east',3,0,'discard',3,'FF'),
  ('DM07',1,'east',0,1,'discard',3,'AP'),('DM07',2,'east',1,0,'self_draw',null,'HF+SD'),('DM07',3,'east',1,2,'discard',0,'AP'),('DM07',4,'south',2,3,'discard',1,'FF');

-- ---------- 1. Build everything ----------
do $$
declare
  owner uuid; g record; h record; gid uuid; hid uuid; pid uuid; sc int; chg int; tf int; base timestamptz;
  seatp uuid[]; tiles text[]; s int; st text;
  mult int := 1;   -- DEMO SCALE. HK18 pays 1 point per faan, so scores look small. Set to 100 for bigger, more dramatic numbers on screen.
begin
  select id into owner from public.profiles where role = 'ADMIN' order by created_at limit 1;
  if owner is null then raise exception 'No admin account found. Make your account an admin first (see README), then run this again.'; end if;

  for g in select * from _g order by code loop
    gid := gen_random_uuid(); seatp := '{}';
    base := now() - make_interval(mins => g.hands * 9 + 10 + g.age_min);
    insert into public.games (id, room_code, owner_id, name, status, starting_points, current_round_wind, current_dealer_seat, dealer_rotations, min_fan, last_round_wind, created_at, played_at)
    values (gid, g.code, owner, g.gname, 'in_progress', 0, 'east', 0, 0, 3, 'north', base, base);

    for s in 0..3 loop
      insert into public.players (owner_id, name) values (owner, g.p[s + 1])
        on conflict (owner_id, lower(btrim(name))) do update set name = players.name returning id into pid;
      seatp := seatp || gen_random_uuid();
      insert into public.game_players (id, game_id, player_name, seat_position, current_score, player_id)
      values (seatp[s + 1], gid, g.p[s + 1], s, 0, pid);
    end loop;

    for h in select * from _h where code = g.code order by n loop
      select coalesce(sum(f.fan), 0) into tf from _f f where f.code = any (string_to_array(h.fans, '+'));
      tiles := case split_part(h.fans, '+', 1)
        when 'AP' then array['2m','2m','2m','5p','5p','5p','8s','8s','8s','E','E','E','9m','9m']
        when 'HF' then array['1m','2m','3m','4m','5m','6m','7m','8m','9m','RD','RD','RD','GD','GD']
        when 'FF' then array['1m','2m','3m','4m','5m','6m','7m','8m','9m','2m','3m','4m','5m','5m']
        else array['RD','RD','RD','GD','GD','GD','WD','WD','1m','2m','3m','4m','5m','6m'] end;   -- Little Dragon
      insert into public.game_hands (game_id, hand_number, round_wind, dealer_player_id, winner_player_id, winning_method, discard_player_id, total_fan, final_points, hand_tiles, created_at)
      values (gid, h.n, h.rnd, seatp[h.dealer + 1], seatp[h.winner + 1], h.method, seatp[h.discarder + 1], tf, tf * mult, to_jsonb(tiles), base + h.n * interval '9 minutes')
      returning id into hid;
      insert into public.hand_fan_details (hand_id, fan_name, fan_value, fan_id, category)
        select hid, f.name, f.fan, f.id, f.cat from _f f where f.code = any (string_to_array(h.fans, '+'));

      -- HK18 payment: points = faan; self draw -> every opponent pays; discard -> the discarder pays everything
      for s in 0..3 loop
        chg := case when h.method = 'self_draw' then (case when s = h.winner then 3 * tf else -tf end)
                    else (case when s = h.winner then tf when s = h.discarder then -tf else 0 end) end;
        chg := chg * mult;
        continue when chg = 0;
        update public.game_players set current_score = current_score + chg where id = seatp[s + 1] returning current_score into sc;
        insert into public.score_transactions (game_id, hand_id, player_id, points_change, score_after, created_at)
        values (gid, hid, seatp[s + 1], chg, sc, base + h.n * interval '9 minutes');
      end loop;
    end loop;

    update public.games set status = g.status, current_round_wind = g.rnd, current_dealer_seat = g.dealer, dealer_rotations = g.rot,
      finished_at = case when g.status = 'finished' then now() - make_interval(mins => g.fin_min) end where id = gid;
    if g.status = 'finished' then
      update public.game_players gp set final_rank = r.rk
      from (select id, rank() over (order by current_score desc) rk from public.game_players where game_id = gid) r where gp.id = r.id;
    end if;

    if g.tno is not null then   -- seat the game at its cafe table (after all writes, so no stray live events fire)
      st := case g.status when 'paused' then 'PAUSED' when 'finished' then 'FINISHED' else 'PLAYING' end;
      insert into public.cafe_tables (table_number, status, current_game_id) values (g.tno, st, gid)
        on conflict (table_number) do update set status = st, current_game_id = gid, updated_at = now();
    end if;
  end loop;

  insert into public.cafe_tables (table_number, status) values (5, 'WAITING') on conflict (table_number) do nothing;   -- an empty table
end $$;

-- Quick summary
select ct.table_number as "table", ct.status, g.room_code, g.current_round_wind as round,
       (select string_agg(p.player_name || ' ' || p.current_score, ' · ' order by p.current_score desc) from public.game_players p where p.game_id = g.id) as scores
from public.cafe_tables ct left join public.games g on g.id = ct.current_game_id order by ct.table_number;
