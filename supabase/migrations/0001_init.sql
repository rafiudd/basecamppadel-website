-- Basecamp Padel — initial schema
-- Run in the Supabase SQL editor (or `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Admin gate
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gender text not null check (gender in ('M', 'F')),
  level text not null default 'Beginner',
  region text not null default '',
  photo_url text,
  points int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  points_adjustment int not null default 0, -- manual correction added on top of computed points
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  tag text not null default 'Sesi Padel · Mabar',
  title text not null,
  venue text not null,
  session_date date not null,
  time_range text not null default '',
  price text not null default '',
  slots int,
  whatsapp_url text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions (id) on delete set null,
  session_label text not null default '',
  venue text not null default '',
  set_label text not null default 'Set 1',
  team_a_name text not null default 'Team A',
  team_b_name text not null default 'Team B',
  team_a_player_ids uuid[] not null default '{}',
  team_b_player_ids uuid[] not null default '{}',
  team_a_sets int[] not null default '{0,0}',
  team_b_sets int[] not null default '{0,0}',
  team_a_game text not null default '0',
  team_b_game text not null default '0',
  serve text not null default 'A' check (serve in ('A', 'B')),
  is_live boolean not null default false,
  stream_url text,
  timer_running boolean not null default false,
  timer_start timestamptz,
  timer_base_seconds int not null default 0,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished')),
  winner text check (winner in ('A', 'B')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_history (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches (id) on delete set null,
  player_id uuid not null references public.players (id) on delete cascade,
  session_label text not null default '',
  opponent_label text not null default '',
  result text not null check (result in ('W', 'L')),
  points_delta int not null default 0,
  stream_url text,
  created_at timestamptz not null default now()
);

create index if not exists match_history_player_idx on public.match_history (player_id, created_at desc);
create index if not exists sessions_date_idx on public.sessions (session_date);
create index if not exists matches_live_idx on public.matches (is_live) where is_live;

-- updated_at bookkeeping
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists matches_set_updated_at on public.matches;
create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Stats: points/wins/losses derive from match_history (+ manual adjustment)
-- ---------------------------------------------------------------------------
create or replace function public.recompute_player_stats(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.players p
  set
    wins   = coalesce((select count(*) from public.match_history h where h.player_id = p.id and h.result = 'W'), 0),
    losses = coalesce((select count(*) from public.match_history h where h.player_id = p.id and h.result = 'L'), 0),
    points = greatest(0, coalesce((select sum(points_delta) from public.match_history h where h.player_id = p.id), 0) + p.points_adjustment)
  where p.id = p_player_id;
end $$;

create or replace function public.match_history_recompute()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_player_stats(old.player_id);
    return old;
  end if;
  perform public.recompute_player_stats(new.player_id);
  if tg_op = 'UPDATE' and old.player_id <> new.player_id then
    perform public.recompute_player_stats(old.player_id);
  end if;
  return new;
end $$;

drop trigger if exists match_history_recompute on public.match_history;
create trigger match_history_recompute
  after insert or update or delete on public.match_history
  for each row execute function public.match_history_recompute();

create or replace function public.players_adjustment_recompute()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.points_adjustment is distinct from old.points_adjustment then
    perform public.recompute_player_stats(new.id);
  end if;
  return new;
end $$;

drop trigger if exists players_adjustment_recompute on public.players;
create trigger players_adjustment_recompute
  after update of points_adjustment on public.players
  for each row execute function public.players_adjustment_recompute();

-- ---------------------------------------------------------------------------
-- Finalize a match: mark finished, write history rows for every linked player
-- ---------------------------------------------------------------------------
create or replace function public.finalize_match(
  p_match_id uuid,
  p_winner text,
  p_win_points int default 15,
  p_loss_points int default -5
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.matches%rowtype;
  pid uuid;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if p_winner not in ('A', 'B') then
    raise exception 'winner must be A or B';
  end if;

  select * into m from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'match not found';
  end if;
  if m.status = 'finished' then
    raise exception 'match already finalized';
  end if;

  foreach pid in array m.team_a_player_ids loop
    insert into public.match_history (match_id, player_id, session_label, opponent_label, result, points_delta, stream_url)
    values (m.id, pid, m.session_label, m.team_b_name,
            case when p_winner = 'A' then 'W' else 'L' end,
            case when p_winner = 'A' then p_win_points else p_loss_points end,
            m.stream_url);
  end loop;

  foreach pid in array m.team_b_player_ids loop
    insert into public.match_history (match_id, player_id, session_label, opponent_label, result, points_delta, stream_url)
    values (m.id, pid, m.session_label, m.team_a_name,
            case when p_winner = 'B' then 'W' else 'L' end,
            case when p_winner = 'B' then p_win_points else p_loss_points end,
            m.stream_url);
  end loop;

  update public.matches
  set status = 'finished', is_live = false, timer_running = false, winner = p_winner
  where id = m.id;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.admin_users   enable row level security;
alter table public.players       enable row level security;
alter table public.sessions      enable row level security;
alter table public.matches       enable row level security;
alter table public.match_history enable row level security;

-- admin_users: a user may read their own row (used by is_admin via security definer anyway)
drop policy if exists "admin_users self read" on public.admin_users;
create policy "admin_users self read" on public.admin_users
  for select using (user_id = auth.uid());

-- players
drop policy if exists "players public read" on public.players;
create policy "players public read" on public.players
  for select using (active or public.is_admin());
drop policy if exists "players admin write" on public.players;
create policy "players admin write" on public.players
  for all using (public.is_admin()) with check (public.is_admin());

-- sessions
drop policy if exists "sessions public read" on public.sessions;
create policy "sessions public read" on public.sessions
  for select using (published or public.is_admin());
drop policy if exists "sessions admin write" on public.sessions;
create policy "sessions admin write" on public.sessions
  for all using (public.is_admin()) with check (public.is_admin());

-- matches (public needs to read the live row for Home + overlay)
drop policy if exists "matches public read" on public.matches;
create policy "matches public read" on public.matches
  for select using (true);
drop policy if exists "matches admin write" on public.matches;
create policy "matches admin write" on public.matches
  for all using (public.is_admin()) with check (public.is_admin());

-- match_history
drop policy if exists "history public read" on public.match_history;
create policy "history public read" on public.match_history
  for select using (true);
drop policy if exists "history admin write" on public.match_history;
create policy "history admin write" on public.match_history
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Realtime on matches
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;
end $$;
alter table public.matches replica identity full;

-- ---------------------------------------------------------------------------
-- Storage bucket for player cutout photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('players', 'players', true)
on conflict (id) do nothing;

drop policy if exists "players bucket public read" on storage.objects;
create policy "players bucket public read" on storage.objects
  for select using (bucket_id = 'players');
drop policy if exists "players bucket admin write" on storage.objects;
create policy "players bucket admin write" on storage.objects
  for all using (bucket_id = 'players' and public.is_admin())
  with check (bucket_id = 'players' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Make yourself an admin (run after signing up in Supabase Auth):
--   insert into public.admin_users (user_id)
--   select id from auth.users where email = 'you@example.com';
-- ---------------------------------------------------------------------------
