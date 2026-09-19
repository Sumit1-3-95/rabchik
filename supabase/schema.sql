-- =====================================================================
-- Rabchik wedding app — database schema
-- Run once in Supabase: SQL Editor > New query > paste > Run
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- roles ----------
do $$ begin
  create type user_role as enum ('admin', 'friend', 'relative');
exception when duplicate_object then null; end $$;

-- ---------- guests (one row per auth user) ----------
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  phone           text unique not null,              -- last 10 digits
  name            text not null,
  role            user_role not null default 'relative',
  room_no         text,
  side            text check (side in ('bride', 'groom')),
  must_change_pin boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---------- helper functions (used by RLS) ----------
create or replace function app_role() returns user_role
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select role = 'admin' from profiles where id = auth.uid()), false) $$;

-- friends and admins can post / vote / write; relatives are view-only
create or replace function can_post() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select role in ('admin', 'friend') from profiles where id = auth.uid()), false) $$;

-- ---------- events ----------
create table if not exists events (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  event_date       date not null,
  time_label       text,                 -- "Morning", "Evening", "10:00 AM"
  venue            text,
  maps_url         text,
  dress_code       text,
  theme_label      text,
  theme_colors     text[] default '{}',  -- two hex colours, used for gradients
  display_image_url text,                -- storage path (card photo)
  background_url   text,                 -- storage path (detail page backdrop)
  banner_urls      text[] default '{}',  -- iconic photos, chosen by admin
  menu_items       jsonb default '[]',   -- [{ "name": "...", "image_url": "path" }] (max 4)
  expect           text,
  trivia           text,
  sort             int default 0,
  published        boolean default true,
  created_at       timestamptz default now()
);

-- ---------- photos & videos (also feed the stories circles) ----------
create table if not exists media (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid references events(id) on delete set null,
  uploader   uuid not null references profiles(id) on delete cascade,
  kind       text not null check (kind in ('image', 'video')),
  path       text not null,                 -- path inside the "media" bucket
  caption    text,
  is_story   boolean not null default true,
  duration   numeric,
  created_at timestamptz not null default now()
);
create index if not exists media_event_idx on media(event_id, created_at);

create table if not exists story_views (
  media_id uuid references media(id) on delete cascade,
  user_id  uuid references profiles(id) on delete cascade,
  seen_at  timestamptz default now(),
  primary key (media_id, user_id)
);

create table if not exists media_likes (
  media_id uuid references media(id) on delete cascade,
  user_id  uuid references profiles(id) on delete cascade,
  primary key (media_id, user_id)
);

create table if not exists media_comments (
  id         uuid primary key default gen_random_uuid(),
  media_id   uuid not null references media(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 400),
  created_at timestamptz default now()
);

-- ---------- engagement ----------
create table if not exists polls (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('single', 'multi', 'rating')),
  question    text not null,
  options     jsonb default '[]',           -- ["College", "Through friends", ...]
  max_choices int default 2,                -- for multi
  is_open     boolean default true,
  sort        int default 0,
  created_at  timestamptz default now()
);

create table if not exists poll_votes (
  poll_id uuid references polls(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  choices int[] default '{}',               -- option indexes
  rating  int check (rating between 1 and 5),
  primary key (poll_id, user_id)
);

create table if not exists trivia_cards (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  cover_url  text,                          -- storage path
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists games (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  cover_url   text,
  status      text default 'soon' check (status in ('soon', 'live')),
  sort        int default 0
);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table profiles       enable row level security;
alter table events         enable row level security;
alter table media          enable row level security;
alter table story_views    enable row level security;
alter table media_likes    enable row level security;
alter table media_comments enable row level security;
alter table polls          enable row level security;
alter table poll_votes     enable row level security;
alter table trivia_cards   enable row level security;
alter table games          enable row level security;

-- profiles: guests can read names/rooms (Community list) but NOT phone numbers.
-- Writes happen only through the admin-guests Edge Function (service role).
revoke all on profiles from anon, authenticated;
grant select (id, name, role, room_no, side, must_change_pin) on profiles to authenticated;
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select to authenticated using (true);

-- events
drop policy if exists events_read on events;
create policy events_read  on events for select to authenticated using (published or is_admin());
drop policy if exists events_admin on events;
create policy events_admin on events for all    to authenticated using (is_admin()) with check (is_admin());

-- media
drop policy if exists media_read on media;
create policy media_read   on media for select to authenticated using (true);
drop policy if exists media_insert on media;
create policy media_insert on media for insert to authenticated
  with check (can_post() and uploader = auth.uid());
drop policy if exists media_delete on media;
create policy media_delete on media for delete to authenticated
  using (uploader = auth.uid() or is_admin());

-- story views (private to each guest)
drop policy if exists views_own on story_views;
create policy views_own on story_views for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- likes & comments: every guest can react
drop policy if exists likes_read on media_likes;
create policy likes_read   on media_likes for select to authenticated using (true);
drop policy if exists likes_write on media_likes;
create policy likes_write  on media_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists likes_del on media_likes;
create policy likes_del    on media_likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists comments_read on media_comments;
create policy comments_read  on media_comments for select to authenticated using (true);
drop policy if exists comments_write on media_comments;
create policy comments_write on media_comments for insert to authenticated with check (user_id = auth.uid());
drop policy if exists comments_del on media_comments;
create policy comments_del   on media_comments for delete to authenticated
  using (user_id = auth.uid() or is_admin());

-- polls: everyone reads, admin edits; friends/admin vote
drop policy if exists polls_read on polls;
create policy polls_read  on polls for select to authenticated using (true);
drop policy if exists polls_admin on polls;
create policy polls_admin on polls for all    to authenticated using (is_admin()) with check (is_admin());

drop policy if exists votes_own_read on poll_votes;
create policy votes_own_read on poll_votes for select to authenticated using (user_id = auth.uid());
drop policy if exists votes_insert on poll_votes;
create policy votes_insert on poll_votes for insert to authenticated
  with check (user_id = auth.uid() and can_post());
drop policy if exists votes_update on poll_votes;
create policy votes_update on poll_votes for update to authenticated
  using (user_id = auth.uid() and can_post()) with check (user_id = auth.uid());

-- trivia: friends/admin write; author or admin edits
drop policy if exists trivia_read on trivia_cards;
create policy trivia_read   on trivia_cards for select to authenticated using (true);
drop policy if exists trivia_insert on trivia_cards;
create policy trivia_insert on trivia_cards for insert to authenticated
  with check (can_post() and created_by = auth.uid());
drop policy if exists trivia_update on trivia_cards;
create policy trivia_update on trivia_cards for update to authenticated
  using (created_by = auth.uid() or is_admin());
drop policy if exists trivia_delete on trivia_cards;
create policy trivia_delete on trivia_cards for delete to authenticated
  using (created_by = auth.uid() or is_admin());

-- games
drop policy if exists games_read on games;
create policy games_read  on games for select to authenticated using (true);
drop policy if exists games_admin on games;
create policy games_admin on games for all    to authenticated using (is_admin()) with check (is_admin());

-- =====================================================================
-- Functions called from the app
-- =====================================================================

-- Poll results are visible to everyone, without exposing who voted what.
create or replace function get_poll_results()
returns table (poll_id uuid, opt int, votes bigint, voters bigint, avg_rating numeric)
language sql stable security definer set search_path = public as $$
  select p.id,
         o.opt,
         count(v.user_id) filter (where o.opt = any (v.choices)),
         (select count(*) from poll_votes x where x.poll_id = p.id),
         (select round(avg(r.rating)::numeric, 1) from poll_votes r where r.poll_id = p.id)
  from polls p
  cross join lateral generate_series(0, greatest(coalesce(jsonb_array_length(p.options), 1) - 1, 0)) as o(opt)
  left join poll_votes v on v.poll_id = p.id
  group by p.id, o.opt
$$;
grant execute on function get_poll_results() to authenticated;

-- Called after a guest sets their own PIN
create or replace function mark_pin_changed() returns void
language sql security definer set search_path = public as
$$ update profiles set must_change_pin = false where id = auth.uid() $$;
grant execute on function mark_pin_changed() to authenticated;

-- Admin-only guest list (includes phone numbers)
create or replace function admin_list_guests()
returns table (id uuid, name text, phone text, role user_role, room_no text, side text, must_change_pin boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query select p.id, p.name, p.phone, p.role, p.room_no, p.side, p.must_change_pin
               from profiles p order by p.name;
end $$;
grant execute on function admin_list_guests() to authenticated;

-- =====================================================================
-- Storage: one bucket "media"
--   <user-id>/<file>   guest uploads (friends + admin)
--   events/<file>      admin uploads (banners, menu photos, covers)
-- Bucket is public-read (URLs are unguessable) so photos load fast from the CDN.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 104857600)   -- 100 MB per file
on conflict (id) do update set public = true, file_size_limit = 104857600;

drop policy if exists "media read" on storage.objects;
create policy "media read" on storage.objects for select using (bucket_id = 'media');

drop policy if exists "media insert" on storage.objects;
create policy "media insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and ( is_admin()
          or (can_post() and (storage.foldername(name))[1] = auth.uid()::text) )
  );

drop policy if exists "media delete" on storage.objects;
create policy "media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (owner = auth.uid() or is_admin()));
