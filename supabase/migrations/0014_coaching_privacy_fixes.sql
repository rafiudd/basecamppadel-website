-- Fixes on top of 0012_coaching_and_assessments + 0012_player_accounts:
--   1. coach notes are private: a player reads only their own submitted, published assessments
--   2. players.level_color always follows players.level (it drifted when level was set elsewhere)
--   3. coach accounts can't delete themselves through the player "Hapus akun" either

-- ---------------------------------------------------------------------------
-- 1. Assessments: admin/coach see everything, a player only their own sent ones
-- ---------------------------------------------------------------------------
create or replace function public.is_my_player(p_player uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and player_id = p_player);
$$;

drop policy if exists "assessments_read" on public.coaching_assessments;
create policy "assessments_read" on public.coaching_assessments for select using (
  public.has_admin_access()
  or (status = 'submitted' and published_to_player and public.is_my_player(player_id))
);

-- ---------------------------------------------------------------------------
-- 2. Level color follows the level (same colors as LEVEL_DEFINITIONS in src/lib/coaching.ts)
-- ---------------------------------------------------------------------------
create or replace function public.level_color_for(p_level text)
returns text
language sql
immutable
as $$
  select case p_level
    when 'Rookie' then '#FBF7F1'
    when 'Beginner' then '#FFD43B'
    when 'Low Bronze' then '#2563EB'
    when 'Bronze' then '#EF4444'
    when 'Silver' then '#17151F'
  end;
$$;

create or replace function public.players_level_color()
returns trigger
language plpgsql
as $$
begin
  new.level_color := coalesce(public.level_color_for(new.level), new.level_color);
  return new;
end $$;

drop trigger if exists players_level_color on public.players;
create trigger players_level_color
  before insert or update of level, level_color on public.players
  for each row execute function public.players_level_color();

-- repair rows that drifted before the trigger existed
update public.players
set level_color = public.level_color_for(level)
where public.level_color_for(level) is not null
  and level_color is distinct from public.level_color_for(level);

-- ---------------------------------------------------------------------------
-- 3. Hapus akun: any admin_users row (admin or coach) is blocked, not only role 'admin'
-- ---------------------------------------------------------------------------
create or replace function public.account_delete(p_confirm text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'Kamu belum masuk.'; end if;
  if p_confirm is distinct from 'HAPUS' then raise exception 'Ketik HAPUS untuk konfirmasi.'; end if;
  if public.has_admin_access() then raise exception 'Akun admin/coach tidak bisa dihapus dari sini.'; end if;
  delete from auth.users where id = auth.uid();
end $$;
