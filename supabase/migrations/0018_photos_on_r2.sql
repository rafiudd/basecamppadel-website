-- Photos move to Cloudflare R2 (src/lib/server/storage.ts): avatar URLs are now
-- <R2 public URL>/avatars/<user id>/<file>, not Supabase Storage. The login default photo accepts
-- any https URL in the caller's own avatars/<user id>/ folder (the app uploads it server-side).
create or replace function public.account_set_default_photo(p_photo_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_player uuid;
begin
  if v_uid is null then raise exception 'Kamu belum masuk.'; end if;
  if coalesce(p_photo_url, '') not like 'https://%/avatars/' || v_uid::text || '/%' then
    raise exception 'Foto tidak valid.';
  end if;

  update public.profiles set photo_url = p_photo_url, photo_source = 'google'
  where user_id = v_uid and photo_url is null and photo_source is distinct from 'none'
  returning player_id into v_player;

  if v_player is not null then
    update public.players set photo_url = p_photo_url where id = v_player and photo_url is null;
  end if;
end $$;
