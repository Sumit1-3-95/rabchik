-- Let EVERY guest share photos/videos, and everyone see them. Run once in Supabase -> SQL Editor.

-- make sure the bucket is public so photos load for everyone
update storage.buckets set public = true, file_size_limit = 104857600 where id = 'media';

drop policy if exists "media read" on storage.objects;
create policy "media read" on storage.objects for select using (bucket_id = 'media');

-- any signed-in guest can upload into their own folder; admins can also use events/ and others
drop policy if exists "media insert" on storage.objects;
create policy "media insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and ( is_admin() or (storage.foldername(name))[1] = auth.uid()::text )
  );

drop policy if exists "media delete" on storage.objects;
create policy "media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (owner = auth.uid() or is_admin()));

-- any signed-in guest can post; everyone can read
drop policy if exists media_insert on media;
create policy media_insert on media for insert to authenticated with check (uploader = auth.uid());
drop policy if exists media_read on media;
create policy media_read on media for select to authenticated using (true);
drop policy if exists media_update on media;
create policy media_update on media for update to authenticated
  using (uploader = auth.uid() or is_admin()) with check (uploader = auth.uid() or is_admin());
