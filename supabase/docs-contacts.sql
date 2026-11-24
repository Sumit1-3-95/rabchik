-- Run this whole file once in Supabase -> SQL Editor. Safe to run again.
-- 1. Documents: private file storage + a list (all admins and super admins can see and add)
-- 2. Important contacts: who to call (all admins and super admins can see and add)
-- Public visitors cannot see any of it.

-- ---------- Documents ----------
create table if not exists public.documents (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(trim(title)) between 1 and 120),
  path       text not null,                 -- path inside the private "docs" bucket
  file_name  text not null,
  size_bytes bigint,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.documents enable row level security;
revoke all on public.documents from anon;
grant select, insert, update, delete on public.documents to authenticated;

drop policy if exists documents_read on public.documents;
create policy documents_read on public.documents for select to authenticated using (can_post());
drop policy if exists documents_add on public.documents;
create policy documents_add on public.documents for insert to authenticated with check (can_post());
drop policy if exists documents_del on public.documents;
create policy documents_del on public.documents for delete to authenticated using (is_admin() or created_by = auth.uid());

-- private bucket (not public: files open only through short-lived links)
insert into storage.buckets (id, name, public, file_size_limit)
values ('docs', 'docs', false, 26214400)   -- 25 MB per file
on conflict (id) do update set public = false, file_size_limit = 26214400;

drop policy if exists "docs read" on storage.objects;
create policy "docs read" on storage.objects for select to authenticated
  using (bucket_id = 'docs' and can_post());
drop policy if exists "docs insert" on storage.objects;
create policy "docs insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'docs' and can_post());
drop policy if exists "docs delete" on storage.objects;
create policy "docs delete" on storage.objects for delete to authenticated
  using (bucket_id = 'docs' and (is_admin() or owner = auth.uid()));

-- ---------- Important contacts ----------
create table if not exists public.contacts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 1 and 80),
  role       text check (char_length(role) <= 80),       -- e.g. Decorator, Resort manager, Driver
  phone      text not null check (char_length(trim(phone)) between 5 and 20),
  notes      text check (char_length(notes) <= 500),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.contacts enable row level security;
revoke all on public.contacts from anon;
grant select, insert, update, delete on public.contacts to authenticated;

drop policy if exists contacts_read on public.contacts;
create policy contacts_read on public.contacts for select to authenticated using (can_post());
drop policy if exists contacts_add on public.contacts;
create policy contacts_add on public.contacts for insert to authenticated with check (can_post());
drop policy if exists contacts_edit on public.contacts;
create policy contacts_edit on public.contacts for update to authenticated using (can_post()) with check (can_post());
drop policy if exists contacts_del on public.contacts;
create policy contacts_del on public.contacts for delete to authenticated using (is_admin() or created_by = auth.uid());

notify pgrst, 'reload schema';
