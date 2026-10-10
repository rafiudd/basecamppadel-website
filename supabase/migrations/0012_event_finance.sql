-- Court rental pricing (per venue, with a per-day-of-week prime-time window) and a lightweight
-- budget per event: an auto-computed court-rental expense + registration income, plus manual
-- expense/income line items an admin can add (balls, extra income, etc).

alter table public.venues
  add column if not exists price_per_hour numeric not null default 0;

-- One row per venue per day of week (0 = Sunday .. 6 = Saturday, matching JS Date#getDay()).
-- `active = false` means that day has no prime-time window — the whole day uses the venue's base rate.
create table if not exists public.venue_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  active boolean not null default false,
  start_time time not null default '17:00',
  end_time time not null default '22:00',
  price_per_hour numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (venue_id, day_of_week)
);

alter table public.venue_pricing_rules enable row level security;
drop policy if exists "venue_pricing_rules admin only" on public.venue_pricing_rules;
create policy "venue_pricing_rules admin only" on public.venue_pricing_rules for all using (public.is_admin()) with check (public.is_admin());

alter table public.events
  add column if not exists duration_hours numeric not null default 2,
  add column if not exists price_amount numeric not null default 0;

create table if not exists public.event_transactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  label text not null,
  amount numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.event_transactions enable row level security;
drop policy if exists "event_transactions admin only" on public.event_transactions;
create policy "event_transactions admin only" on public.event_transactions for all using (public.is_admin()) with check (public.is_admin());
