-- Coaching & Penilaian System
-- Rules: .task/penilaian.md & .task/admin-coaching.md

-- 1. Coaches table
create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid references auth.users (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Update admin_users with role & coach reference
alter table public.admin_users
  add column if not exists role text not null default 'admin' check (role in ('admin', 'coach')),
  add column if not exists coach_id uuid references public.coaches (id) on delete set null;

-- Update role checker functions
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_coach()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role = 'coach'
  );
$$;

create or replace function public.has_admin_access()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

-- 3. Master Daftar Teknik (coaching_skills)
create table if not exists public.coaching_skills (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('teknik', 'in_game')),
  category text not null,
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. Sesi Coaching (coaching_sessions)
create table if not exists public.coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  session_date date not null default current_date,
  venue_id uuid references public.venues (id) on delete set null,
  venue_name text not null default '',
  event_id uuid references public.events (id) on delete set null,
  default_skill_ids uuid[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'active', 'finished')),
  created_at timestamptz not null default now()
);

-- 5. Grup Coaching (coaching_groups)
create table if not exists public.coaching_groups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.coaching_sessions (id) on delete cascade,
  name text not null,
  color text not null default '#FFD43B',
  coach_id uuid references public.coaches (id) on delete set null,
  created_at timestamptz not null default now()
);

-- 6. Peserta Sesi Coaching (coaching_session_players)
create table if not exists public.coaching_session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.coaching_sessions (id) on delete cascade,
  group_id uuid references public.coaching_groups (id) on delete set null,
  player_id uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (session_id, player_id)
);

-- 7. Nilai & Evaluasi Coaching (coaching_assessments)
create table if not exists public.coaching_assessments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.coaching_sessions (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  coach_id uuid references public.coaches (id) on delete set null,
  group_id uuid references public.coaching_groups (id) on delete set null,
  scores jsonb not null default '{}',
  active_skill_ids uuid[] not null default '{}',
  evaluation text not null default '',
  next_practice text not null default '',
  published_to_player boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  computed_level text,
  override_level text,
  override_reason text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (session_id, player_id)
);

-- 8. Alter players table for color & override level
alter table public.players
  add column if not exists level_color text not null default '#FFD43B',
  add column if not exists level_overridden boolean not null default false,
  add column if not exists level_override_reason text;

-- Seed default initial 39 master skills (23 teknik + 16 in_game)
insert into public.coaching_skills (type, category, name, sort_order)
select v.type, v.category, v.name, v.sort_order
from (values
  -- Teknik (23)
  ('teknik', 'Groundstroke', 'Forehand', 1),
  ('teknik', 'Groundstroke', 'Backhand', 2),
  ('teknik', 'Servis & return', 'Servis', 3),
  ('teknik', 'Servis & return', 'Return servis', 4),
  ('teknik', 'Di net', 'Volley FH', 5),
  ('teknik', 'Di net', 'Volley BH', 6),
  ('teknik', 'Di net', 'Block', 7),
  ('teknik', 'Di net', 'Dejada (drop volley)', 8),
  ('teknik', 'Overhead', 'Bandeja', 9),
  ('teknik', 'Overhead', 'Víbora', 10),
  ('teknik', 'Overhead', 'Smash datar', 11),
  ('teknik', 'Overhead', 'Smash x3 / x4', 12),
  ('teknik', 'Overhead', 'Rulo', 13),
  ('teknik', 'Overhead', 'Gancho', 14),
  ('teknik', 'Kaca / dinding', 'Backwall FH', 15),
  ('teknik', 'Kaca / dinding', 'Backwall BH', 16),
  ('teknik', 'Kaca / dinding', 'Double glass', 17),
  ('teknik', 'Kaca / dinding', 'Side wall', 18),
  ('teknik', 'Kaca / dinding', 'Bajada', 19),
  ('teknik', 'Kaca / dinding', 'Contrapared', 20),
  ('teknik', 'Pukulan variasi', 'Lob', 21),
  ('teknik', 'Pukulan variasi', 'Chiquita', 22),
  ('teknik', 'Pukulan variasi', 'Passing shot', 23),
  -- In-game (16)
  ('in_game', 'Taktik & strategi', 'Positioning', 24),
  ('in_game', 'Taktik & strategi', 'Transisi nyerang ↔ bertahan', 25),
  ('in_game', 'Taktik & strategi', 'Pemilihan pukulan', 26),
  ('in_game', 'Taktik & strategi', 'Merebut & jaga net', 27),
  ('in_game', 'Taktik & strategi', 'Baca permainan lawan', 28),
  ('in_game', 'Taktik & strategi', 'Variasi tempo', 29),
  ('in_game', 'Kerja sama', 'Komunikasi partner', 30),
  ('in_game', 'Kerja sama', 'Gerak bareng partner', 31),
  ('in_game', 'Kerja sama', 'Bola tengah', 32),
  ('in_game', 'Mental', 'Tenang di poin penting', 33),
  ('in_game', 'Mental', 'Fokus & konsisten', 34),
  ('in_game', 'Mental', 'Bangkit saat ketinggalan', 35),
  ('in_game', 'Mental', 'Sportivitas', 36),
  ('in_game', 'Fisik', 'Footwork / split-step', 37),
  ('in_game', 'Fisik', 'Kelincahan & reaksi', 38),
  ('in_game', 'Fisik', 'Stamina', 39)
) as v(type, category, name, sort_order)
where not exists (select 1 from public.coaching_skills limit 1);

-- Seed initial coaches if none
insert into public.coaches (name)
select v.name
from (values
  ('Lukman'),
  ('Dani'),
  ('Rian')
) as v(name)
where not exists (select 1 from public.coaches limit 1);

-- RLS
alter table public.coaches enable row level security;
alter table public.coaching_skills enable row level security;
alter table public.coaching_sessions enable row level security;
alter table public.coaching_groups enable row level security;
alter table public.coaching_session_players enable row level security;
alter table public.coaching_assessments enable row level security;

-- Policies (dropped first so `npm run db:migrate` can run this file again)
drop policy if exists "coaches_read" on public.coaches;
create policy "coaches_read" on public.coaches for select using (true);
drop policy if exists "coaches_admin_write" on public.coaches;
create policy "coaches_admin_write" on public.coaches for all using (public.is_admin());

drop policy if exists "skills_read" on public.coaching_skills;
create policy "skills_read" on public.coaching_skills for select using (true);
drop policy if exists "skills_admin_write" on public.coaching_skills;
create policy "skills_admin_write" on public.coaching_skills for all using (public.is_admin());

drop policy if exists "sessions_read" on public.coaching_sessions;
create policy "sessions_read" on public.coaching_sessions for select using (true);
drop policy if exists "sessions_admin_write" on public.coaching_sessions;
create policy "sessions_admin_write" on public.coaching_sessions for all using (public.is_admin());

drop policy if exists "groups_read" on public.coaching_groups;
create policy "groups_read" on public.coaching_groups for select using (true);
drop policy if exists "groups_admin_write" on public.coaching_groups;
create policy "groups_admin_write" on public.coaching_groups for all using (public.is_admin());

drop policy if exists "session_players_read" on public.coaching_session_players;
create policy "session_players_read" on public.coaching_session_players for select using (true);
drop policy if exists "session_players_admin_write" on public.coaching_session_players;
create policy "session_players_admin_write" on public.coaching_session_players for all using (public.is_admin());

drop policy if exists "assessments_read" on public.coaching_assessments;
create policy "assessments_read" on public.coaching_assessments for select using (
  published_to_player = true or public.has_admin_access()
);
drop policy if exists "assessments_admin_write" on public.coaching_assessments;
create policy "assessments_admin_write" on public.coaching_assessments for all using (
  public.has_admin_access()
);
