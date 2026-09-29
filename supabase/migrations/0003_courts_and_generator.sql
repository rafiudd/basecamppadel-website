  -- Courts (separate entity so Live Match / Skor Cepat can group by court)
  create table if not exists public.courts (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    venue text not null default '',
    active boolean not null default true,
    created_at timestamptz not null default now()
  );

  alter table public.matches add column if not exists court_id uuid references public.courts(id) on delete set null;

  alter table public.courts enable row level security;
  drop policy if exists "courts public read" on public.courts;
  create policy "courts public read" on public.courts for select using (true);
  drop policy if exists "courts admin write" on public.courts;
  create policy "courts admin write" on public.courts for all using (public.is_admin()) with check (public.is_admin());

  -- ---------------------------------------------------------------------------
  -- Match generator: Americano / Mexicano / Fixed Partner variants.
  -- Separate from `matches` (no sets/game/serve/OBS overlay) — a roster + round
  -- pairing + simple point-per-round tool for mabar/social play days.
  -- ---------------------------------------------------------------------------
  create table if not exists public.gen_events (
    id uuid primary key default gen_random_uuid(),
    title text not null default '',
    format text not null check (format in ('americano', 'mexicano', 'fixed_americano', 'fixed_mexicano')),
    points_target int not null default 24,
    court_ids uuid[] not null default '{}',
    status text not null default 'draft' check (status in ('draft', 'active', 'finished')),
    sync_to_leaderboard boolean not null default false,
    created_at timestamptz not null default now()
  );

  create table if not exists public.gen_participants (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.gen_events(id) on delete cascade,
    player_id uuid references public.players(id) on delete set null,
    display_name text not null default '',
    team_no int,
    total_points int not null default 0,
    sits_out_count int not null default 0,
    created_at timestamptz not null default now()
  );

  create table if not exists public.gen_rounds (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.gen_events(id) on delete cascade,
    round_no int not null,
    created_at timestamptz not null default now(),
    unique (event_id, round_no)
  );

  create table if not exists public.gen_matches (
    id uuid primary key default gen_random_uuid(),
    round_id uuid not null references public.gen_rounds(id) on delete cascade,
    court_id uuid references public.courts(id) on delete set null,
    team_a_participant_ids uuid[] not null default '{}',
    team_b_participant_ids uuid[] not null default '{}',
    team_a_points int,
    team_b_points int,
    created_at timestamptz not null default now()
  );

  create index if not exists gen_participants_event_idx on public.gen_participants (event_id);
  create index if not exists gen_rounds_event_idx on public.gen_rounds (event_id);
  create index if not exists gen_matches_round_idx on public.gen_matches (round_id);

  alter table public.gen_events enable row level security;
  alter table public.gen_participants enable row level security;
  alter table public.gen_rounds enable row level security;
  alter table public.gen_matches enable row level security;

  drop policy if exists "gen_events admin only" on public.gen_events;
  create policy "gen_events admin only" on public.gen_events for all using (public.is_admin()) with check (public.is_admin());
  drop policy if exists "gen_participants admin only" on public.gen_participants;
  create policy "gen_participants admin only" on public.gen_participants for all using (public.is_admin()) with check (public.is_admin());
  drop policy if exists "gen_rounds admin only" on public.gen_rounds;
  create policy "gen_rounds admin only" on public.gen_rounds for all using (public.is_admin()) with check (public.is_admin());
  drop policy if exists "gen_matches admin only" on public.gen_matches;
  create policy "gen_matches admin only" on public.gen_matches for all using (public.is_admin()) with check (public.is_admin());
