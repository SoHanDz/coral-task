begin;

-- Manual drag-and-drop order of one day's task list. `item_ids` holds task ids
-- (and `templateId::yyyy-MM-dd` occurrence ids for weekly/monthly tasks) in
-- display order; ids missing from it fall back to deadline order client-side.
create table public.task_day_orders (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  item_ids text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.task_day_orders enable row level security;

create policy "Users can view their own task orders"
  on public.task_day_orders for select using (auth.uid() = user_id);
create policy "Users can create their own task orders"
  on public.task_day_orders for insert with check (auth.uid() = user_id);
create policy "Users can update their own task orders"
  on public.task_day_orders for update using (auth.uid() = user_id);
create policy "Users can delete their own task orders"
  on public.task_day_orders for delete using (auth.uid() = user_id);

commit;
