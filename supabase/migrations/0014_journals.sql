begin;

-- Daily journal: one journal per (user, template) holding its form fields in
-- jsonb, plus one entry per journal per day. Entry values are keyed by field
-- id and are never rewritten when a field is removed from the form.
create table public.journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_key text not null,
  name text not null,
  emoji text not null,
  fields jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, template_key)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  values jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (journal_id, entry_date)
);

create index journals_user_id_idx on public.journals (user_id);
create index journal_entries_journal_id_idx on public.journal_entries (journal_id);
create index journal_entries_user_id_idx on public.journal_entries (user_id);

alter table public.journals enable row level security;
alter table public.journal_entries enable row level security;

create policy "Users can view their own journals"
  on public.journals for select using (auth.uid() = user_id);
create policy "Users can create their own journals"
  on public.journals for insert with check (auth.uid() = user_id);
create policy "Users can update their own journals"
  on public.journals for update using (auth.uid() = user_id);
create policy "Users can delete their own journals"
  on public.journals for delete using (auth.uid() = user_id);

create policy "Users can view their own journal entries"
  on public.journal_entries for select using (auth.uid() = user_id);
create policy "Users can create their own journal entries"
  on public.journal_entries for insert with check (auth.uid() = user_id);
create policy "Users can update their own journal entries"
  on public.journal_entries for update using (auth.uid() = user_id);
create policy "Users can delete their own journal entries"
  on public.journal_entries for delete using (auth.uid() = user_id);

commit;
