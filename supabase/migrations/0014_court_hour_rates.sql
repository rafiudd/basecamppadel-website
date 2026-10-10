-- Court rental pricing moves from venue-level (0012/0013) to court-level: real venues often charge
-- different rates per court (indoor vs outdoor, VIP court, etc). The admin "Harga prime time" grid
-- still only needs filling in once when a venue's courts share the same price — it now takes a list
-- of courts to apply the same grid to in one save, instead of being implicitly venue-wide.
alter table public.courts
  add column if not exists price_per_hour numeric not null default 0;

alter table public.venues
  drop column if exists price_per_hour;

drop table if exists public.venue_hour_rates;

create table if not exists public.court_hour_rates (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  hour smallint not null check (hour between 0 and 23),
  price_per_hour numeric not null,
  created_at timestamptz not null default now(),
  unique (court_id, day_of_week, hour)
);

alter table public.court_hour_rates enable row level security;
drop policy if exists "court_hour_rates admin only" on public.court_hour_rates;
create policy "court_hour_rates admin only" on public.court_hour_rates for all using (public.is_admin()) with check (public.is_admin());
