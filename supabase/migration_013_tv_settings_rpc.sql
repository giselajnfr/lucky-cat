-- TV settings: save through one admin-only function (also recreates the settings row if it is missing). Run after migration_012.
alter table public.tv_settings add column if not exists main_rows int not null default 8 check (main_rows between 4 and 20);
insert into public.tv_settings (id) values (1) on conflict (id) do nothing;

create or replace function public.admin_update_tv_settings(p jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  insert into public.tv_settings (id) values (1) on conflict (id) do nothing;
  update public.tv_settings set
    mode                  = case when p ? 'mode' then p->>'mode' else mode end,
    spotlight_table_id    = case when p ? 'spotlight_table_id' then nullif(p->>'spotlight_table_id', '')::uuid else spotlight_table_id end,
    rotation_interval_ms  = case when p ? 'rotation_interval_ms' then (p->>'rotation_interval_ms')::int else rotation_interval_ms end,
    highlight_duration_ms = case when p ? 'highlight_duration_ms' then (p->>'highlight_duration_ms')::int else highlight_duration_ms end,
    sound_enabled         = case when p ? 'sound_enabled' then (p->>'sound_enabled')::boolean else sound_enabled end,
    animations_enabled    = case when p ? 'animations_enabled' then (p->>'animations_enabled')::boolean else animations_enabled end,
    leaderboard_type      = case when p ? 'leaderboard_type' then p->>'leaderboard_type' else leaderboard_type end,
    main_rows             = case when p ? 'main_rows' then (p->>'main_rows')::int else main_rows end
  where id = 1;
end $$;
revoke all on function public.admin_update_tv_settings(jsonb) from public, anon;
grant execute on function public.admin_update_tv_settings(jsonb) to authenticated;
notify pgrst, 'reload schema';
