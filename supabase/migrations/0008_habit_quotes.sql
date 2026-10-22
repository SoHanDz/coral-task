begin;

-- Habit-tracking page: a small list of user-maintained quotes, one shown
-- at random each time the /habits page loads. habits/habit_logs already
-- exist from the 0007 migration — this adds only the quotes table.
create table public.habit_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index habit_quotes_user_id_idx on public.habit_quotes (user_id);

alter table public.habit_quotes enable row level security;

create policy "Users can view their own habit quotes"
  on public.habit_quotes for select
  using (auth.uid() = user_id);

create policy "Users can create their own habit quotes"
  on public.habit_quotes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own habit quotes"
  on public.habit_quotes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own habit quotes"
  on public.habit_quotes for delete
  using (auth.uid() = user_id);

commit;
