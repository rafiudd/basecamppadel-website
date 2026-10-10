-- Replaces the single "one prime-time window per day" rule (0012) with a per-hour price grid: an
-- admin can set a specific rate for any (day of week, hour) cell, left blank to just use the venue's
-- base rate (venues.price_per_hour). Nothing had been configured through the old table yet, so it's
-- dropped outright rather than migrated.
drop table if exists public.venue_pricing_rules;

create table if not exists public.venue_hour_rates (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  hour smallint not null check (hour between 0 and 23),
  price_per_hour numeric not null,
  created_at timestamptz not null default now(),
  unique (venue_id, day_of_week, hour)
);

alter table public.venue_hour_rates enable row level security;
drop policy if exists "venue_hour_rates admin only" on public.venue_hour_rates;
create policy "venue_hour_rates admin only" on public.venue_hour_rates for all using (public.is_admin()) with check (public.is_admin());
