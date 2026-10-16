-- Leagues & Volumes: Multi-event tournament series with unified standings.
-- Each volume corresponds to an event of type 'kompetisi'.
-- Standings aggregate points across volumes for each participating player.

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  organizer text not null default '',
  description text not null default '',
  total_volumes int not null default 3 check (total_volumes >= 1 and total_volumes <= 10),
  point_preset_id uuid references public.point_presets(id) on delete set null,
  points jsonb not null default '{"champion": 25, "runner_up": 20, "sf": 15, "qf": 5, "r16": 1, "group": 1}'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.league_volumes (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  volume_number int not null check (volume_number >= 1),
  is_final boolean not null default false,
  event_id uuid references public.events(id) on delete set null,
  approx_date text not null default '',
  created_at timestamptz not null default now(),
  unique (league_id, volume_number),
  unique (event_id)
);

create index if not exists league_volumes_league_idx on public.league_volumes(league_id);
create index if not exists league_volumes_event_idx on public.league_volumes(event_id);

-- Link events to league
alter table public.events add column if not exists league_id uuid references public.leagues(id) on delete set null;
alter table public.events add column if not exists league_volume_id uuid references public.league_volumes(id) on delete set null;
alter table public.events add column if not exists volume_number int;

-- RLS
alter table public.leagues enable row level security;
drop policy if exists "leagues public read" on public.leagues;
create policy "leagues public read" on public.leagues for select using (true);
drop policy if exists "leagues admin write" on public.leagues;
create policy "leagues admin write" on public.leagues for all using (public.is_admin()) with check (public.is_admin());

alter table public.league_volumes enable row level security;
drop policy if exists "league_volumes public read" on public.league_volumes;
create policy "league_volumes public read" on public.league_volumes for select using (true);
drop policy if exists "league_volumes admin write" on public.league_volumes;
create policy "league_volumes admin write" on public.league_volumes for all using (public.is_admin()) with check (public.is_admin());

-- Seed preset "East League" if not exists
insert into public.point_presets (name, is_default, rules)
select 'East League', false, '{
  "mabar": [],
  "kompetisi": [
    {"id": "k1", "name": "Partisipasi", "desc": "Ikut fase grup", "points": 1, "checked": true},
    {"id": "k2", "name": "8 besar", "desc": "Quarterfinalist", "points": 5, "checked": true},
    {"id": "k3", "name": "Semifinal", "desc": "Semifinalist", "points": 15, "checked": true},
    {"id": "k4", "name": "Runner-up", "desc": "Kalah di final", "points": 20, "checked": true},
    {"id": "k5", "name": "Champion", "desc": "Juara", "points": 25, "checked": true}
  ]
}'::jsonb
where not exists (select 1 from public.point_presets where name = 'East League');
