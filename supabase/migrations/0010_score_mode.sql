-- Mabar events: how the admin frames "how to win" (label/display only, score entry stays one
-- number per side as before). points_target is reused as the mode's target number (set count,
-- race target, or raw point target).
alter table public.events
  add column if not exists score_mode text not null default 'points'
    check (score_mode in ('best_of', 'race_to', 'points'));
