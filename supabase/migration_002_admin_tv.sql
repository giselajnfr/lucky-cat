-- Lucky Cat Mahjong — migration 002: roles, admin, TV display. Run AFTER schema.sql.
-- First admin (run once in the SQL editor, which bypasses RLS):
--   update public.profiles set role = 'ADMIN' where email = 'you@example.com';

-- ============ 1. Roles ============
create type public.user_role as enum ('USER','ADMIN');
alter table public.profiles add column email text, add column role public.user_role not null default 'USER';
update public.profiles p set email = u.email from auth.users u where u.id = p.id;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url', new.email);
  return new;
end $$;

create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN') $$;

-- SECURITY: users must never be able to change their own role. Column-level grant + own-row policy.
revoke update on public.profiles from authenticated, anon;
grant update (username, display_name, avatar_url) on public.profiles to authenticated;
drop policy "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Emails are now stored, so profiles are no longer world-readable.
drop policy "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());

do $$ declare t text; begin
  foreach t in array array['games','game_players','game_members','game_hands','hand_fan_details','score_transactions'] loop
    execute format('create policy "admin read" on public.%I for select to authenticated using (public.is_admin())', t);
  end loop;
end $$;

alter table public.games drop constraint games_status_check;
alter table public.games add constraint games_status_check check (status in ('in_progress','paused','finished'));

-- ============ 2. Tables, events, audit, TV settings ============
create table public.cafe_tables (
  id uuid primary key default gen_random_uuid(),
  table_number int not null unique,
  status text not null default 'WAITING' check (status in ('WAITING','PLAYING','PAUSED','FINISHED')),
  current_game_id uuid references public.games(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index cafe_tables_game_uq on public.cafe_tables(current_game_id) where current_game_id is not null;

-- Game events = real-time UI feed. Audit log = admin accountability. Deliberately separate.
create table public.game_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete cascade,
  table_id uuid references public.cafe_tables(id) on delete set null,
  hand_id uuid references public.game_hands(id) on delete cascade,
  event_type text not null check (event_type in ('GAME_STARTED','HAND_RECORDED','WINNING_HAND','SCORE_UPDATED','DEALER_CHANGED','ROUND_CHANGED','GAME_PAUSED','GAME_FINISHED')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index game_events_hand_uq on public.game_events(hand_id, event_type) where hand_id is not null; -- idempotent publish
create index game_events_recent_idx on public.game_events(created_at desc);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  action text not null,
  game_id uuid, table_number int, player_id uuid,
  details jsonb not null default '{}'::jsonb,   -- e.g. {previous, new, reason}
  created_at timestamptz not null default now()
);
create index audit_created_idx on public.admin_audit_log(created_at desc);

create table public.tv_settings (
  id int primary key default 1 check (id = 1),
  mode text not null default 'live' check (mode in ('live','spotlight','leaderboard','rotate')),
  spotlight_table_id uuid references public.cafe_tables(id) on delete set null,
  rotation_interval_ms int not null default 15000 check (rotation_interval_ms between 3000 and 120000),
  highlight_duration_ms int not null default 10000 check (highlight_duration_ms between 3000 and 60000),
  sound_enabled boolean not null default false,
  animations_enabled boolean not null default true,
  leaderboard_type text not null default 'highest_score' check (leaderboard_type in ('highest_score','most_wins','highest_fan'))
);
insert into public.tv_settings (id) values (1);

alter table public.cafe_tables enable row level security;
alter table public.game_events enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.tv_settings enable row level security;
create policy "admin all" on public.cafe_tables for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin read events" on public.game_events for select to authenticated using (public.is_admin());
create policy "admin read audit" on public.admin_audit_log for select to authenticated using (public.is_admin());   -- no insert policy: only functions write
create policy "tv settings read" on public.tv_settings for select to anon, authenticated using (true);
create policy "tv settings admin write" on public.tv_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============ 3. Public TV views (sanitized: no emails, user ids, or room codes) ============
-- Views run with owner rights on purpose so anon can read them without any table access.
create view public.tv_live_tables as
select ct.id as table_id, ct.table_number, ct.status,
  g.current_round_wind as round_wind, g.current_dealer_seat as dealer_seat,
  case when g.id is null then null else (select count(*) from public.game_hands h where h.game_id = g.id) + 1 end as hand_number,
  coalesce((select jsonb_agg(jsonb_build_object('name', p.player_name, 'seat', p.seat_position, 'score', p.current_score) order by p.seat_position)
            from public.game_players p where p.game_id = g.id), '[]'::jsonb) as players
from public.cafe_tables ct left join public.games g on g.id = ct.current_game_id;

-- "Today" uses the cafe's timezone. Players are grouped by display name (the only public identity).
create view public.tv_today_leaderboard as
select p.player_name as name, max(p.current_score) as score,
  count(h.id) filter (where (h.created_at at time zone 'Asia/Jakarta')::date = (now() at time zone 'Asia/Jakarta')::date) as wins_today,
  coalesce(max(h.total_fan) filter (where (h.created_at at time zone 'Asia/Jakarta')::date = (now() at time zone 'Asia/Jakarta')::date), 0) as best_fan_today
from public.game_players p join public.games g on g.id = p.game_id
left join public.game_hands h on h.winner_player_id = p.id
where g.status <> 'finished' or (g.created_at at time zone 'Asia/Jakarta')::date = (now() at time zone 'Asia/Jakarta')::date
group by p.player_name;

-- Reconnect recovery: winning events from the last 2 minutes (payload is built server-side, already sanitized).
create view public.tv_recent_wins as
select id as event_id, payload, created_at from public.game_events
where event_type = 'WINNING_HAND' and created_at > now() - interval '2 minutes';

grant select on public.tv_live_tables, public.tv_today_leaderboard, public.tv_recent_wins to anon, authenticated;
grant select on public.tv_settings to anon;

-- ============ 4. Event plumbing ============
-- Broadcast to the public 'tv:live' channel. Only WINNING_HAND carries a payload.
create function public.broadcast_game_event() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(jsonb_build_object('id', new.id, 'event_type', new.event_type, 'table_id', new.table_id,
    'payload', case when new.event_type = 'WINNING_HAND' then new.payload else '{}'::jsonb end, 'created_at', new.created_at),
    new.event_type, 'tv:live', false);
  return new;
end $$;
create trigger game_events_broadcast after insert on public.game_events for each row execute function public.broadcast_game_event();

create function public.broadcast_tv_settings() returns trigger language plpgsql security definer set search_path = public as $$
begin perform realtime.send('{}'::jsonb, 'SETTINGS', 'tv:live', false); return new; end $$;
create trigger tv_settings_broadcast after update on public.tv_settings for each row execute function public.broadcast_tv_settings();

-- Game changes -> keep cafe table status in sync + emit events (only for games seated at a table).
create function public.on_game_change() returns trigger language plpgsql security definer set search_path = public as $$
declare ct uuid;
begin
  select id into ct from public.cafe_tables where current_game_id = new.id;
  if ct is null then return new; end if;
  if new.status is distinct from old.status then
    update public.cafe_tables set updated_at = now(), status = case new.status when 'paused' then 'PAUSED' when 'finished' then 'FINISHED' else 'PLAYING' end where id = ct;
    insert into public.game_events (game_id, table_id, event_type)
      values (new.id, ct, case new.status when 'paused' then 'GAME_PAUSED' when 'finished' then 'GAME_FINISHED' else 'GAME_STARTED' end);
  end if;
  if new.current_dealer_seat is distinct from old.current_dealer_seat then insert into public.game_events (game_id, table_id, event_type) values (new.id, ct, 'DEALER_CHANGED'); end if;
  if new.current_round_wind is distinct from old.current_round_wind then insert into public.game_events (game_id, table_id, event_type) values (new.id, ct, 'ROUND_CHANGED'); end if;
  return new;
end $$;
create trigger games_changed after update on public.games for each row execute function public.on_game_change();

-- Statement-level: one SCORE_UPDATED per game per statement (update all 4 players in ONE statement to avoid bursts).
create function public.on_scores_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.game_events (game_id, table_id, event_type)
  select distinct n.game_id, ct.id, 'SCORE_UPDATED' from new_rows n join public.cafe_tables ct on ct.current_game_id = n.game_id;
  return null;
end $$;
create trigger scores_changed after update on public.game_players referencing new table as new_rows for each statement execute function public.on_scores_change();

-- Call AFTER the hand and its hand_fan_details are saved. Builds the TV payload from stored data.
create function public.publish_winning_hand(p_hand uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare h public.game_hands; ct public.cafe_tables; w public.game_players; ev uuid := gen_random_uuid(); fans jsonb;
begin
  select * into h from public.game_hands where id = p_hand;
  if h.id is null then raise exception 'Hand not found'; end if;
  if not (public.is_game_owner(h.game_id) or public.is_admin()) then raise exception 'Not allowed'; end if;
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

-- ============ 5. Admin actions (all audited) ============
create function public.admin_log(p_action text, p_game uuid, p_table int, p_player uuid, p_details jsonb) returns void language sql security definer set search_path = public as $$
  insert into public.admin_audit_log (admin_id, action, game_id, table_number, player_id, details) values (auth.uid(), p_action, p_game, p_table, p_player, p_details) $$;
revoke all on function public.admin_log from public, anon, authenticated;   -- internal only: prevents forged audit entries

create function public.admin_create_table(p_number int) returns uuid language plpgsql security definer set search_path = public as $$
declare id uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  insert into public.cafe_tables (table_number) values (p_number) returning cafe_tables.id into id;
  perform public.admin_log('ADMIN_CREATED_TABLE', null, p_number, null, '{}');
  return id;
end $$;

create function public.admin_assign_game(p_table uuid, p_code text) returns void language plpgsql security definer set search_path = public as $$
declare g public.games; tn int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into g from public.games where room_code = upper(p_code);
  if g.id is null then raise exception 'Room not found'; end if;
  update public.cafe_tables set current_game_id = g.id, updated_at = now(),
    status = case g.status when 'paused' then 'PAUSED' when 'finished' then 'FINISHED' else 'PLAYING' end where id = p_table returning table_number into tn;
  insert into public.game_events (game_id, table_id, event_type) values (g.id, p_table, 'GAME_STARTED');
  perform public.admin_log('ADMIN_ASSIGNED_GAME', g.id, tn, null, jsonb_build_object('room', g.room_code));
end $$;

create function public.admin_release_table(p_table uuid) returns void language plpgsql security definer set search_path = public as $$
declare tn int; gid uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select table_number, current_game_id into tn, gid from public.cafe_tables where id = p_table;
  update public.cafe_tables set current_game_id = null, status = 'WAITING', updated_at = now() where id = p_table;
  perform public.admin_log('ADMIN_RELEASED_TABLE', gid, tn, null, '{}');
end $$;

create function public.admin_set_game_status(p_game uuid, p_status text) returns void language plpgsql security definer set search_path = public as $$
declare tn int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_status not in ('in_progress','paused','finished') then raise exception 'Invalid status'; end if;
  update public.games set status = p_status, finished_at = case when p_status = 'finished' then now() else finished_at end where id = p_game;
  if p_status = 'finished' then
    update public.game_players gp set final_rank = r.rk from (select id, rank() over (order by current_score desc) rk from public.game_players where game_id = p_game) r where gp.id = r.id;
  end if;
  select table_number into tn from public.cafe_tables where current_game_id = p_game;
  perform public.admin_log(case p_status when 'paused' then 'ADMIN_PAUSED_GAME' when 'finished' then 'ADMIN_FINISHED_GAME' else 'ADMIN_RESUMED_GAME' end, p_game, tn, null, '{}');
end $$;

create function public.admin_correct_score(p_player uuid, p_new int, p_reason text default null) returns void language plpgsql security definer set search_path = public as $$
declare pl public.game_players; tn int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into pl from public.game_players where id = p_player;
  if pl.id is null then raise exception 'Player not found'; end if;
  select table_number into tn from public.cafe_tables where current_game_id = pl.game_id;
  update public.game_players set current_score = p_new where id = p_player;
  perform public.admin_log('ADMIN_SCORE_CORRECTION', pl.game_id, tn, p_player,
    jsonb_build_object('player', pl.player_name, 'previous', pl.current_score, 'new', p_new, 'reason', p_reason));
end $$;

alter publication supabase_realtime add table public.cafe_tables;
