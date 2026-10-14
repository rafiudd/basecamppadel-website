-- Demo data mirroring the design prototypes. Optional.
insert into public.players (name, gender, level, region, points_adjustment) values
  ('Rayhan',   'M', 'Low Bronze', 'Purwokerto',   210),
  ('Andra',    'M', 'Low Bronze', 'Cilacap',      195),
  ('Pao',      'M', 'Low Bronze', 'Banjarnegara', 180),
  ('Yonathan', 'M', 'Beginner',   'Purbalingga',  165),
  ('Dimas',    'M', 'Beginner',   'Banyumas',     120),
  ('Fikri',    'M', 'Beginner',   'Kebumen',      100),
  ('Sari',     'F', 'Low Bronze', 'Purwokerto',   200),
  ('Nadia',    'F', 'Low Bronze', 'Cilacap',      170),
  ('Rina',     'F', 'Beginner',   'Banjarnegara', 145),
  ('Tasya',    'F', 'Beginner',   'Purbalingga',  110);

update public.players set points = points_adjustment;

insert into public.sessions (tag, title, venue, session_date, time_range, price, whatsapp_url) values
  ('Sesi Padel · Mabar', 'Basecamp Battle #1', 'Padel Hubz', '2026-09-10', '16.00–20.00', 'Rp 50.000', 'https://wa.me/'),
  ('Sesi Padel · Mabar', 'Open Mabar Sabtu',   'Cove Padel', '2026-09-12', '08.00–10.00', 'Rp 50.000', 'https://wa.me/'),
  ('Sesi Padel · Mabar', 'Asah di Basecamp',   'Padel Hubz', '2026-09-13', '17.00–19.00', 'Rp 60.000', 'https://wa.me/');

insert into public.matches (session_label, venue, set_label, team_a_name, team_b_name, team_a_sets, team_b_sets, team_a_game, team_b_game, serve, is_live, status, stream_url)
values ('Basecamp Battle #1', 'Padel Hubz', 'Set 2', 'Rayhan / Andra', 'Pao / Yonathan', '{6,4}', '{3,6}', '40', '15', 'A', true, 'live', 'https://youtube.com/@basecamppadel/live');

-- Courts for the venues created by 0004_venues (3 per venue for dev; a venue that already has courts is skipped).
insert into public.courts (name, venue_id)
select 'Court ' || n, v.id
from public.venues v
cross join generate_series(1, 3) as n
where not exists (select 1 from public.courts c where c.venue_id = v.id)
order by v.name, n;
