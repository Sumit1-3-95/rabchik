-- Run this whole file once in Supabase -> SQL Editor. Safe to run again.
-- Makes the app public (no login to view), lets only admins upload, and adds the Team & PINs tools.

-- 1. Public (logged-out) visitors can READ the wedding content
grant usage on schema public to anon;
grant select on public.events, public.media, public.media_likes, public.media_comments to anon;
grant select (id, name, role) on public.profiles to anon;

drop policy if exists events_read_anon on public.events;
create policy events_read_anon on public.events for select to anon using (published);
drop policy if exists media_read_anon on public.media;
create policy media_read_anon on public.media for select to anon using (true);
drop policy if exists likes_read_anon on public.media_likes;
create policy likes_read_anon on public.media_likes for select to anon using (true);
drop policy if exists comments_read_anon on public.media_comments;
create policy comments_read_anon on public.media_comments for select to anon using (true);
-- only the names of admins are visible to the public (so photos can show who added them)
drop policy if exists profiles_read_anon on public.profiles;
create policy profiles_read_anon on public.profiles for select to anon using (role in ('admin', 'friend'));

-- 2. Only admins (role friend) and super admins (role admin) can upload, like and comment
drop policy if exists media_insert on public.media;
create policy media_insert on public.media for insert to authenticated
  with check (can_post() and uploader = auth.uid());

drop policy if exists "media insert" on storage.objects;
create policy "media insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and ( is_admin() or (can_post() and (storage.foldername(name))[1] = auth.uid()::text) )
  );

drop policy if exists likes_write on public.media_likes;
create policy likes_write on public.media_likes for insert to authenticated
  with check (can_post() and user_id = auth.uid());
drop policy if exists comments_write on public.media_comments;
create policy comments_write on public.media_comments for insert to authenticated
  with check (can_post() and user_id = auth.uid());

-- 3. Existing test accounts: current super admins stay; everyone else becomes a normal (view-only) account
update public.profiles set role = 'relative' where role = 'friend';

-- 4. Team & PINs (super admins only)
create table if not exists public.admin_pins (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  pin        text not null,
  updated_at timestamptz not null default now()
);
alter table public.admin_pins enable row level security;
revoke all on public.admin_pins from anon, authenticated;   -- only the functions below can read it

create or replace function public.team_list()
returns table (id uuid, name text, phone text, role user_role, pin text)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only super admins can see the team'; end if;
  return query
    select p.id, p.name, p.phone, p.role, a.pin
      from profiles p left join admin_pins a on a.user_id = p.id
     where p.role in ('admin', 'friend')
     order by (p.role = 'admin') desc, p.name;
end $$;

create or replace function public.team_upsert(p_phone text, p_name text, p_pin text, p_role user_role, p_reset boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_admin() then raise exception 'Only super admins can do this'; end if;
  if p_pin !~ '^\d{4}$' then raise exception 'PIN must be 4 digits'; end if;
  select id into v_id from profiles where phone = right(regexp_replace(p_phone, '\D', '', 'g'), 10);
  if v_id is null then raise exception 'Account was not created. Try again.'; end if;
  if v_id = auth.uid() and p_role <> 'admin' then raise exception 'You cannot remove your own super admin access'; end if;
  update profiles set role = p_role, name = coalesce(nullif(trim(p_name), ''), name), must_change_pin = false where id = v_id;
  insert into admin_pins (user_id, pin) values (v_id, p_pin)
    on conflict (user_id) do update set pin = excluded.pin, updated_at = now();
  if p_reset then
    update auth.users set encrypted_password = extensions.crypt(p_pin || '#rabchik', extensions.gen_salt('bf')), updated_at = now() where id = v_id;
  end if;
  return v_id;
end $$;

create or replace function public.team_set_pin(target uuid, p_pin text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only super admins can do this'; end if;
  if p_pin !~ '^\d{4}$' then raise exception 'PIN must be 4 digits'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_pin || '#rabchik', extensions.gen_salt('bf')), updated_at = now() where id = target;
  insert into admin_pins (user_id, pin) values (target, p_pin)
    on conflict (user_id) do update set pin = excluded.pin, updated_at = now();
end $$;

create or replace function public.team_remove(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only super admins can do this'; end if;
  if target = auth.uid() then raise exception 'You cannot remove your own access'; end if;
  update profiles set role = 'relative' where id = target;
  delete from admin_pins where user_id = target;
end $$;

grant execute on function public.team_list() to authenticated;
grant execute on function public.team_upsert(text, text, text, user_role, boolean) to authenticated;
grant execute on function public.team_set_pin(uuid, text) to authenticated;
grant execute on function public.team_remove(uuid) to authenticated;

notify pgrst, 'reload schema';

-- 5. Check: shows your super admins
select name, phone, role from public.profiles where role in ('admin', 'friend') order by role, name;
