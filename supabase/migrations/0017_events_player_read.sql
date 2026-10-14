-- A player can read the events they took part in (an award or a recorded match), even when the event
-- isn't published on the public schedule, so "Riwayat event" on their profile can show its title and
-- date. Policies are OR'ed with "events public read" (published or admin).
drop policy if exists "events own read" on public.events;
create policy "events own read" on public.events for select using (
  exists (select 1 from public.player_awards a where a.event_id = events.id and public.is_my_player(a.player_id))
  or exists (
    select 1 from public.matches m
    join public.match_history h on h.match_id = m.id
    where m.event_id = events.id and public.is_my_player(h.player_id)
  )
);
