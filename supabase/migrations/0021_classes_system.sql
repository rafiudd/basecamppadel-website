-- Basecamp Padel — Kelas (Padel Academy & Clinic) System
-- Mockup: docs/UI/kelas/
-- Plan: docs/fitur-kelas.md

-- 1. Ensure Coaches (Lukman, Reyhan, Adit) exist
insert into public.coaches (name)
values ('Lukman'), ('Reyhan'), ('Adit')
on conflict do nothing;

-- 2. Master Kelas (Classes)
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text not null check (category in ('dasar', 'teknik', 'taktik', 'mf', 'khusus')),
  description text not null default '',
  suitable_pins text[] not null default '{}',
  video_url text,
  cover_image_url text,
  gallery_urls text[] not null default '{}',
  total_sessions int not null default 1,
  duration_per_session int not null default 90,
  capacity int not null default 4,
  price int not null default 0,
  default_coach_id uuid references public.coaches (id) on delete set null,
  min_participants int not null default 2,
  learning_points text[] not null default '{}',
  sessions_breakdown jsonb not null default '[]'::jsonb,
  requirements text[] not null default '{}',
  published boolean not null default false,
  is_new boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Jadwal Kelas (Class Schedules)
create table if not exists public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  coach_id uuid references public.coaches (id) on delete set null,
  venue_id uuid references public.venues (id) on delete set null,
  dates_label text not null,
  time_range text not null,
  start_date date not null default current_date,
  custom_capacity int,
  status text not null default 'active' check (status in ('active', 'full', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- 4. Peserta Jadwal Kelas (Class Participants)
create table if not exists public.class_participants (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.class_schedules (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  player_id uuid references public.players (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  phone text not null default '',
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'refunded', 'cancelled')),
  attendance jsonb not null default '{}'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- 5. Tanya Jawab & Komentar (Class Comments)
create table if not exists public.class_comments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  player_id uuid references public.players (id) on delete set null,
  author_name text not null,
  comment text not null,
  parent_id uuid references public.class_comments (id) on delete cascade,
  coach_id uuid references public.coaches (id) on delete set null,
  is_coach_reply boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- 6. Ulasan & Rating Peserta (Class Reviews)
create table if not exists public.class_reviews (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  schedule_id uuid references public.class_schedules (id) on delete set null,
  participant_id uuid references public.class_participants (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  player_id uuid references public.players (id) on delete set null,
  author_name text not null,
  rating int not null check (rating >= 1 and rating <= 5),
  content text not null,
  coach_reply text,
  coach_reply_at timestamptz,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists classes_slug_idx on public.classes (slug);
create index if not exists classes_category_idx on public.classes (category);
create index if not exists classes_published_idx on public.classes (published);
create index if not exists class_schedules_class_id_idx on public.class_schedules (class_id);
create index if not exists class_schedules_start_date_idx on public.class_schedules (start_date);
create index if not exists class_participants_schedule_id_idx on public.class_participants (schedule_id);
create index if not exists class_participants_class_id_idx on public.class_participants (class_id);
create index if not exists class_comments_class_id_idx on public.class_comments (class_id);
create index if not exists class_reviews_class_id_idx on public.class_reviews (class_id);

-- RLS Enablement
alter table public.classes enable row level security;
alter table public.class_schedules enable row level security;
alter table public.class_participants enable row level security;
alter table public.class_comments enable row level security;
alter table public.class_reviews enable row level security;

-- Policies for classes
drop policy if exists "classes_public_read" on public.classes;
create policy "classes_public_read" on public.classes
  for select using (published = true or public.has_admin_access());

drop policy if exists "classes_admin_all" on public.classes;
create policy "classes_admin_all" on public.classes
  for all using (public.has_admin_access()) with check (public.has_admin_access());

-- Policies for class_schedules
drop policy if exists "class_schedules_public_read" on public.class_schedules;
create policy "class_schedules_public_read" on public.class_schedules
  for select using (
    exists (
      select 1 from public.classes c
      where c.id = class_id and (c.published = true or public.has_admin_access())
    )
  );

drop policy if exists "class_schedules_admin_all" on public.class_schedules;
create policy "class_schedules_admin_all" on public.class_schedules
  for all using (public.has_admin_access()) with check (public.has_admin_access());

-- Policies for class_participants
drop policy if exists "class_participants_admin_all" on public.class_participants;
create policy "class_participants_admin_all" on public.class_participants
  for all using (public.has_admin_access()) with check (public.has_admin_access());

drop policy if exists "class_participants_user_read" on public.class_participants;
create policy "class_participants_user_read" on public.class_participants
  for select using (user_id = auth.uid() or public.has_admin_access());

drop policy if exists "class_participants_insert" on public.class_participants;
create policy "class_participants_insert" on public.class_participants
  for insert with check (true);

-- Policies for class_comments
drop policy if exists "class_comments_public_read" on public.class_comments;
create policy "class_comments_public_read" on public.class_comments
  for select using (hidden = false or public.has_admin_access());

drop policy if exists "class_comments_public_insert" on public.class_comments;
create policy "class_comments_public_insert" on public.class_comments
  for insert with check (true);

drop policy if exists "class_comments_admin_all" on public.class_comments;
create policy "class_comments_admin_all" on public.class_comments
  for all using (public.has_admin_access()) with check (public.has_admin_access());

-- Policies for class_reviews
drop policy if exists "class_reviews_public_read" on public.class_reviews;
create policy "class_reviews_public_read" on public.class_reviews
  for select using (hidden = false or public.has_admin_access());

drop policy if exists "class_reviews_public_insert" on public.class_reviews;
create policy "class_reviews_public_insert" on public.class_reviews
  for insert with check (true);

drop policy if exists "class_reviews_admin_all" on public.class_reviews;
create policy "class_reviews_admin_all" on public.class_reviews
  for all using (public.has_admin_access()) with check (public.has_admin_access());
