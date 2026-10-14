# Quick Links / Resource Hub — Design

## Purpose

Add a new "Tài nguyên" (Quick Links / Resource Hub) section to CoralTask where a
user can store, organize into folders, and quickly open frequently used web
links (docs, tools, references).

## Schema (migration `0005_create_resource_links.sql`)

```sql
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
  folder_id uuid references public.link_folders(id) on delete set null,
  title text not null,
  url text not null,
  description text,
  image_url text,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index on public.link_folders (user_id);
create index on public.quick_links (user_id);
create index on public.quick_links (folder_id);

alter table public.link_folders enable row level security;
alter table public.quick_links enable row level security;

-- select/insert/update/delete policies on both tables, scoped to
-- user_id = auth.uid() (owner-only access).
```

Deleting a folder does not delete its links — `folder_id` becomes null
(uncategorized) via `on delete set null`.

## Server actions (`src/app/actions/resources.ts`)

Mirrors the existing `events.ts` / `tasks.ts` pattern: `"use server"`,
`requireUser()` for the authed Supabase client + userId, typed row mapping,
`revalidatePath("/resources")` after every mutation.

- `getResources()` — fetches folders + links in one round trip for the page.
- `createFolder(input)`, `updateFolder(id, input)`, `deleteFolder(id)`
- `createLink(input)`, `updateLink(id, input)`, `deleteLink(id)`,
  `toggleLinkPinned(id)`
- `createLink` derives `image_url` server-side from the URL's domain
  (`https://www.google.com/s2/favicons?domain=<host>&sz=64`) when the caller
  doesn't supply one, rather than trusting a client-built URL.

## Routing & components

- `src/app/(dashboard)/resources/page.tsx` — server component; calls
  `getResources()`, renders `ResourcesContent`.
- `src/app/(dashboard)/resources/loading.tsx` — skeleton, matching other
  routes' loading state.
- `src/components/resources/ResourcesContent.tsx` — client component: search
  state, client-side filter over folders/links by title/domain, renders the
  folder grid + "Chưa phân loại" (uncategorized) section, owns dialog
  open/close state.
- `src/components/resources/FolderCard.tsx` — `bg-white shadow-sm border
  border-slate-200/80 rounded-2xl p-6`; header shows icon + color swatch +
  name + edit/delete actions; body lists the folder's links, pinned first
  then by `created_at desc`.
- `src/components/resources/LinkRow.tsx` — favicon/image thumbnail, title,
  cleaned domain (strip protocol/`www.`), hover action row (open in new tab,
  copy URL, pin/unpin, edit, delete) via lucide icons.
- `src/components/resources/FolderFormDialog.tsx` — name input, a fixed
  palette of color swatches, a curated grid of ~20 lucide icons to pick from.
  Same plain-`useState` controlled dialog pattern as `EventFormDialog.tsx`
  (no react-hook-form/zod, consistent with the rest of the app).
- `src/components/resources/LinkFormDialog.tsx` — URL input (on blur,
  previews the derived favicon and suggests a title from the domain when
  title is empty), optional description, folder `Select` (including "no
  folder").

### Navigation

Add to `src/components/layout/nav-items.ts`:

```ts
{ href: "/resources", label: "Tài nguyên", shortLabel: "Tài nguyên", icon: Link2 }
```

## Interactions

- Search filters folders (by name) and links (by title/domain) entirely
  client-side — dataset is personal-scale, no server round trip needed.
- Pinned links float to the top of their folder's list.
- No drag-and-drop reordering in this version — no DnD library is installed
  and it's a bonus feature; pin-to-top + recency ordering covers the need.
  Can be added later as a separate scoped change if wanted.
- Icon selection is a curated grid of lucide-react icon names (not a
  free-text field or a new icon-picker dependency).

## Testing

No automated test framework covers this kind of UI elsewhere in the repo
(tasks/events dialogs aren't unit-tested either). Verification is manual:
run the dev server and exercise create/edit/delete/pin/search for both
folders and links in the browser, confirming RLS isn't accidentally blocking
the owning user and that another user's data never leaks client-side.
