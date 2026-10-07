-- Several matches of an event can be ON AIR, but at most one per court ("no court" counts as one
-- court). The server actions already switch the court's previous match off (putOnAir in
-- src/app/admin/events/match-actions.ts); this index closes the race of two operators at once.

-- Before the index: keep only the latest ON AIR match per (event, court).
update public.matches m
set is_live = false
where m.is_live
  and m.event_id is not null
  and exists (
    select 1
    from public.matches o
    where o.is_live
      and o.event_id = m.event_id
      and o.court_id is not distinct from m.court_id
      and (o.updated_at, o.id) > (m.updated_at, m.id)
  );

create unique index if not exists matches_one_on_air_per_court
  on public.matches (event_id, coalesce(court_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where is_live and event_id is not null;
