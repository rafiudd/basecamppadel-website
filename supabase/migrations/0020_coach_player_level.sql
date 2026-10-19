-- Coach submits set the player's level, but players is admin-write only under RLS, so the update
-- from a coach silently matched 0 rows and the level stayed the same. This function lets admin and
-- coach (has_admin_access) set only the level, and never over an admin override. level_color
-- follows via the 0014 trigger; players_level_check validates the level name.

create or replace function public.coaching_apply_level(p_player_id uuid, p_level text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_admin_access() then raise exception 'Tidak punya akses.'; end if;
  update public.players set level = p_level where id = p_player_id and not level_overridden;
end $$;

revoke all on function public.coaching_apply_level(uuid, text) from public, anon;
grant execute on function public.coaching_apply_level(uuid, text) to authenticated;
