-- TV: new mode 'main' (live leaderboard of all players from all tables). Run after migration_007.
alter table public.tv_settings drop constraint if exists tv_settings_mode_check;
alter table public.tv_settings add constraint tv_settings_mode_check check (mode in ('live', 'main', 'spotlight', 'leaderboard', 'rotate'));
notify pgrst, 'reload schema';
