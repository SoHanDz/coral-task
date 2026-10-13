-- Lets special events (birthdays, anniversaries) repeat every year on the
-- same month/day instead of only firing once and disappearing.
alter table public.events
  add column if not exists is_recurring boolean not null default false;
