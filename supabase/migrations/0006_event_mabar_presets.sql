-- Event Mabar + point presets on events.
-- A mabar event keeps its rounds, pairings and per-player points in the generator tables (gen_*),
-- linked through events.gen_event_id. Both event types remember which point preset they were made with.

alter table public.events add column if not exists mabar_format text
  check (mabar_format in ('americano', 'mexicano', 'fixed_americano', 'fixed_mexicano'));
alter table public.events add column if not exists points_target int not null default 24;
alter table public.events add column if not exists rounds int not null default 7;
alter table public.events add column if not exists gen_event_id uuid references public.gen_events (id) on delete set null;
alter table public.events add column if not exists point_preset_id uuid references public.point_presets (id) on delete set null;

-- Mabar leaderboard points: ranks[i] for final position i + 1, participant for everyone else who played.
alter table public.events add column if not exists mabar_points jsonb not null default '{"ranks": [30, 20, 10], "participant": 5}';
