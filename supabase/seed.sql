-- Demo data mirroring the design prototypes. Optional.
insert into public.players (name, gender, level, region, points_adjustment) values
  ('Rayhan',   'M', 'Intermediate',   'Purwokerto',   210),
  ('Andra',    'M', 'Intermediate',   'Cilacap',      195),
  ('Pao',      'M', 'Intermediate',   'Banjarnegara', 180),
  ('Yonathan', 'M', 'Upper Beginner', 'Purbalingga',  165),
  ('Dimas',    'M', 'Beginner',       'Banyumas',     120),
  ('Fikri',    'M', 'Beginner',       'Kebumen',      100),
  ('Sari',     'F', 'Intermediate',   'Purwokerto',   200),
  ('Nadia',    'F', 'Intermediate',   'Cilacap',      170),
  ('Rina',     'F', 'Upper Beginner', 'Banjarnegara', 145),
  ('Tasya',    'F', 'Beginner',       'Purbalingga',  110);

update public.players set points = points_adjustment;

insert into public.sessions (tag, title, venue, session_date, time_range, price, whatsapp_url) values
  ('Sesi Padel · Mabar', 'Basecamp Battle #1', 'Padel Hubz', '2026-09-10', '16.00–20.00', 'Rp 50.000', 'https://wa.me/'),
  ('Sesi Padel · Mabar', 'Open Mabar Sabtu',   'Cove Padel', '2026-09-12', '08.00–10.00', 'Rp 50.000', 'https://wa.me/'),
  ('Sesi Padel · Mabar', 'Asah di Basecamp',   'Padel Hubz', '2026-09-13', '17.00–19.00', 'Rp 60.000', 'https://wa.me/');

insert into public.matches (session_label, venue, set_label, team_a_name, team_b_name, team_a_sets, team_b_sets, team_a_game, team_b_game, serve, is_live, status, stream_url)
values ('Basecamp Battle #1', 'Padel Hubz', 'Set 2', 'Rayhan / Andra', 'Pao / Yonathan', '{6,4}', '{3,6}', '40', '15', 'A', true, 'live', 'https://youtube.com/@basecamppadel/live');
