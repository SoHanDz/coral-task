begin;

-- Weekly/monthly tasks: one template row each; every due day is derived on the
-- client, and only a ticked occurrence is stored (task_id + occurrence_date).
create table public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  recurrence jsonb not null,
  created_at timestamptz not null default now()
);

create table public.recurring_task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.recurring_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  occurrence_date date not null,
  completed_at timestamptz not null default now(),
  unique (task_id, occurrence_date)
);

create index recurring_tasks_user_id_idx on public.recurring_tasks (user_id);
create index recurring_task_completions_task_id_idx on public.recurring_task_completions (task_id);
create index recurring_task_completions_user_id_idx on public.recurring_task_completions (user_id);

alter table public.recurring_tasks enable row level security;
alter table public.recurring_task_completions enable row level security;

create policy "Users can view their own recurring tasks"
  on public.recurring_tasks for select using (auth.uid() = user_id);
create policy "Users can create their own recurring tasks"
  on public.recurring_tasks for insert with check (auth.uid() = user_id);
create policy "Users can update their own recurring tasks"
  on public.recurring_tasks for update using (auth.uid() = user_id);
create policy "Users can delete their own recurring tasks"
  on public.recurring_tasks for delete using (auth.uid() = user_id);

create policy "Users can view their own recurring completions"
  on public.recurring_task_completions for select using (auth.uid() = user_id);
create policy "Users can create their own recurring completions"
  on public.recurring_task_completions for insert with check (auth.uid() = user_id);
create policy "Users can update their own recurring completions"
  on public.recurring_task_completions for update using (auth.uid() = user_id);
create policy "Users can delete their own recurring completions"
  on public.recurring_task_completions for delete using (auth.uid() = user_id);

commit;
