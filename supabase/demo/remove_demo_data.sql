-- Removes ONLY the demo games (room codes DM01–DM07) and the empty demo table 5. Your real games are untouched.
delete from public.games where room_code in ('DM01','DM02','DM03','DM04','DM05','DM06','DM07');
update public.cafe_tables set current_game_id = null, status = 'WAITING', updated_at = now() where table_number between 1 and 6;
delete from public.cafe_tables where table_number between 1 and 6;   -- remove this line if you want to keep tables 1–6 as empty tables
delete from public.players where name in ('Mega','Rama','Medi','Mida','Andi','Budi','Kevin','Sarah','Dewi','Rizky','Putri','Bayu','Citra','Dimas','Eka','Farah','Galih','Hana','Indra','Joko','Kirana','Lukas','Maya','Nanda')
  and not exists (select 1 from public.game_players gp where gp.player_id = players.id);
