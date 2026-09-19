-- =====================================================================
-- Starter data from the wedding plan (edit anything later from the admin screens)
-- Run AFTER schema.sql
-- =====================================================================
insert into events (title, event_date, time_label, venue, maps_url, dress_code, theme_label, theme_colors, expect, menu_items, sort) values
('Guest Arrival', '2026-12-09', 'Evening', 'Gulmohar Hall', 'https://maps.app.goo.gl/7D9BzL3FJKqoQxL7', null, 'Welcome', '{"#DCE8D5","#A9C4A4"}',
  'Check in, meet the family and settle in. Ask the front desk if you cannot find your room.', '[]', 10),

('Lagan / Teeka', '2026-12-10', 'Morning', 'Riddhi Resorts', 'https://maps.app.goo.gl/7D9BzL3FJKqoQxL7', 'No specific code', 'Gold', '{"#F4DE94","#C9A227"}',
  null,
  '[{"name":"Poha"},{"name":"Kadhi Pakora"},{"name":"Raj Bhogh"},{"name":"Kesar Pista Ice Cream"}]', 20),

('Sangeet Night', '2026-12-10', 'Evening', 'Riddhi Resorts', 'https://maps.app.goo.gl/7D9BzL3FJKqoQxL7', 'Western', 'Purple', '{"#B79CF5","#5B21B6"}',
  'Dance performances and live music. Open dance floor with a DJ.',
  '[{"name":"Pani Puri"},{"name":"Chole Kulche"},{"name":"Malai Roll"},{"name":"Rabadi Malpua"}]', 30),

('Haldi', '2026-12-11', 'Morning', 'Riddhi Resorts', 'https://maps.app.goo.gl/7D9BzL3FJKqoQxL7', 'South Indian', 'Yellow', '{"#FFEB85","#F5B700"}',
  null,
  '[{"name":"Bread Pakoda"},{"name":"Dal Bati Churma"},{"name":"Pani Puri"},{"name":"Baked Malpua"}]', 40),

('Wedding & Reception', '2026-12-11', 'Evening', 'Riddhi Resorts', 'https://maps.app.goo.gl/7D9BzL3FJKqoQxL7', 'Indian', 'Maroon & Gold', '{"#C8465F","#7A0F2B"}',
  null,
  '[{"name":"Paneer Lababdar"},{"name":"Saanjh Savera Kofta"},{"name":"Live Kalakand"},{"name":"Stuffed Gulab Jamun"}]', 50),

('Phere Night', '2026-12-11', 'Late night', 'Riddhi Resorts', 'https://maps.app.goo.gl/7D9BzL3FJKqoQxL7', null, 'Ember', '{"#FFB27A","#D9480F"}',
  'Late-night food stalls: live Maggi, chai, gajak, pakode and more.',
  '[{"name":"Live Maggi"},{"name":"Chai"},{"name":"Gajak"},{"name":"Pakode"}]', 60),

('Farewell Breakfast', '2026-12-12', 'Morning', 'Riddhi Resorts', 'https://maps.app.goo.gl/7D9BzL3FJKqoQxL7', null, 'Sunrise', '{"#FFE0BD","#F4A98C"}',
  null,
  '[{"name":"Aloo Paratha"},{"name":"Chai"},{"name":"Fruits"},{"name":"Salad"}]', 70);

insert into polls (kind, question, options, max_choices, sort) values
('single', 'Where did Saurabh & Anushika first meet?', '["College","Through friends","At work"]', 1, 10),
('multi',  'Which songs must the DJ play?', '["London Thumakda","Morni Banke","Gallan Goodiyan","Kala Chashma"]', 2, 20),
('rating', 'Rate the Sangeet performance', '[]', 1, 30);

insert into games (title, description, status, sort) values
('Wedding Bingo', 'Coming soon', 'soon', 10),
('Couple Trivia', 'Coming soon', 'soon', 20);
