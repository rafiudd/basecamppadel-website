-- Scheduled start/end time for a match, so the overlay/live card can show a clock
-- ("Starting Soon · 16:00") independent of the elapsed-time stopwatch.
alter table public.matches add column if not exists starts_at timestamptz;
alter table public.matches add column if not exists ends_at timestamptz;
