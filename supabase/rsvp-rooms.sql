-- Run this whole file once in Supabase -> SQL Editor. Safe to run again.
-- 1. RSVPs from the Invite page (anyone can RSVP, only super admins can read them)
-- 2. Room list: which guest is in which room (super admins only)

-- ---------- RSVPs ----------
create table if not exists public.rsvps (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 1 and 60),
  guests     int  not null default 0 check (guests between 0 and 10),   -- people coming with them (+1, +2...)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.rsvps enable row level security;
revoke all on public.rsvps from anon;
grant select, update, delete on public.rsvps to authenticated;

drop policy if exists rsvps_admin on public.rsvps;
create policy rsvps_admin on public.rsvps for all to authenticated using (is_admin()) with check (is_admin());

-- Guests are not logged in, so they save through this function (it also lets them change their own RSVP from the same phone).
create or replace function public.rsvp_save(p_id uuid, p_name text, p_guests int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  p_name := trim(coalesce(p_name, ''));
  if char_length(p_name) < 1 or char_length(p_name) > 60 then raise exception 'Please enter your name'; end if;
  if p_guests is null or p_guests < 0 or p_guests > 10 then raise exception 'Invalid guest count'; end if;
  if p_id is not null then
    update rsvps set name = p_name, guests = p_guests, updated_at = now() where id = p_id returning id into v_id;
  end if;
  if v_id is null then
    insert into rsvps (name, guests) values (p_name, p_guests) returning id into v_id;
  end if;
  return v_id;
end $$;
revoke all on function public.rsvp_save(uuid, text, int) from public;
grant execute on function public.rsvp_save(uuid, text, int) to anon, authenticated;

-- ---------- Room list ----------
create table if not exists public.room_guests (
  id         uuid primary key default gen_random_uuid(),
  room       text not null,
  name       text not null check (char_length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
create index if not exists room_guests_room_idx on public.room_guests (room);
alter table public.room_guests enable row level security;
revoke all on public.room_guests from anon;
grant select, insert, update, delete on public.room_guests to authenticated;

drop policy if exists room_guests_admin on public.room_guests;
create policy room_guests_admin on public.room_guests for all to authenticated using (is_admin()) with check (is_admin());

notify pgrst, 'reload schema';
