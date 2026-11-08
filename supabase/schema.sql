-- Lucky Cat Mahjong — Supabase schema. Run in the Supabase SQL editor.
-- Seats are 0..3 = East, South, West, North at game start. Winds are 'east'|'south'|'west'|'north'.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.games (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique check (room_code ~ '^[A-Z0-9]{4}$'),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','finished')),
  starting_points int not null default 10000,
  fan_cap int not null default 10,
  fan_conversion jsonb not null default '{}'::jsonb,   -- fan -> points table, base point, payment multiplier
  current_round_wind text not null default 'east' check (current_round_wind in ('east','south','west','north')),
  current_dealer_seat int not null default 0 check (current_dealer_seat between 0 and 3),
  dealer_rotations int not null default 0,              -- dealer changes within the current round wind (0..3)
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index games_owner_idx on public.games(owner_id, created_at desc);

create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,   -- null = guest player
  player_name text not null,
  seat_position int not null check (seat_position between 0 and 3),
  current_score int not null,
  final_rank int,
  unique (game_id, seat_position)
);
create index game_players_user_idx on public.game_players(user_id);

create table public.game_members (   -- people who joined by room code (read access)
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

create table public.game_hands (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  hand_number int not null,
  round_wind text not null,
  dealer_player_id uuid not null references public.game_players(id),
  winner_player_id uuid references public.game_players(id),          -- null = draw
  winning_method text not null check (winning_method in ('self_draw','discard','draw')),
  discard_player_id uuid references public.game_players(id),
  total_fan int not null default 0,
  final_points int not null default 0,
  hand_tiles jsonb,
  photo_url text,
  created_at timestamptz not null default now(),
  unique (game_id, hand_number)
);
create index game_hands_game_idx on public.game_hands(game_id, hand_number);

create table public.hand_fan_details (
  id uuid primary key default gen_random_uuid(),
  hand_id uuid not null references public.game_hands(id) on delete cascade,
  fan_name text not null,
  fan_value int not null
);
create index hand_fan_hand_idx on public.hand_fan_details(hand_id);

create table public.score_transactions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  hand_id uuid not null references public.game_hands(id) on delete cascade,
  player_id uuid not null references public.game_players(id) on delete cascade,
  points_change int not null,
  score_after int not null,
  created_at timestamptz not null default now()
);
create index score_tx_game_idx on public.score_transactions(game_id);

-- ---------- Access helpers (security definer avoids RLS recursion) ----------
create function public.is_game_owner(gid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from games where id = gid and owner_id = auth.uid()) $$;
create function public.can_view_game(gid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_game_owner(gid) or exists (select 1 from game_members where game_id = gid and user_id = auth.uid()) $$;

-- Join by room code: the only way a non-owner gains access.
create function public.join_game(code text) returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  select id into gid from games where room_code = upper(code);
  if gid is null then raise exception 'Room not found'; end if;
  insert into game_members (game_id, user_id) values (gid, auth.uid()) on conflict do nothing;
  return gid;
end $$;

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.game_members enable row level security;
alter table public.game_hands enable row level security;
alter table public.hand_fan_details enable row level security;
alter table public.score_transactions enable row level security;

create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid());

create policy "games read" on public.games for select to authenticated using (public.can_view_game(id));
create policy "games insert" on public.games for insert to authenticated with check (owner_id = auth.uid());
create policy "games update owner" on public.games for update to authenticated using (owner_id = auth.uid());
create policy "games delete owner" on public.games for delete to authenticated using (owner_id = auth.uid());

create policy "members read own" on public.game_members for select to authenticated using (user_id = auth.uid() or public.is_game_owner(game_id));

create policy "players read" on public.game_players for select to authenticated using (public.can_view_game(game_id));
create policy "players write" on public.game_players for all to authenticated using (public.is_game_owner(game_id)) with check (public.is_game_owner(game_id));

create policy "hands read" on public.game_hands for select to authenticated using (public.can_view_game(game_id));
create policy "hands write" on public.game_hands for all to authenticated using (public.is_game_owner(game_id)) with check (public.is_game_owner(game_id));

create policy "fan read" on public.hand_fan_details for select to authenticated using (exists (select 1 from game_hands h where h.id = hand_id and public.can_view_game(h.game_id)));
create policy "fan write" on public.hand_fan_details for all to authenticated using (exists (select 1 from game_hands h where h.id = hand_id and public.is_game_owner(h.game_id))) with check (exists (select 1 from game_hands h where h.id = hand_id and public.is_game_owner(h.game_id)));

create policy "tx read" on public.score_transactions for select to authenticated using (public.can_view_game(game_id));
create policy "tx write" on public.score_transactions for all to authenticated using (public.is_game_owner(game_id)) with check (public.is_game_owner(game_id));

-- Realtime for live game tracking (Phase 2+)
alter publication supabase_realtime add table public.games, public.game_players, public.game_hands, public.score_transactions;

-- Storage bucket for winning-hand photos (public read; uploads limited to signed-in users)
insert into storage.buckets (id, name, public) values ('hand-photos','hand-photos', true) on conflict do nothing;
create policy "hand photos upload" on storage.objects for insert to authenticated with check (bucket_id = 'hand-photos');
