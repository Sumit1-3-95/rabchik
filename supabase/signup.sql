-- Self sign-up: creates a profile automatically from the sign-up form.
-- Run once in Supabase -> SQL Editor. (Replaces open-login.sql.)

alter table public.profiles alter column must_change_pin set default false;
update public.profiles set must_change_pin = false;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ph text := right(regexp_replace(split_part(new.email, '@', 1), '\D', '', 'g'), 10);
  nm text := nullif(trim(new.raw_user_meta_data->>'name'), '');
  sd text := nullif(new.raw_user_meta_data->>'side', '');
begin
  if sd not in ('bride', 'groom') then sd := null; end if;
  insert into public.profiles (id, phone, name, role, side, must_change_pin)
  values (new.id, ph, coalesce(nm, ph), 'relative', sd, false)
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
