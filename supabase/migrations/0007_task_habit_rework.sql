begin;

-- Task model rework: one-time tasks get a start/end window instead of a
-- single due date; daily recurring tasks move out of `tasks` entirely into
-- a dedicated habit + per-day completion log, so completing/unticking a
-- habit never clones a new row (the old recurrence bug class).
--
-- NOTE: existing recurrence='daily' rows in `tasks` are intentionally left
-- untouched by this migration (not scripted, per plan policy). Once the
-- `recurrence` column is dropped below, those rows become indistinguishable
-- from one-time tasks whose window has already ended — they will show up
-- as overdue pending tasks on the Todo page. Consider deleting them by hand
-- (`delete from public.tasks where recurrence = 'daily';`) BEFORE running
-- this migration if that's not wanted.
alter table public.tasks rename column due_date to start_date;
alter table public.tasks add column end_date timestamptz;
update public.tasks set start_date = coalesce(start_date, created_at, now());
update public.tasks set end_date = coalesce(end_date, start_date);
alter table public.tasks alter column end_date set not null;
alter table public.tasks alter column start_date set not null;
alter table public.tasks add constraint tasks_end_after_start check (end_date >= start_date);
alter table public.tasks drop column recurrence;

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  due_time time not null default '23:59',
  created_at timestamptz not null default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  completed_at timestamptz,
  unique (habit_id, log_date)
);

create index habits_user_id_idx on public.habits (user_id);
create index habit_logs_habit_id_idx on public.habit_logs (habit_id);
create index habit_logs_user_id_log_date_idx on public.habit_logs (user_id, log_date);

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "Users can view their own habits"
  on public.habits for select
  using (auth.uid() = user_id);

create policy "Users can create their own habits"
  on public.habits for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own habits"
  on public.habits for update
  using (auth.uid() = user_id);

create policy "Users can delete their own habits"
  on public.habits for delete
  using (auth.uid() = user_id);

create policy "Users can view their own habit logs"
  on public.habit_logs for select
  using (auth.uid() = user_id);

create policy "Users can create their own habit logs"
  on public.habit_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own habit logs"
  on public.habit_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete their own habit logs"
  on public.habit_logs for delete
  using (auth.uid() = user_id);

commit;
