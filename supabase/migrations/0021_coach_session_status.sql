-- Coaches move a session between Draft / Berjalan / Selesai from the coaching page, but
-- coaching_sessions is admin-write only under RLS (0012), so their update would match 0 rows. This
-- function lets admin and coach (has_admin_access) change only the status.

create or replace function public.coaching_set_session_status(p_session_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_admin_access() then raise exception 'Tidak punya akses.'; end if;
  if p_status not in ('draft', 'active', 'finished') then raise exception 'Status sesi tidak dikenal.'; end if;
  update public.coaching_sessions set status = p_status where id = p_session_id;
  if not found then raise exception 'Sesi tidak ditemukan.'; end if;
end $$;

revoke all on function public.coaching_set_session_status(uuid, text) from public, anon;
grant execute on function public.coaching_set_session_status(uuid, text) to authenticated;
