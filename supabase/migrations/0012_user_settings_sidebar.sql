begin;

-- Sidebar look and which navigation entries are hidden.
alter table public.user_settings
  add column sidebar_style text not null default 'dark'
    check (sidebar_style in ('dark', 'brand', 'light')),
  -- Hrefs of hidden nav entries, e.g. {/notes,/resources}. Validated in the app.
  add column nav_hidden text[] not null default '{}';

commit;
