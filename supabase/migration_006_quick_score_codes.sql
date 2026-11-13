-- Lucky Cat Mahjong — migration 006: "Hitung skor cepat" needs an access code that an ADMIN generates.
-- Players enter the code once; they keep access until the code expires or the admin revokes it. Admins never need a code.
-- Run after migration 005. Safe to re-run.

create table if not exists public.calc_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text,                                              -- who or what it is for, e.g. "Meja 6" or "Event Sabtu"
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,                         -- after this moment nobody can enter it, and access it gave ends
  max_uses int check (max_uses is null or max_uses > 0),   -- how many different people may enter it; null = unlimited
  uses int not null default 0,
  revoked_at timestamptz
);
create table if not exists public.calc_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  code_id uuid not null references public.calc_codes(id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (user_id, code_id)
);
-- wrong guesses, so one account cannot hammer the code field
create table if not exists public.calc_attempts (id bigserial primary key, user_id uuid not null, at timestamptz not null default now());
create index if not exists calc_attempts_user_at on public.calc_attempts (user_id, at desc);

alter table public.calc_codes enable row level security;
alter table public.calc_access enable row level security;
alter table public.calc_attempts enable row level security;
revoke all on public.calc_codes, public.calc_access, public.calc_attempts from anon, authenticated;
grant select on public.calc_codes to authenticated;
drop policy if exists calc_codes_admin_read on public.calc_codes;
create policy calc_codes_admin_read on public.calc_codes for select to authenticated using (public.is_admin());

-- Admin: create a code. Returns the code. 6 characters from the same alphabet as room codes (no I, O, 0, 1).
create or replace function public.admin_create_calc_code(p_label text, p_hours int, p_max_uses int default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text; tries int := 0; i int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_hours is null or p_hours not between 1 and 8760 then raise exception 'Validity must be between 1 hour and 1 year'; end if;
  if p_max_uses is not null and p_max_uses not between 1 and 1000 then raise exception 'Maximum uses must be between 1 and 1000'; end if;
  if char_length(coalesce(p_label, '')) > 60 then raise exception 'The label can have at most 60 characters'; end if;
  loop
    v_code := '';
    for i in 1..6 loop v_code := v_code || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1); end loop;
    exit when not exists (select 1 from public.calc_codes c where c.code = v_code);
    tries := tries + 1; if tries > 50 then raise exception 'Could not allocate a code'; end if;
  end loop;
  insert into public.calc_codes (code, label, created_by, expires_at, max_uses)
  values (v_code, nullif(btrim(p_label), ''), auth.uid(), now() + make_interval(hours => p_hours), p_max_uses);
  return v_code;
end $$;

create or replace function public.admin_revoke_calc_code(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.calc_codes set revoked_at = coalesce(revoked_at, now()) where id = p_id;
  if not found then raise exception 'Code not found'; end if;
end $$;

-- Player: enter a code. Returns when the access ends, or null when the code is wrong, expired, revoked or used up.
-- Entering the same code again never uses it up twice.
create or replace function public.redeem_calc_code(p_code text) returns timestamptz language plpgsql security definer set search_path = public as $$
declare c public.calc_codes; normalized text := upper(btrim(coalesce(p_code, '')));
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if (select count(*) from public.calc_attempts where user_id = auth.uid() and at > now() - interval '10 minutes') >= 10 then
    raise exception 'Too many wrong codes. Try again in a few minutes';
  end if;
  select * into c from public.calc_codes where code = normalized for update;
  if c.id is null or c.revoked_at is not null or c.expires_at <= now() then
    insert into public.calc_attempts (user_id) values (auth.uid());   -- returns instead of raising, so this row is kept
    return null;
  end if;
  if not exists (select 1 from public.calc_access where user_id = auth.uid() and code_id = c.id) then
    if c.max_uses is not null and c.uses >= c.max_uses then
      insert into public.calc_attempts (user_id) values (auth.uid());
      return null;
    end if;
    insert into public.calc_access (user_id, code_id) values (auth.uid(), c.id);
    update public.calc_codes set uses = uses + 1 where id = c.id;
  end if;
  return c.expires_at;
end $$;

-- Does the signed-in user have access right now? Admins always do.
create or replace function public.has_calc_access() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.calc_access a join public.calc_codes c on c.id = a.code_id
    where a.user_id = auth.uid() and c.revoked_at is null and c.expires_at > now()) $$;

-- When does the user's access end? null = admin, or no access.
create or replace function public.calc_access_until() returns timestamptz language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then null else (
    select max(c.expires_at) from public.calc_access a join public.calc_codes c on c.id = a.code_id
    where a.user_id = auth.uid() and c.revoked_at is null and c.expires_at > now()) end $$;

revoke all on function public.admin_create_calc_code(text, int, int), public.admin_revoke_calc_code(uuid), public.redeem_calc_code(text), public.has_calc_access(), public.calc_access_until() from public, anon;
grant execute on function public.admin_create_calc_code(text, int, int), public.admin_revoke_calc_code(uuid), public.redeem_calc_code(text), public.has_calc_access(), public.calc_access_until() to authenticated;
notify pgrst, 'reload schema';
