-- Mabar on the event page: attendance, walk-ins, substitutes, live scoring, recorded winners.

-- Check-in on the day; only checked-in, active participants get scheduled.
alter table public.gen_participants add column if not exists checked_in boolean not null default true;
-- A substituted player stays (keeps the games already won) but is no longer scheduled.
alter table public.gen_participants add column if not exists active boolean not null default true;

-- Every court of a mabar round is also a `matches` row, so Skor Cepat, ON AIR, the OBS overlay and
-- realtime work the same as for kompetisi. The round's points live on gen_matches.
alter table public.matches add column if not exists gen_match_id uuid references public.gen_matches (id) on delete cascade;
create index if not exists matches_gen_match_idx on public.matches (gen_match_id);

-- Final place of a mabar player (1, 2, 3 …); kompetisi keeps the stage on comp_teams.final_stage.
alter table public.player_awards add column if not exists rank int;

-- Player quota of a mabar (null = no limit).
alter table public.events add column if not exists quota int;
