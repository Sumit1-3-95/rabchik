-- Dummy content with photos, so the app looks alive. Run in Supabase -> SQL Editor.
-- Needs schema.sql + seed.sql already run, and your admin account to exist.
-- Photos are placeholder pictures from picsum.photos (swap for real ones in the admin screens later).
-- Safe to run again: it clears the previous dummy rows first.

do $$
declare
  adm uuid := (select id from profiles where role = 'admin' order by created_at limit 1);
  ev record;
  n int := 0;
  m uuid;
  caps text[] := array[
    'Haldi vibes', 'Cousins squad', 'Golden hour', 'Dance floor is on fire',
    'Mehendi ready', 'Family portrait', 'Best dressed', 'Chai break',
    'Bride entry', 'Groom''s baraat', 'Jaipur skyline', 'Last dance'];
begin
  if adm is null then raise exception 'No admin profile found. Log in to the app once with your admin number first.'; end if;

  -- clear previous dummy content
  delete from media where path like 'https://picsum.photos/seed/rabchik-%';
  delete from trivia_cards where cover_url like 'https://picsum.photos/seed/rabchik-%';

  -- event photos: card image, 3 banner photos, menu images
  n := 0;
  for ev in select id, title from events order by sort loop
    n := n + 1;
    update events set
      display_image_url = 'https://picsum.photos/seed/rabchik-card' || n || '/900/600',
      background_url    = 'https://picsum.photos/seed/rabchik-bg' || n || '/1200/800',
      banner_urls = array[
        'https://picsum.photos/seed/rabchik-ban' || n || 'a/1200/800',
        'https://picsum.photos/seed/rabchik-ban' || n || 'b/1200/800',
        'https://picsum.photos/seed/rabchik-ban' || n || 'c/1200/800'],
      menu_items = coalesce((
        select jsonb_agg(item || jsonb_build_object('image_url',
          'https://picsum.photos/seed/rabchik-food' || n || '-' || ord || '/400/400') order by ord)
        from jsonb_array_elements(menu_items) with ordinality as t(item, ord)), '[]'::jsonb),
      trivia = coalesce(trivia, 'Fun fact: the couple''s first selfie together was taken at a chai stall.')
    where id = ev.id;
  end loop;

  -- 12 gallery photos, first 8 also show as stories
  n := 0;
  for ev in select id from events order by sort loop
    for i in 1..2 loop
      n := n + 1;
      exit when n > 12;
      insert into media (event_id, uploader, kind, path, caption, is_story)
      values (ev.id, adm, 'image', 'https://picsum.photos/seed/rabchik-m' || n || '/900/1200', caps[n], n <= 8);
    end loop;
  end loop;

  -- a few likes and comments
  for m in select id from media where path like 'https://picsum.photos/seed/rabchik-m%' limit 6 loop
    insert into media_likes (media_id, user_id) values (m, adm) on conflict do nothing;
    insert into media_comments (media_id, user_id, body) values (m, adm, 'So beautiful!');
  end loop;

  -- trivia and stories from the "friends"
  insert into trivia_cards (title, body, cover_url, created_by) values
    ('How they met', 'Saurabh and Anushika met over a shared plate of pani puri. Nobody has been able to prove who paid.', 'https://picsum.photos/seed/rabchik-t1/900/500', adm),
    ('Groom''s secret talent', 'Saurabh can find the best chai stall in any city within 10 minutes.', 'https://picsum.photos/seed/rabchik-t2/900/500', adm),
    ('Bride''s golden rule', 'Anushika believes every trip needs one unplanned detour. Expect one on the wedding day.', 'https://picsum.photos/seed/rabchik-t3/900/500', adm);

  -- games get covers too
  update games set cover_url = 'https://picsum.photos/seed/rabchik-g' || sort || '/900/500' where cover_url is null;
end $$;

-- more polls (skips ones that already exist)
insert into polls (kind, question, options, max_choices, sort)
select * from (values
  ('single', 'Who will cry first at the vidaai?', '["Bride","Groom","Mother of the bride","Everyone"]'::jsonb, 1, 40),
  ('multi',  'Favourite dish so far?', '["Dal Bati Churma","Pani Puri","Kesar Pista Ice Cream","Live Maggi"]'::jsonb, 2, 50),
  ('rating', 'Rate the decor', '[]'::jsonb, 1, 60)
) v(kind, question, options, max_choices, sort)
where not exists (select 1 from polls p where p.question = v.question);
