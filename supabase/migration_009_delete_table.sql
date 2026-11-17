-- Admin: delete a cafe table. Run after migration_008.
-- game_events.table_id and tv_settings.spotlight_table_id are "on delete set null", so history and TV settings survive.
-- Games are never deleted here: finished games stay in history. The UI finishes a running game before calling this.
create or replace function public.admin_delete_table(p_table uuid) returns void language plpgsql security definer set search_path = public as $$
declare tn int; gid uuid; gstatus text;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select table_number, current_game_id into tn, gid from public.cafe_tables where id = p_table;
  if tn is null then raise exception 'Table not found'; end if;
  if gid is not null then
    select status into gstatus from public.games where id = gid;
    if gstatus is not null and gstatus <> 'finished' then raise exception 'Akhiri game di meja ini dulu sebelum menghapus meja'; end if;
  end if;
  delete from public.cafe_tables where id = p_table;
  perform public.admin_log('ADMIN_DELETED_TABLE', gid, tn, null, '{}');
end $$;
grant execute on function public.admin_delete_table(uuid) to authenticated;
notify pgrst, 'reload schema';
