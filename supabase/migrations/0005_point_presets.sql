-- Point Presets: Mabar & Competition point configuration presets
create table if not exists public.point_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  rules jsonb not null default '{"mabar":[],"kompetisi":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.point_presets enable row level security;
drop policy if exists "point_presets public read" on public.point_presets;
create policy "point_presets public read" on public.point_presets for select using (true);
drop policy if exists "point_presets admin write" on public.point_presets;
create policy "point_presets admin write" on public.point_presets for all using (public.is_admin()) with check (public.is_admin());

-- Seed default presets if none exist
insert into public.point_presets (name, is_default, rules)
select 'Standar', true, '{
  "mabar": [
    {"id": "m1", "name": "Juara 1", "desc": "Posisi 1 klasemen akhir", "points": 30, "checked": true},
    {"id": "m2", "name": "Juara 2", "desc": "Posisi 2 klasemen akhir", "points": 20, "checked": true},
    {"id": "m3", "name": "Juara 3", "desc": "Posisi 3 klasemen akhir", "points": 10, "checked": true},
    {"id": "m4", "name": "Ikut serta", "desc": "Semua peserta lain yang main sampai selesai", "points": 5, "checked": true}
  ],
  "kompetisi": [
    {"id": "k1", "name": "Ikut fase grup", "desc": "Semua tim peserta", "points": 5, "checked": true},
    {"id": "k2", "name": "Lolos grup / 8 besar", "desc": "Masuk babak knockout", "points": 15, "checked": true},
    {"id": "k3", "name": "Semifinal", "desc": "Kalah di semifinal", "points": 30, "checked": true},
    {"id": "k4", "name": "Runner-up", "desc": "Kalah di final", "points": 50, "checked": true},
    {"id": "k5", "name": "Juara", "desc": "Menang final", "points": 80, "checked": true}
  ]
}'::jsonb
where not exists (select 1 from public.point_presets where name = 'Standar');

insert into public.point_presets (name, is_default, rules)
select 'Turnamen besar', true, '{
  "mabar": [
    {"id": "m1", "name": "Juara 1", "desc": "Posisi 1 klasemen akhir", "points": 50, "checked": true},
    {"id": "m2", "name": "Juara 2", "desc": "Posisi 2 klasemen akhir", "points": 35, "checked": true},
    {"id": "m3", "name": "Juara 3", "desc": "Posisi 3 klasemen akhir", "points": 20, "checked": true},
    {"id": "m4", "name": "Ikut serta", "desc": "Semua peserta lain yang main sampai selesai", "points": 10, "checked": true}
  ],
  "kompetisi": [
    {"id": "k1", "name": "Ikut fase grup", "desc": "Semua tim peserta", "points": 10, "checked": true},
    {"id": "k2", "name": "Lolos grup / 8 besar", "desc": "Masuk babak knockout", "points": 30, "checked": true},
    {"id": "k3", "name": "Semifinal", "desc": "Kalah di semifinal", "points": 60, "checked": true},
    {"id": "k4", "name": "Runner-up", "desc": "Kalah di final", "points": 100, "checked": true},
    {"id": "k5", "name": "Juara", "desc": "Menang final", "points": 160, "checked": true}
  ]
}'::jsonb
where not exists (select 1 from public.point_presets where name = 'Turnamen besar');
