-- Quick Links / Resource Hub: lets a user organize frequently used links
-- into color/icon-tagged folders, with pin-to-top and a favicon thumbnail.
create table public.link_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#0f766e',
  icon text not null default 'Folder',
  created_at timestamptz not null default now()
);

create table public.quick_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Deleting a folder un-categorizes its links instead of deleting them.
  folder_id uuid references public.link_folders(id) on delete set null,
  title text not null,
  url text not null,
  description text,
  image_url text,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index link_folders_user_id_idx on public.link_folders (user_id);
create index quick_links_user_id_idx on public.quick_links (user_id);
create index quick_links_folder_id_idx on public.quick_links (folder_id);

alter table public.link_folders enable row level security;
alter table public.quick_links enable row level security;

create policy "Users can view their own link folders"
  on public.link_folders for select
  using (auth.uid() = user_id);

create policy "Users can create their own link folders"
  on public.link_folders for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own link folders"
  on public.link_folders for update
  using (auth.uid() = user_id);

create policy "Users can delete their own link folders"
  on public.link_folders for delete
  using (auth.uid() = user_id);

create policy "Users can view their own quick links"
  on public.quick_links for select
  using (auth.uid() = user_id);

create policy "Users can create their own quick links"
  on public.quick_links for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own quick links"
  on public.quick_links for update
  using (auth.uid() = user_id);

create policy "Users can delete their own quick links"
  on public.quick_links for delete
  using (auth.uid() = user_id);
