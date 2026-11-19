-- TV: how many players the Main Leaderboard shows per page (admin setting; 4-20, default 8). Run after migration_011.
alter table public.tv_settings add column if not exists main_rows int not null default 8 check (main_rows between 4 and 20);
notify pgrst, 'reload schema';
