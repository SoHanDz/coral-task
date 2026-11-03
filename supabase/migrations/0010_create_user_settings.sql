begin;

-- Per-user site settings (currently just the brand/primary color).
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_color text not null default '#0f766e'
    check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can create their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

commit;
