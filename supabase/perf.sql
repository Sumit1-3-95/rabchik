-- Run once in Supabase -> SQL Editor. Safe to run again. Makes lists fast as photos and users grow.
create index if not exists media_story_created_idx on public.media (is_story, created_at desc);
create index if not exists media_created_idx       on public.media (created_at desc);
create index if not exists media_event_idx         on public.media (event_id, created_at desc);
create index if not exists media_uploader_idx      on public.media (uploader);
create index if not exists media_likes_media_idx   on public.media_likes (media_id);
create index if not exists media_likes_user_idx    on public.media_likes (user_id);
create index if not exists media_comments_media_idx on public.media_comments (media_id);
create index if not exists story_views_user_idx    on public.story_views (user_id);
create index if not exists poll_votes_poll_idx     on public.poll_votes (poll_id);
create index if not exists poll_votes_user_idx     on public.poll_votes (user_id);
analyze;
