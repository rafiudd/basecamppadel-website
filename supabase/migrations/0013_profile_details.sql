-- "Lengkapi profil" per the design: editable full name, Instagram, how long the player has played,
-- and a self-estimated level (the coach's assessment refines it later). All optional.

alter table public.profiles add column if not exists instagram text not null default ''; -- handle, no "@"
alter table public.profiles add column if not exists play_duration text;
alter table public.profiles add column if not exists self_level text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_play_duration_check') then
    alter table public.profiles add constraint profiles_play_duration_check
      check (play_duration in ('lt3m', '3to6m', '6to12m', '1to2y', 'gt2y'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_self_level_check') then
    alter table public.profiles add constraint profiles_self_level_check
      check (self_level in ('Pemula', 'Beginner', 'Intermediate'));
  end if;
end $$;

-- New arguments: the 0012 signature is dropped so the app has exactly one function to call.
drop function if exists public.account_save_profile(text, text, text, text, text, text, text, boolean);

create or replace function public.account_save_profile(
  p_nickname text,
  p_gender text,
  p_whatsapp text,
  p_region text,
  p_hand text,
  p_position text,
  p_photo_url text,
  p_remove_photo boolean default false,
  p_full_name text default '',
  p_instagram text default '',
  p_play_duration text default '',
  p_self_level text default ''
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
  if char_length(coalesce(p_full_name, '')) > 80 then raise exception 'Nama lengkap maksimal 80 karakter.'; end if;
  if coalesce(p_gender, '') not in ('M', 'F') then raise exception 'Pilih kategori dulu.'; end if;
  if coalesce(p_whatsapp, '') !~ '^628[0-9]{7,11}$' then raise exception 'Nomor WA tidak valid.'; end if;
  if coalesce(p_instagram, '') !~ '^[A-Za-z0-9._]{0,30}$' then raise exception 'Username Instagram tidak valid.'; end if;
  if coalesce(p_hand, '') not in ('', 'R', 'L')
     or coalesce(p_position, '') not in ('', 'right', 'left', 'both')
     or coalesce(p_play_duration, '') not in ('', 'lt3m', '3to6m', '6to12m', '1to2y', 'gt2y')
     or coalesce(p_self_level, '') not in ('', 'Pemula', 'Beginner', 'Intermediate') then
    raise exception 'Isian profil tidak valid.';
  end if;
  if exists (select 1 from public.profiles where whatsapp = p_whatsapp and user_id <> v_uid) then
    raise exception 'Nomor WA ini sudah dipakai akun lain.';
  end if;

  select * into pr from public.profiles where user_id = v_uid;
  v_old_photo := pr.photo_url;
  if pr.player_id is not null and pr.gender <> p_gender and public.account_player_locked(pr.player_id) then
    raise exception 'Kategori cuma bisa diubah admin karena kamu sudah punya poin.';
  end if;

  select u.email, coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')
  into v_email, v_full
  from auth.users u where u.id = v_uid;

  insert into public.profiles (user_id, email, full_name, nickname, gender, whatsapp, region, dominant_hand, position, photo_url,
                               instagram, play_duration, self_level)
  values (v_uid, coalesce(v_email, ''), coalesce(nullif(btrim(p_full_name), ''), v_full, ''), p_nickname, p_gender, p_whatsapp,
          btrim(coalesce(p_region, '')), nullif(p_hand, ''), nullif(p_position, ''), p_photo_url,
          coalesce(p_instagram, ''), nullif(p_play_duration, ''), nullif(p_self_level, ''))
  on conflict (user_id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    nickname = excluded.nickname,
    gender = excluded.gender,
    whatsapp = excluded.whatsapp,
    region = excluded.region,
    dominant_hand = excluded.dominant_hand,
    position = excluded.position,
    photo_url = case when p_remove_photo then null else coalesce(excluded.photo_url, profiles.photo_url) end,
    instagram = excluded.instagram,
    play_duration = excluded.play_duration,
    self_level = excluded.self_level
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

revoke all on function public.account_save_profile(text, text, text, text, text, text, text, boolean, text, text, text, text) from public, anon;
grant execute on function public.account_save_profile(text, text, text, text, text, text, text, boolean, text, text, text, text) to authenticated;
