begin;

-- Notes module (Google Keep-style): free-form notes with an optional single
-- image, color, tags and pin-to-top.
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  -- Object path inside the private `note-images` bucket: "<user_id>/<file>".
  image_path text,
  color text not null default '#ffffff',
  tags text[] not null default '{}',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_id_created_at_idx on public.notes (user_id, created_at desc);
create index notes_tags_idx on public.notes using gin (tags);

alter table public.notes enable row level security;

create policy "Users can view their own notes"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "Users can create their own notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own notes"
  on public.notes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own notes"
  on public.notes for delete
  using (auth.uid() = user_id);

-- Private bucket for note images; objects are namespaced by user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'note-images',
  'note-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "Users can view their own note images"
  on storage.objects for select
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload their own note images"
  on storage.objects for insert
  with check (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own note images"
  on storage.objects for update
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own note images"
  on storage.objects for delete
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
