begin;

-- More site settings: light/dark mode, corner radius, mascot toggle, week start.
alter table public.user_settings
  add column theme_mode text not null default 'system'
    check (theme_mode in ('light', 'dark', 'system')),
  add column radius text not null default 'default'
    check (radius in ('sharp', 'default', 'round')),
  add column mascot_enabled boolean not null default true,
  -- 0 = Sunday, 1 = Monday (matches Date#getDay).
  add column week_start smallint not null default 1
    check (week_start in (0, 1));

commit;
