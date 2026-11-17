-- Lucky Cat Mahjong: clean up "stray" games = unfinished games that no cafe table points to any more
-- (left behind when a table was released before its game was finished). They inflate the old "Active players" count.
-- Safe to re-run. Run step 1 first and look at the rows; run step 2 only if they are what you expect.

-- ============ Step 1: preview (changes nothing) ============
select g.id, g.room_code, g.status, g.setup_complete, g.session_started_at,
       (select count(*) from public.game_hands h where h.game_id = g.id) as hands,
       case when exists (select 1 from public.game_hands h where h.game_id = g.id) then 'will be FINISHED' else 'will be DELETED' end as action
from public.games g
where g.status <> 'finished' and not exists (select 1 from public.cafe_tables ct where ct.current_game_id = g.id)
order by g.session_started_at;

-- ============ Step 2: clean up ============
-- With hands  -> finished, final ranks saved. finished_at = time of the LAST hand (not "now"), so these games are not
--                counted as "finished today" and their length is realistic.
-- Without any hand -> deleted (nothing was played, so there is nothing to keep).
begin;
create temp table stray_games on commit drop as
  select g.id, (select max(h.created_at) from public.game_hands h where h.game_id = g.id) as last_hand
  from public.games g
  where g.status <> 'finished' and not exists (select 1 from public.cafe_tables ct where ct.current_game_id = g.id);

delete from public.games where id in (select id from stray_games where last_hand is null);

update public.games g set status = 'finished', finished_at = coalesce(g.finished_at, s.last_hand)
  from stray_games s where g.id = s.id and s.last_hand is not null;

update public.game_players gp set final_rank = r.rk
  from (select p.id, rank() over (partition by p.game_id order by p.current_score desc) rk
        from public.game_players p where p.game_id in (select id from stray_games where last_hand is not null)) r
  where gp.id = r.id;
commit;
