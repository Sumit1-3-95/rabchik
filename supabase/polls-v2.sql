-- Poll upgrade: "this or that" polls, Home results, polls inside Stories, everyone can vote, admin can make admins.
-- Run once in Supabase -> SQL Editor. Safe to run again.

-- 1. new poll type + flags
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.polls'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%kind%'
  loop execute format('alter table public.polls drop constraint %I', c); end loop;
end $$;
alter table polls add constraint polls_kind_check check (kind in ('single', 'multi', 'rating', 'versus'));
alter table polls add column if not exists on_home  boolean not null default false;   -- show results on Home
alter table polls add column if not exists in_story boolean not null default false;   -- show as a story
alter table polls add column if not exists theme    int;                              -- colour theme 0-6 (null = automatic)

-- 2. every guest can vote (was friends/admins only)
drop policy if exists votes_insert on poll_votes;
create policy votes_insert on poll_votes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists votes_update on poll_votes;
create policy votes_update on poll_votes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. admins can make (or remove) other admins from the app
create or replace function set_user_role(target uuid, new_role user_role) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only admins can change roles'; end if;
  if target = auth.uid() and new_role <> 'admin' then raise exception 'You cannot remove your own admin access'; end if;
  update profiles set role = new_role where id = target;
end $$;
grant execute on function set_user_role(uuid, user_role) to authenticated;

-- 4. sample "this or that" polls (shown on Home and in Stories so you can see them straight away)
insert into polls (kind, question, options, max_choices, sort, on_home, in_story, theme)
select * from (values
  ('versus', 'Who said "I love you" first?',           '["Saurabh","Anushika"]'::jsonb, 1, 5, true,  true,  1),
  ('versus', 'Who is the better dancer?',              '["Saurabh","Anushika"]'::jsonb, 1, 6, false, true,  2),
  ('versus', 'Who takes longer to get ready?',         '["Saurabh","Anushika"]'::jsonb, 1, 7, false, false, 4)
) v(kind, question, options, max_choices, sort, on_home, in_story, theme)
where not exists (select 1 from polls p where p.question = v.question);

update polls set on_home = true, in_story = true
where question = 'Where did Saurabh & Anushika first meet?';
