-- "Livestream tanpa event": an ON AIR match with event_id = null (already schema-valid — matches.event_id
-- has been nullable since 0001/0005). The one-match-ON-AIR-per-court guard in 0008 only covered matches
-- that belong to an event; this adds the matching guard for event-less ones.
create unique index if not exists matches_one_on_air_per_court_freeform
  on public.matches (coalesce(court_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where is_live and event_id is null;
