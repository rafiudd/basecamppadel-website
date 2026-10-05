-- Event Kompetisi: fixed pairs, group stage round robin, top N advance, knockout to the final.
-- Matches reuse public.matches (score control, quick score, OBS overlay, realtime all work as-is).
-- Rules: TASK_EVENT_KOMPETISI.md. Pure logic (standings, seeding, scheduling): src/lib/competition.ts.

-- ---------------------------------------------------------------------------
-- Events (shared entity; only type 'kompetisi' is used for now)
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  type text not null default 'kompetisi' check (type in ('mabar', 'kompetisi')),
  title text not null,
  description text not null default '',
  event_date date,
  start_time time,
  venue_id uuid references public.venues (id) on delete set null,
  court_ids uuid[] not null default '{}',
  price text not null default '',
  whatsapp_url text,
  num_teams int not null default 6,
  num_groups int not null default 2,
  advance_per_group int not null default 2,
  ko_start text not null default 'sf' check (ko_start in ('r16', 'qf', 'sf', 'final')),
  match_minutes int not null default 20,
  -- leaderboard points per final stage, given to each player of the team (until the Point task adds presets)
  points jsonb not null default '{"champion": 80, "runner_up": 50, "sf": 30, "qf": 15, "r16": 10, "group": 5}',
  published boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'active', 'finished')),
  bracket_generated boolean not null default false,
  bracket_stale boolean not null default false, -- a group score was corrected after the bracket was built
  draw_seed int not null default floor(random() * 1000000)::int, -- "undian" tiebreak
  created_at timestamptz not null default now()
);

create table if not exists public.comp_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  group_label text,
  final_stage text check (final_stage in ('champion', 'runner_up', 'sf', 'qf', 'r16', 'group')),
  created_at timestamptz not null default now()
);

-- A player can be in only one team per event.
create table if not exists public.comp_team_players (
  team_id uuid not null references public.comp_teams (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  slot smallint not null default 1,
  primary key (team_id, player_id),
  unique (event_id, player_id)
);

create index if not exists comp_teams_event_idx on public.comp_teams (event_id);

-- ---------------------------------------------------------------------------
-- Competition columns on matches
-- ---------------------------------------------------------------------------
alter table public.matches add column if not exists event_id uuid references public.events (id) on delete cascade;
alter table public.matches add column if not exists stage text check (stage in ('group', 'r16', 'qf', 'sf', 'final'));
alter table public.matches add column if not exists group_label text;
alter table public.matches add column if not exists round_no int;
alter table public.matches add column if not exists bracket_pos int;
alter table public.matches add column if not exists team_a_id uuid references public.comp_teams (id) on delete set null;
alter table public.matches add column if not exists team_b_id uuid references public.comp_teams (id) on delete set null;
alter table public.matches add column if not exists team_a_games int not null default 0;
alter table public.matches add column if not exists team_b_games int not null default 0;
alter table public.matches add column if not exists winner_team_id uuid references public.comp_teams (id) on delete set null;
alter table public.matches add column if not exists is_wo boolean not null default false;
alter table public.matches add column if not exists is_bye boolean not null default false;
alter table public.matches add column if not exists next_match_id uuid references public.matches (id) on delete set null;
alter table public.matches add column if not exists next_slot text check (next_slot in ('A', 'B'));

create index if not exists matches_event_idx on public.matches (event_id);

-- Every result entry and correction on a competition match.
create table if not exists public.comp_score_log (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete cascade,
  match_id uuid references public.matches (id) on delete cascade,
  user_id uuid,
  action text not null, -- 'finish' | 'correct'
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- Leaderboard points awarded when an event is finished (one row per player per event).
create table if not exists public.player_awards (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  team_id uuid references public.comp_teams (id) on delete set null,
  stage text not null,
  points int not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, player_id)
);

-- ---------------------------------------------------------------------------
-- Player stats now also include event awards
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
    points = greatest(0,
      coalesce((select sum(points_delta) from public.match_history h where h.player_id = p.id), 0)
      + coalesce((select sum(a.points) from public.player_awards a where a.player_id = p.id), 0)
      + p.points_adjustment)
  where p.id = p_player_id;
end $$;

create or replace function public.player_awards_recompute()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_player_stats(old.player_id);
    return old;
  end if;
  perform public.recompute_player_stats(new.player_id);
  return new;
end $$;

drop trigger if exists player_awards_recompute on public.player_awards;
create trigger player_awards_recompute
  after insert or update or delete on public.player_awards
  for each row execute function public.player_awards_recompute();

-- ---------------------------------------------------------------------------
-- Finish / correct a competition match (atomic).
--   p_wo: null = normal result (games decide, a tie is rejected); 'A' / 'B' = walkover winner.
-- Writes match_history (W/L, 0 points) for both players of each team, advances the winner in the
-- knockout, and logs every result entry and correction.
-- ---------------------------------------------------------------------------
create or replace function public.comp_set_result(p_match_id uuid, p_games_a int, p_games_b int, p_wo text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.matches%rowtype;
  nm public.matches%rowtype;
  ev public.events%rowtype;
  w uuid;
  ga int := greatest(0, coalesce(p_games_a, 0));
  gb int := greatest(0, coalesce(p_games_b, 0));
  winner_name text;
  label text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select * into m from public.matches where id = p_match_id for update;
  if not found or m.event_id is null then
    raise exception 'Match kompetisi tidak ditemukan';
  end if;
  if m.team_a_id is null or m.team_b_id is null then
    raise exception 'Tim match ini belum lengkap';
  end if;
  select * into ev from public.events where id = m.event_id;
  if ev.status = 'finished' then
    raise exception 'Event sudah selesai, skor terkunci';
  end if;

  if p_wo is null then
    if ga = gb then
      raise exception 'Skor seri tidak bisa diselesaikan';
    end if;
    w := case when ga > gb then m.team_a_id else m.team_b_id end;
  elsif p_wo in ('A', 'B') then
    w := case when p_wo = 'A' then m.team_a_id else m.team_b_id end;
    ga := 0;
    gb := 0;
  else
    raise exception 'WO harus A atau B';
  end if;

  -- knockout: move the winner into the next match, unless that match already started
  if m.next_match_id is not null then
    select * into nm from public.matches where id = m.next_match_id for update;
    if m.winner_team_id is distinct from w and (nm.status <> 'scheduled' or nm.team_a_games + nm.team_b_games > 0) then
      raise exception 'Pemenang berubah, tapi match berikutnya sudah dimulai. Koreksi match berikutnya dulu.';
    end if;
    select name into winner_name from public.comp_teams where id = w;
    if m.next_slot = 'A' then
      update public.matches set team_a_id = w, team_a_name = winner_name, team_a_player_ids =
        array(select player_id from public.comp_team_players where team_id = w order by slot)
      where id = nm.id;
    else
      update public.matches set team_b_id = w, team_b_name = winner_name, team_b_player_ids =
        array(select player_id from public.comp_team_players where team_id = w order by slot)
      where id = nm.id;
    end if;
  end if;

  insert into public.comp_score_log (event_id, match_id, user_id, action, before, after)
  values (
    m.event_id, m.id, auth.uid(),
    case when m.status = 'finished' then 'correct' else 'finish' end,
    jsonb_build_object('games_a', m.team_a_games, 'games_b', m.team_b_games, 'winner_team_id', m.winner_team_id, 'is_wo', m.is_wo, 'status', m.status),
    jsonb_build_object('games_a', ga, 'games_b', gb, 'winner_team_id', w, 'is_wo', p_wo is not null)
  );

  update public.matches
  set team_a_games = ga, team_b_games = gb, winner_team_id = w,
      winner = case when w = m.team_a_id then 'A' else 'B' end,
      is_wo = p_wo is not null, status = 'finished', is_live = false, timer_running = false
  where id = m.id;

  if m.stage = 'group' then
    -- a corrected group result after the bracket exists makes the bracket stale
    update public.events set bracket_stale = true where id = m.event_id and bracket_generated and m.status = 'finished';
  end if;

  -- match history (W/L only, leaderboard points come from player_awards)
  label := ev.title || ' · ' || case m.stage
    when 'group' then 'Grup ' || coalesce(m.group_label, '')
    when 'r16' then '16 besar' when 'qf' then '8 besar' when 'sf' then 'Semifinal' else 'Final' end;
  delete from public.match_history where match_id = m.id;
  insert into public.match_history (match_id, player_id, session_label, opponent_label, result, points_delta, stream_url)
  select m.id, tp.player_id, label,
         case when tp.team_id = m.team_a_id then m.team_b_name else m.team_a_name end,
         case when tp.team_id = w then 'W' else 'L' end, 0, m.stream_url
  from public.comp_team_players tp
  where tp.team_id in (m.team_a_id, m.team_b_id);
end $$;

-- ---------------------------------------------------------------------------
-- Finish an event: lock each team's final stage and award leaderboard points (idempotent).
--   p_stages: [{"team_id": "...", "stage": "champion"}, ...]
-- ---------------------------------------------------------------------------
create or replace function public.comp_finish_event(p_event_id uuid, p_stages jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ev public.events%rowtype;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  select * into ev from public.events where id = p_event_id for update;
  if not found then
    raise exception 'Event tidak ditemukan';
  end if;
  if ev.status = 'finished' then
    raise exception 'Event sudah diselesaikan';
  end if;

  update public.comp_teams t
  set final_stage = s.stage
  from jsonb_to_recordset(p_stages) as s(team_id uuid, stage text)
  where t.id = s.team_id and t.event_id = p_event_id;

  insert into public.player_awards (event_id, player_id, team_id, stage, points)
  select p_event_id, tp.player_id, t.id, t.final_stage, coalesce((ev.points ->> t.final_stage)::int, 0)
  from public.comp_teams t
  join public.comp_team_players tp on tp.team_id = t.id
  where t.event_id = p_event_id and t.final_stage is not null
  on conflict (event_id, player_id) do nothing;

  update public.events set status = 'finished' where id = p_event_id;
  update public.matches set is_live = false, timer_running = false where event_id = p_event_id;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.events            enable row level security;
alter table public.comp_teams        enable row level security;
alter table public.comp_team_players enable row level security;
alter table public.comp_score_log    enable row level security;
alter table public.player_awards     enable row level security;

drop policy if exists "events public read" on public.events;
create policy "events public read" on public.events for select using (published or public.is_admin());
drop policy if exists "events admin write" on public.events;
create policy "events admin write" on public.events for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "comp_teams public read" on public.comp_teams;
create policy "comp_teams public read" on public.comp_teams for select using (true);
drop policy if exists "comp_teams admin write" on public.comp_teams;
create policy "comp_teams admin write" on public.comp_teams for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "comp_team_players public read" on public.comp_team_players;
create policy "comp_team_players public read" on public.comp_team_players for select using (true);
drop policy if exists "comp_team_players admin write" on public.comp_team_players;
create policy "comp_team_players admin write" on public.comp_team_players for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "comp_score_log admin only" on public.comp_score_log;
create policy "comp_score_log admin only" on public.comp_score_log for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "player_awards public read" on public.player_awards;
create policy "player_awards public read" on public.player_awards for select using (true);
drop policy if exists "player_awards admin write" on public.player_awards;
create policy "player_awards admin write" on public.player_awards for all using (public.is_admin()) with check (public.is_admin());
