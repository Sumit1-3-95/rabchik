-- Run this whole file once in Supabase -> SQL Editor. Safe to run again.
-- Fixes: "could not find the in_story column" and "could not save your vote" (non-admin users).

-- 1. poll columns
alter table public.polls add column if not exists on_home  boolean not null default false;
alter table public.polls add column if not exists in_story boolean not null default false;
alter table public.polls add column if not exists theme    int;

-- 2. allow the "this or that" poll type
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.polls'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%kind%'
  loop execute format('alter table public.polls drop constraint %I', c); end loop;
end $$;
alter table public.polls add constraint polls_kind_check check (kind in ('single', 'multi', 'rating', 'versus'));

-- 3. EVERYONE can vote (this is what was blocking non-admin users)
drop policy if exists votes_insert on public.poll_votes;
create policy votes_insert on public.poll_votes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists votes_update on public.poll_votes;
create policy votes_update on public.poll_votes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists votes_own_read on public.poll_votes;
create policy votes_own_read on public.poll_votes for select to authenticated using (user_id = auth.uid());

-- 4. admins can make other admins
create or replace function public.set_user_role(target uuid, new_role user_role) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only admins can change roles'; end if;
  if target = auth.uid() and new_role <> 'admin' then raise exception 'You cannot remove your own admin access'; end if;
  update profiles set role = new_role where id = target;
end $$;
grant execute on function public.set_user_role(uuid, user_role) to authenticated;

-- 5. make Supabase notice the new columns straight away
notify pgrst, 'reload schema';

-- 6. check: this should list on_home, in_story and theme, and the vote policies
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'polls' and column_name in ('on_home', 'in_story', 'theme');
select policyname, cmd from pg_policies where tablename = 'poll_votes';
