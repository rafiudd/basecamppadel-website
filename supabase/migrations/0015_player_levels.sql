-- One level system: players.level only uses the coaching levels (src/lib/coaching.ts LEVEL_NAMES).
-- The old admin list (Beginner / Upper Beginner / Intermediate / Upper Intermediate / Advanced) is
-- mapped by rank, see docs/level-system.md. The 0014 trigger recolors level_color on the update.

update public.players
set level = case level
  when 'Upper Beginner' then 'Beginner'
  when 'Intermediate' then 'Low Bronze'
  when 'Upper Intermediate' then 'Bronze'
  when 'Advanced' then 'Silver'
  else 'Beginner' -- anything else unknown
end
where level not in ('Rookie', 'Beginner', 'Low Bronze', 'Bronze', 'Silver');

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'players_level_check') then
    alter table public.players add constraint players_level_check
      check (level in ('Rookie', 'Beginner', 'Low Bronze', 'Bronze', 'Silver'));
  end if;
end $$;
