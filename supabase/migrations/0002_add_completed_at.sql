-- Tracks exactly when a task was marked completed, so the dashboard can
-- show real completion timestamps and compute a streak instead of
-- fabricating data.
alter table public.tasks
  add column if not exists completed_at timestamp with time zone;
