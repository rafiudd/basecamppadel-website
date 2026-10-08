-- Allow public read access to generator tables used by public mabar events.
drop policy if exists "gen_events public read" on public.gen_events;
create policy "gen_events public read" on public.gen_events for select using (true);

drop policy if exists "gen_participants public read" on public.gen_participants;
create policy "gen_participants public read" on public.gen_participants for select using (true);

drop policy if exists "gen_rounds public read" on public.gen_rounds;
create policy "gen_rounds public read" on public.gen_rounds for select using (true);

drop policy if exists "gen_matches public read" on public.gen_matches;
create policy "gen_matches public read" on public.gen_matches for select using (true);
