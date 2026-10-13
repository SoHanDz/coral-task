-- Tasks gain a free-text description, a checklist of subtasks (jsonb, no
-- need for a join table in a single-user app), and due_date now carries a
-- time-of-day instead of only a calendar date.
alter table public.tasks
  add column if not exists description text,
  add column if not exists subtasks jsonb not null default '[]'::jsonb;

alter table public.tasks
  alter column due_date type timestamptz using due_date::timestamptz;
