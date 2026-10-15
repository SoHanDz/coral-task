alter table public.link_folders
  add column is_pinned boolean not null default false;
