-- Player accounts (login with Google). A `profiles` row is the account; `player_id` links it to the
-- `players` row that carries points and history. Every write goes through the security definer
-- functions below, so players never touch `players` directly and the linking rules live in one place.

-- Legacy players: admin fills the WA number so a new account can be linked to them automatically.
alter table public.players add column if not exists whatsapp text;
create unique index if not exists players_whatsapp_key on public.players (whatsapp) where whatsapp is not null;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text not null default '', -- from the Google account, used to suggest a legacy player
  nickname text not null,             -- shown on the leaderboard (synced to players.name)
  gender text not null check (gender in ('M', 'F')),
  whatsapp text not null,             -- normalized 628…
  region text not null default '',
  dominant_hand text check (dominant_hand in ('R', 'L')),
  position text check (position in ('right', 'left', 'both')),
  photo_url text,
  player_id uuid references public.players (id) on delete set null,
  claim_player_id uuid references public.players (id) on delete set null, -- "Ini saya", waiting for an admin
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_whatsapp_key on public.profiles (whatsapp);
create unique index if not exists profiles_player_id_key on public.profiles (player_id);
create index if not exists profiles_claim_player_id_idx on public.profiles (claim_player_id) where claim_player_id is not null;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "profiles admin write" on public.profiles;
create policy "profiles admin write" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- A player always sees their own linked row, even when the admin hid it from the leaderboard.
drop policy if exists "players self read" on public.players;
create policy "players self read" on public.players
  for select using (exists (select 1 from public.profiles x where x.player_id = players.id and x.user_id = auth.uid()));

-- Profile photos: each account writes only under players/avatars/<user id>/.
drop policy if exists "players bucket own avatar" on storage.objects;
create policy "players bucket own avatar" on storage.objects
  for all to authenticated
  using (bucket_id = 'players' and (storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text)
  with check (bucket_id = 'players' and (storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Internal helpers (not callable from the app)
-- ---------------------------------------------------------------------------

-- "Sudah punya poin": from then on only an admin may change the player's gender.
create or replace function public.account_player_locked(p_player uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.players where id = p_player and points <> 0)
      or exists (select 1 from public.match_history where player_id = p_player);
$$;

create or replace function public.account_link(p_uid uuid, p_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pr public.profiles;
  pl public.players;
  v_gender text;
begin
  select * into pr from public.profiles where user_id = p_uid for update;
  select * into pl from public.players where id = p_player for update;
  if pr.user_id is null then raise exception 'Profil belum dilengkapi.'; end if;
  if pl.id is null then raise exception 'Data pemain tidak ditemukan.'; end if;
  if exists (select 1 from public.profiles where player_id = p_player and user_id <> p_uid) then
    raise exception 'Data pemain ini sudah tersambung ke akun lain.';
  end if;

  -- a player with points keeps the gender the admin gave them
  v_gender := case when public.account_player_locked(p_player) then pl.gender else pr.gender end;

  update public.profiles set player_id = p_player, claim_player_id = null, gender = v_gender where user_id = p_uid;
  update public.players
  set name = pr.nickname,
      gender = v_gender,
      region = case when pr.region <> '' then pr.region else pl.region end,
      photo_url = coalesce(pr.photo_url, pl.photo_url)
  where id = p_player;
end $$;

create or replace function public.account_new_player(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pr public.profiles;
  v_id uuid;
begin
  select * into pr from public.profiles where user_id = p_uid;
  if pr.user_id is null then raise exception 'Profil belum dilengkapi.'; end if;
  insert into public.players (name, gender, region, photo_url)
  values (pr.nickname, pr.gender, pr.region, pr.photo_url)
  returning id into v_id;
  perform public.account_link(p_uid, v_id);
end $$;

revoke all on function public.account_player_locked(uuid) from public, anon, authenticated;
revoke all on function public.account_link(uuid, uuid) from public, anon, authenticated;
revoke all on function public.account_new_player(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Called by the signed-in player
-- ---------------------------------------------------------------------------

-- Unlinked legacy players whose name matches the account's nickname or Google name.
create or replace function public.account_name_candidates()
returns table (id uuid, name text, gender text, region text, points int, photo_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, p.gender, p.region, p.points, p.photo_url
  from public.players p
  join public.profiles me on me.user_id = auth.uid()
  where me.player_id is null
    and lower(btrim(p.name)) in (lower(btrim(me.nickname)), lower(btrim(me.full_name)))
    and not exists (select 1 from public.profiles x where x.player_id = p.id)
  order by p.points desc, p.name;
$$;

-- Create or update the caller's profile. Returns what happened:
--   'linked'  a legacy player with the same WA number was linked
--   'choose'  no WA match, but legacy players share the name: ask "Ini saya?"
--   'created' a fresh players row was made for the account
--   'saved'   an existing profile was updated
create or replace function public.account_save_profile(
  p_nickname text,
  p_gender text,
  p_whatsapp text,
  p_region text,
  p_hand text,
  p_position text,
  p_photo_url text,
  p_remove_photo boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_full text;
  v_old_photo text;
  pr public.profiles;
  v_match uuid;
begin
  if v_uid is null then raise exception 'Kamu belum masuk.'; end if;
  p_nickname := btrim(coalesce(p_nickname, ''));
  if p_nickname = '' then raise exception 'Nama panggilan wajib diisi.'; end if;
  if char_length(p_nickname) > 40 then raise exception 'Nama panggilan maksimal 40 karakter.'; end if;
  if coalesce(p_gender, '') not in ('M', 'F') then raise exception 'Pilih gender dulu.'; end if;
  if coalesce(p_whatsapp, '') !~ '^628[0-9]{7,11}$' then raise exception 'Nomor WA tidak valid.'; end if;
  if coalesce(p_hand, '') not in ('', 'R', 'L') or coalesce(p_position, '') not in ('', 'right', 'left', 'both') then
    raise exception 'Isian profil tidak valid.';
  end if;
  if exists (select 1 from public.profiles where whatsapp = p_whatsapp and user_id <> v_uid) then
    raise exception 'Nomor WA ini sudah dipakai akun lain.';
  end if;

  select * into pr from public.profiles where user_id = v_uid;
  v_old_photo := pr.photo_url;
  if pr.player_id is not null and pr.gender <> p_gender and public.account_player_locked(pr.player_id) then
    raise exception 'Gender cuma bisa diubah admin karena kamu sudah punya poin.';
  end if;

  select u.email, coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')
  into v_email, v_full
  from auth.users u where u.id = v_uid;

  insert into public.profiles (user_id, email, full_name, nickname, gender, whatsapp, region, dominant_hand, position, photo_url)
  values (v_uid, coalesce(v_email, ''), coalesce(v_full, ''), p_nickname, p_gender, p_whatsapp,
          btrim(coalesce(p_region, '')), nullif(p_hand, ''), nullif(p_position, ''), p_photo_url)
  on conflict (user_id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    nickname = excluded.nickname,
    gender = excluded.gender,
    whatsapp = excluded.whatsapp,
    region = excluded.region,
    dominant_hand = excluded.dominant_hand,
    position = excluded.position,
    photo_url = case when p_remove_photo then null else coalesce(excluded.photo_url, profiles.photo_url) end
  returning * into pr;

  if pr.player_id is not null then
    update public.players
    set name = pr.nickname,
        gender = pr.gender,
        region = pr.region,
        -- removing the profile photo only clears the player's photo when it was that same photo
        photo_url = case
          when p_photo_url is not null then p_photo_url
          when p_remove_photo and photo_url is not distinct from v_old_photo then null
          else photo_url
        end
    where id = pr.player_id;
    return 'saved';
  end if;
  if pr.claim_player_id is not null then return 'saved'; end if;

  select p.id into v_match
  from public.players p
  where p.whatsapp = p_whatsapp and not exists (select 1 from public.profiles x where x.player_id = p.id)
  limit 1;
  if v_match is not null then
    perform public.account_link(v_uid, v_match);
    return 'linked';
  end if;

  if exists (select 1 from public.account_name_candidates()) then return 'choose'; end if;

  perform public.account_new_player(v_uid);
  return 'created';
end $$;

-- Answer to "Ini saya?": a candidate id files a claim for an admin to verify, null = new player.
create or replace function public.account_choose_player(p_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  pr public.profiles;
begin
  select * into pr from public.profiles where user_id = v_uid;
  if pr.user_id is null then raise exception 'Lengkapi profil dulu.'; end if;
  if pr.player_id is not null or pr.claim_player_id is not null then return; end if;
  if p_player is null then
    perform public.account_new_player(v_uid);
    return;
  end if;
  if not exists (select 1 from public.account_name_candidates() c where c.id = p_player) then
    raise exception 'Data pemain ini tidak bisa diklaim.';
  end if;
  update public.profiles set claim_player_id = p_player where user_id = v_uid;
end $$;

-- Delete the caller's login. The profile goes with it; the players row and its matches stay.
create or replace function public.account_delete(p_confirm text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'Kamu belum masuk.'; end if;
  if p_confirm is distinct from 'HAPUS' then raise exception 'Ketik HAPUS untuk konfirmasi.'; end if;
  if public.is_admin() then raise exception 'Akun admin tidak bisa dihapus dari sini.'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.account_name_candidates() from public, anon;
revoke all on function public.account_save_profile(text, text, text, text, text, text, text, boolean) from public, anon;
revoke all on function public.account_choose_player(uuid) from public, anon;
revoke all on function public.account_delete(text) from public, anon;
grant execute on function public.account_name_candidates() to authenticated;
grant execute on function public.account_save_profile(text, text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.account_choose_player(uuid) to authenticated;
grant execute on function public.account_delete(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: verify a name claim
-- ---------------------------------------------------------------------------

-- Approve links the claimed player; reject gives the account a fresh player instead.
create or replace function public.account_resolve_claim(p_uid uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pr public.profiles;
begin
  if not public.is_admin() then raise exception 'Tidak punya akses admin.'; end if;
  select * into pr from public.profiles where user_id = p_uid for update;
  if pr.claim_player_id is null or pr.player_id is not null then raise exception 'Klaim ini sudah diproses.'; end if;
  if p_approve then
    perform public.account_link(p_uid, pr.claim_player_id);
  else
    update public.profiles set claim_player_id = null where user_id = p_uid;
    perform public.account_new_player(p_uid);
  end if;
end $$;

revoke all on function public.account_resolve_claim(uuid, boolean) from public, anon;
grant execute on function public.account_resolve_claim(uuid, boolean) to authenticated;
