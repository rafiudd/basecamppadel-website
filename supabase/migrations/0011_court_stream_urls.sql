-- One YouTube live link per court, set from the admin "Edit event" modal (not at creation). Every
-- match row generated on that court (mabar rounds, group schedule, knockout bracket) picks this up.
alter table public.events
  add column if not exists court_stream_urls jsonb not null default '{}'::jsonb;
