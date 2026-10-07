-- Venues as a proper entity (1 venue can have many courts).
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.venues enable row level security;
drop policy if exists "venues public read" on public.venues;
create policy "venues public read" on public.venues for select using (true);
drop policy if exists "venues admin write" on public.venues;
create policy "venues admin write" on public.venues for all using (public.is_admin()) with check (public.is_admin());

-- Courts: switch from free-text `venue` to a `venue_id` FK.
alter table public.courts add column if not exists venue_id uuid references public.venues(id) on delete set null;

-- One-time conversion, only while courts.venue still exists, so `npm run db:migrate` can re-run this
-- file (the column is gone after the first run, and venues deleted since must not be re-seeded).
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'courts' and column_name = 'venue') then
    -- Seed with the venues already used across the app.
    insert into public.venues (name)
    values ('Padel Hubz'), ('Rita Padel Club'), ('Purwokerto Padel Club'), ('Pine Sports'), ('East Padel Club'), ('Social Padel'), ('Cove Padel')
    on conflict (name) do nothing;

    update public.courts c
    set venue_id = v.id
    from public.venues v
    where c.venue_id is null and c.venue = v.name;

    -- Any existing court venue text that didn't match a seeded venue becomes its own venue row.
    insert into public.venues (name)
    select distinct c.venue from public.courts c
    where c.venue_id is null and c.venue is not null and c.venue <> ''
    on conflict (name) do nothing;

    update public.courts c
    set venue_id = v.id
    from public.venues v
    where c.venue_id is null and c.venue = v.name;

    alter table public.courts drop column venue;
  end if;
end $$;
