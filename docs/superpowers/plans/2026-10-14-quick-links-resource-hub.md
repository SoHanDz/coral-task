# Quick Links / Resource Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Tài nguyên" (Quick Links / Resource Hub) page where a user organizes frequently used links into color/icon-tagged folders, with search, favicon thumbnails, and pin-to-top.

**Architecture:** Two new Supabase tables (`link_folders`, `quick_links`) with owner-only RLS, a `src/app/actions/resources.ts` server-actions module following the existing `events.ts`/`tasks.ts` pattern, a new `/resources` route under the `(dashboard)` group (server component fetches, client component owns search/dialog state), and presentational components under `src/components/resources/`.

**Tech Stack:** Next.js 16 App Router, Supabase (`@supabase/ssr`), shadcn/ui built on `@base-ui/react` (not Radix), Tailwind v4, lucide-react, `date-fns`. No react-hook-form/zod, no test framework — this repo has none, so verification is `tsc --noEmit` + `npm run lint` per task and a manual browser pass at the end.

**Spec:** `docs/superpowers/specs/2026-10-14-quick-links-resource-hub-design.md`

## Global Constraints

- RLS must be enabled on both new tables, with owner-only (`user_id = auth.uid()`) policies for select/insert/update/delete.
- Route path is `/resources`; sidebar label is the Vietnamese "Tài nguyên" (not "Quick Links").
- No drag-and-drop in this version — do not add `@dnd-kit` or similar. Ordering is pinned-first, then `created_at desc`.
- Icon selection is a curated fixed list of lucide-react icon names rendered as a clickable grid — no free-text icon field, no new icon-picker dependency.
- All shadcn primitives in this repo are built on **`@base-ui/react`**, not Radix: `DialogTrigger`/`SelectTrigger` etc. take a `render={element}` prop pattern where shown below — follow it exactly, don't use children-based Radix API.
- Server actions always scope queries with `.eq("user_id", userId)` from `requireUser()`, never trust a client-supplied `user_id`.
- `cn` import path depends on layer: inside `src/components/ui/*` import from bare `"cn"`; everywhere else (app components) import from `"@/lib/utils"`.
- No automated test framework exists in this repo. Each task's "test" step is `npx tsc --noEmit` (or narrower, see tasks) plus `npm run lint`. Task 7 is a full manual browser QA pass — do not claim the feature works before running it.

---

### Task 1: Database migration — `link_folders` and `quick_links`

**Files:**
- Create: `supabase/migrations/0005_create_resource_links.sql`

**Interfaces:**
- Produces: tables `public.link_folders(id, user_id, name, color, icon, created_at)` and `public.quick_links(id, user_id, folder_id, title, url, description, image_url, is_pinned, created_at)`, both RLS-enabled with owner-only policies. Later tasks' server actions query these exact column names.

- [ ] **Step 1: Write the migration file**

```sql
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
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase migration up` (if the project is linked to a local/remote Supabase instance via the CLI). If the CLI isn't linked in this environment, open the Supabase project's SQL editor and run the file's contents directly, then confirm both tables appear under Table Editor with RLS marked "Enabled".

Expected: both tables exist, RLS enabled, 4 policies each.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0005_create_resource_links.sql
git commit -m "Add link_folders and quick_links tables with RLS"
```

---

### Task 2: Domain types and favicon/domain helpers

**Files:**
- Create: `src/lib/resources/types.ts`
- Create: `src/lib/resources/favicon.ts`

**Interfaces:**
- Produces:
  - `interface LinkFolder { id: string; name: string; color: string; icon: string; createdAt: Date }`
  - `interface QuickLink { id: string; folderId: string | null; title: string; url: string; description: string | null; imageUrl: string | null; isPinned: boolean; createdAt: Date }`
  - `function buildFaviconUrl(domain: string): string`
  - `function extractDomain(rawUrl: string): string` — throws `Error` if the URL can't be parsed.
  - `function cleanDomainLabel(rawUrl: string): string` — same as `extractDomain` but strips a leading `www.` for display.
  - `function normalizeUrl(rawUrl: string): string` — prepends `https://` if the input has no protocol.
- Consumes: nothing (pure helpers + types only).

- [ ] **Step 1: Write the types file**

```ts
export interface LinkFolder {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: Date;
}

export interface QuickLink {
  id: string;
  folderId: string | null;
  title: string;
  url: string;
  description: string | null;
  imageUrl: string | null;
  isPinned: boolean;
  createdAt: Date;
}
```

- [ ] **Step 2: Write the favicon/domain helpers**

```ts
/** Adds https:// if the user typed a bare domain or left off the protocol. */
export function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Throws if the URL (after normalizing) still can't be parsed. */
export function extractDomain(rawUrl: string): string {
  const url = new URL(normalizeUrl(rawUrl));
  return url.hostname;
}

/** Domain for display, with a leading "www." stripped. */
export function cleanDomainLabel(rawUrl: string): string {
  return extractDomain(rawUrl).replace(/^www\./i, "");
}

export function buildFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `src/lib/resources/`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/resources/types.ts src/lib/resources/favicon.ts
git commit -m "Add Quick Links domain types and favicon/domain helpers"
```

---

### Task 3: Server actions — `src/app/actions/resources.ts`

**Files:**
- Create: `src/app/actions/resources.ts`

**Interfaces:**
- Consumes: `requireUser` from `@/lib/supabase/require-user`; `LinkFolder`, `QuickLink` from `@/lib/resources/types`; `extractDomain`, `buildFaviconUrl`, `normalizeUrl` from `@/lib/resources/favicon`.
- Produces:
  - `async function getResources(): Promise<{ folders: LinkFolder[]; links: QuickLink[] }>`
  - `async function createFolder(input: { name: string; color: string; icon: string }): Promise<LinkFolder>`
  - `async function updateFolder(id: string, input: { name: string; color: string; icon: string }): Promise<LinkFolder>`
  - `async function deleteFolder(id: string): Promise<void>`
  - `async function createLink(input: { url: string; title: string; description?: string; folderId?: string | null; imageUrl?: string }): Promise<QuickLink>`
  - `async function updateLink(id: string, input: { url: string; title: string; description?: string; folderId?: string | null }): Promise<QuickLink>`
  - `async function deleteLink(id: string): Promise<void>`
  - `async function toggleLinkPinned(id: string, isPinned: boolean): Promise<void>`

- [ ] **Step 1: Write the server actions file**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/require-user";
import { extractDomain, buildFaviconUrl } from "@/lib/resources/favicon";
import type { LinkFolder, QuickLink } from "@/lib/resources/types";

interface FolderRow {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

interface LinkRow {
  id: string;
  folder_id: string | null;
  title: string;
  url: string;
  description: string | null;
  image_url: string | null;
  is_pinned: boolean;
  created_at: string;
}

const FOLDER_COLUMNS = "id, name, color, icon, created_at";
const LINK_COLUMNS =
  "id, folder_id, title, url, description, image_url, is_pinned, created_at";

function mapFolder(row: FolderRow): LinkFolder {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    createdAt: new Date(row.created_at),
  };
}

function mapLink(row: LinkRow): QuickLink {
  return {
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    url: row.url,
    description: row.description,
    imageUrl: row.image_url,
    isPinned: row.is_pinned,
    createdAt: new Date(row.created_at),
  };
}

function revalidateResources() {
  revalidatePath("/resources");
}

export async function getResources(): Promise<{
  folders: LinkFolder[];
  links: QuickLink[];
}> {
  const { supabase, userId } = await requireUser();

  const [foldersResult, linksResult] = await Promise.all([
    supabase
      .from("link_folders")
      .select(FOLDER_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("quick_links")
      .select(LINK_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (foldersResult.error) throw new Error(foldersResult.error.message);
  if (linksResult.error) throw new Error(linksResult.error.message);

  return {
    folders: (foldersResult.data as FolderRow[]).map(mapFolder),
    links: (linksResult.data as LinkRow[]).map(mapLink),
  };
}

export async function createFolder(input: {
  name: string;
  color: string;
  icon: string;
}): Promise<LinkFolder> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("link_folders")
    .insert({ user_id: userId, name: input.name, color: input.color, icon: input.icon })
    .select(FOLDER_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidateResources();
  return mapFolder(data as FolderRow);
}

export async function updateFolder(
  id: string,
  input: { name: string; color: string; icon: string }
): Promise<LinkFolder> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("link_folders")
    .update({ name: input.name, color: input.color, icon: input.icon })
    .eq("id", id)
    .eq("user_id", userId)
    .select(FOLDER_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidateResources();
  return mapFolder(data as FolderRow);
}

export async function deleteFolder(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("link_folders")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateResources();
}

export async function createLink(input: {
  url: string;
  title: string;
  description?: string;
  folderId?: string | null;
  imageUrl?: string;
}): Promise<QuickLink> {
  const { supabase, userId } = await requireUser();
  const domain = extractDomain(input.url);
  const imageUrl = input.imageUrl ?? buildFaviconUrl(domain);

  const { data, error } = await supabase
    .from("quick_links")
    .insert({
      user_id: userId,
      folder_id: input.folderId ?? null,
      title: input.title,
      url: input.url,
      description: input.description ?? null,
      image_url: imageUrl,
    })
    .select(LINK_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidateResources();
  return mapLink(data as LinkRow);
}

export async function updateLink(
  id: string,
  input: { url: string; title: string; description?: string; folderId?: string | null }
): Promise<QuickLink> {
  const { supabase, userId } = await requireUser();
  const domain = extractDomain(input.url);

  const { data, error } = await supabase
    .from("quick_links")
    .update({
      url: input.url,
      title: input.title,
      description: input.description ?? null,
      folder_id: input.folderId ?? null,
      image_url: buildFaviconUrl(domain),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select(LINK_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidateResources();
  return mapLink(data as LinkRow);
}

export async function deleteLink(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("quick_links")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateResources();
}

export async function toggleLinkPinned(id: string, isPinned: boolean): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("quick_links")
    .update({ is_pinned: isPinned })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateResources();
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `src/app/actions/resources.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/resources.ts
git commit -m "Add Quick Links server actions (CRUD for folders and links)"
```

---

### Task 4: Icon/color option lists and `LinkRow` + `FolderCard` presentational components

**Files:**
- Create: `src/components/resources/icon-options.ts`
- Create: `src/components/resources/color-options.ts`
- Create: `src/components/resources/LinkRow.tsx`
- Create: `src/components/resources/FolderCard.tsx`

**Interfaces:**
- Consumes: `QuickLink`, `LinkFolder` from `@/lib/resources/types`; `cleanDomainLabel` from `@/lib/resources/favicon`; `cn` from `@/lib/utils`.
- Produces:
  - `ICON_OPTIONS: { name: string; Icon: LucideIcon }[]` and `getIconComponent(name: string): LucideIcon` (fallback `Folder`/`Link2` if name not found).
  - `COLOR_OPTIONS: string[]` (hex values).
  - `<LinkRow link={QuickLink} onOpen onCopy onTogglePin onEdit onDelete />` — props are plain callbacks taking the link's `id` (`onTogglePin: (id: string, next: boolean) => void`, others `(id: string) => void` except `onEdit: (link: QuickLink) => void`).
  - `<FolderCard folder={LinkFolder | null} links={QuickLink[]} onEditFolder? onDeleteFolder? ...link callbacks />` — `folder={null}` renders the "Chưa phân loại" (uncategorized) card without edit/delete actions.

- [ ] **Step 1: Write `icon-options.ts`**

```ts
import {
  BookOpen,
  Boxes,
  Braces,
  Code2,
  Compass,
  Database,
  FileText,
  Folder,
  Globe,
  Hammer,
  Layers,
  Lightbulb,
  Link2,
  Palette,
  Puzzle,
  Rocket,
  Sparkles,
  Star,
  Terminal,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const ICON_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: "Folder", Icon: Folder },
  { name: "Link2", Icon: Link2 },
  { name: "BookOpen", Icon: BookOpen },
  { name: "Code2", Icon: Code2 },
  { name: "Terminal", Icon: Terminal },
  { name: "Braces", Icon: Braces },
  { name: "Database", Icon: Database },
  { name: "Globe", Icon: Globe },
  { name: "Palette", Icon: Palette },
  { name: "Layers", Icon: Layers },
  { name: "Boxes", Icon: Boxes },
  { name: "Puzzle", Icon: Puzzle },
  { name: "Compass", Icon: Compass },
  { name: "Lightbulb", Icon: Lightbulb },
  { name: "Rocket", Icon: Rocket },
  { name: "Star", Icon: Star },
  { name: "Sparkles", Icon: Sparkles },
  { name: "Hammer", Icon: Hammer },
  { name: "Wrench", Icon: Wrench },
  { name: "FileText", Icon: FileText },
];

export function getIconComponent(name: string): LucideIcon {
  return ICON_OPTIONS.find((option) => option.name === name)?.Icon ?? Folder;
}
```

- [ ] **Step 2: Write `color-options.ts`**

```ts
export const COLOR_OPTIONS = [
  "#0f766e", // teal (default)
  "#0369a1", // blue
  "#7c3aed", // violet
  "#be185d", // pink
  "#b91c1c", // red
  "#c2410c", // orange
  "#a16207", // amber
  "#4d7c0f", // green
  "#334155", // slate
] as const;
```

- [ ] **Step 3: Write `LinkRow.tsx`**

```tsx
"use client";

import { CopyIcon, ExternalLinkIcon, PencilIcon, PinIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanDomainLabel } from "@/lib/resources/favicon";
import { cn } from "@/lib/utils";
import type { QuickLink } from "@/lib/resources/types";

interface LinkRowProps {
  link: QuickLink;
  onOpen: (id: string) => void;
  onCopy: (id: string) => void;
  onTogglePin: (id: string, next: boolean) => void;
  onEdit: (link: QuickLink) => void;
  onDelete: (id: string) => void;
}

export function LinkRow({ link, onOpen, onCopy, onTogglePin, onEdit, onDelete }: LinkRowProps) {
  const domain = cleanDomainLabel(link.url);

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
      <img
        src={link.imageUrl ?? undefined}
        alt=""
        className="size-6 shrink-0 rounded"
        onError={(e) => {
          e.currentTarget.style.visibility = "hidden";
        }}
      />
      <button
        type="button"
        onClick={() => onOpen(link.id)}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
      >
        <span className="truncate text-sm font-medium text-slate-900">{link.title}</span>
        <span className="truncate text-xs text-slate-500">{domain}</span>
      </button>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Mở trong tab mới"
          onClick={() => onOpen(link.id)}
        >
          <ExternalLinkIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Sao chép liên kết"
          onClick={() => onCopy(link.id)}
        >
          <CopyIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={link.isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
          onClick={() => onTogglePin(link.id, !link.isPinned)}
        >
          <PinIcon className={cn("size-4", link.isPinned && "fill-current text-amber-500")} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Sửa liên kết"
          onClick={() => onEdit(link)}
        >
          <PencilIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Xóa liên kết"
          onClick={() => onDelete(link.id)}
        >
          <Trash2Icon className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `FolderCard.tsx`**

```tsx
"use client";

import { Folder as FolderIcon, MoreVertical, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkRow } from "@/components/resources/LinkRow";
import { getIconComponent } from "@/components/resources/icon-options";
import type { LinkFolder, QuickLink } from "@/lib/resources/types";

interface FolderCardProps {
  folder: LinkFolder | null;
  links: QuickLink[];
  onOpenLink: (id: string) => void;
  onCopyLink: (id: string) => void;
  onToggleLinkPinned: (id: string, next: boolean) => void;
  onEditLink: (link: QuickLink) => void;
  onDeleteLink: (id: string) => void;
  onEditFolder?: (folder: LinkFolder) => void;
  onDeleteFolder?: (id: string) => void;
}

export function FolderCard({
  folder,
  links,
  onOpenLink,
  onCopyLink,
  onToggleLinkPinned,
  onEditLink,
  onDeleteLink,
  onEditFolder,
  onDeleteFolder,
}: FolderCardProps) {
  const Icon = folder ? getIconComponent(folder.icon) : FolderIcon;
  const sortedLinks = [...links].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex size-8 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: folder?.color ?? "#64748b" }}
          >
            <Icon className="size-4" />
          </span>
          <h3 className="text-sm font-semibold text-slate-900">
            {folder ? folder.name : "Chưa phân loại"}
          </h3>
          <span className="text-xs text-slate-400">{sortedLinks.length}</span>
        </div>

        {folder && onEditFolder && onDeleteFolder && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Sửa thư mục"
              onClick={() => onEditFolder(folder)}
            >
              <PencilIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Xóa thư mục"
              onClick={() => onDeleteFolder(folder.id)}
            >
              <Trash2Icon className="size-4 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      {sortedLinks.length === 0 ? (
        <p className="text-sm text-slate-400">Chưa có liên kết nào.</p>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100">
          {sortedLinks.map((link) => (
            <LinkRow
              key={link.id}
              link={link}
              onOpen={onOpenLink}
              onCopy={onCopyLink}
              onTogglePin={onToggleLinkPinned}
              onEdit={onEditLink}
              onDelete={onDeleteLink}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

Note: `MoreVertical` is imported but unused in this draft — remove the import in this step (don't leave an unused-import lint error). Delete that import from the final file before committing.

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors in the four new files (fix the `MoreVertical` unused-import issue from Step 4 if it surfaces).

- [ ] **Step 6: Commit**

```bash
git add src/components/resources/icon-options.ts src/components/resources/color-options.ts src/components/resources/LinkRow.tsx src/components/resources/FolderCard.tsx
git commit -m "Add Quick Links icon/color options, LinkRow and FolderCard components"
```

---

### Task 5: `FolderFormDialog` and `LinkFormDialog`

**Files:**
- Create: `src/components/resources/FolderFormDialog.tsx`
- Create: `src/components/resources/LinkFormDialog.tsx`

**Interfaces:**
- Consumes: `ICON_OPTIONS` from `@/components/resources/icon-options`; `COLOR_OPTIONS` from `@/components/resources/color-options`; `LinkFolder`, `QuickLink` from `@/lib/resources/types`; `cn` from `@/lib/utils`; shadcn `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogTrigger`, `Input`, `Label`, `Button`, `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem`.
- Produces:
  - `<FolderFormDialog trigger={ReactElement} folder?={LinkFolder} open?={boolean} onOpenChange?={(open: boolean) => void} onSubmit={(input: { name: string; color: string; icon: string }) => void} onDelete?={(id: string) => void} />` — `open`/`onOpenChange` are optional; omit both to let the dialog manage its own open state via `trigger`, or pass both to drive it externally (Task 6 needs this for the edit-folder flow, since its trigger there is not a clickable element).
  - `<LinkFormDialog trigger={ReactElement} link?={QuickLink} folders={LinkFolder[]} open?={boolean} onOpenChange?={(open: boolean) => void} onSubmit={(input: { url: string; title: string; description?: string; folderId: string | null }) => void} onDelete?={(id: string) => void} />` — same optional controlled-open pair, needed for the edit-link flow in Task 6.

- [ ] **Step 1: Write `FolderFormDialog.tsx`**

```tsx
"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COLOR_OPTIONS } from "@/components/resources/color-options";
import { ICON_OPTIONS } from "@/components/resources/icon-options";
import { cn } from "@/lib/utils";
import type { LinkFolder } from "@/lib/resources/types";

interface FolderFormDialogProps {
  trigger: ReactElement;
  folder?: LinkFolder;
  /** Omit both to let the dialog manage its own open state (the common case,
   * opened by clicking `trigger`). Pass both when another component needs
   * to open this dialog programmatically (see `editingFolder` in
   * ResourcesBoard, Task 6) instead of via a clickable trigger. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (input: { name: string; color: string; icon: string }) => void;
  onDelete?: (id: string) => void;
}

export function FolderFormDialog({
  trigger,
  folder,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSubmit,
  onDelete,
}: FolderFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpenState = setControlledOpen ?? setInternalOpen;
  const [name, setName] = useState(folder?.name ?? "");
  const [color, setColor] = useState(folder?.color ?? COLOR_OPTIONS[0]);
  const [icon, setIcon] = useState(folder?.icon ?? ICON_OPTIONS[0].name);

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(folder?.name ?? "");
      setColor(folder?.color ?? COLOR_OPTIONS[0]);
      setIcon(folder?.icon ?? ICON_OPTIONS[0].name);
    }
    setOpenState(next);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), color, icon });
    setOpenState(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{folder ? "Sửa thư mục" : "Thư mục mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="folder-name">Tên thư mục</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="AI Tools, CoralTask Docs,..."
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Màu</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Màu ${option}`}
                  onClick={() => setColor(option)}
                  className={cn(
                    "size-7 rounded-full ring-offset-2",
                    color === option && "ring-2 ring-slate-900"
                  )}
                  style={{ backgroundColor: option }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Biểu tượng</Label>
            <div className="grid grid-cols-8 gap-2">
              {ICON_OPTIONS.map(({ name: optionName, Icon }) => (
                <button
                  key={optionName}
                  type="button"
                  aria-label={optionName}
                  onClick={() => setIcon(optionName)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600",
                    icon === optionName && "border-slate-900 bg-slate-900 text-white"
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" className="flex-1">
              {folder ? "Lưu thay đổi" : "Tạo thư mục"}
            </Button>
            {folder && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label="Xóa thư mục"
                onClick={() => {
                  onDelete(folder.id);
                  setOpenState(false);
                }}
              >
                <Trash2Icon className="size-4" />
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Write `LinkFormDialog.tsx`**

```tsx
"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cleanDomainLabel } from "@/lib/resources/favicon";
import type { LinkFolder, QuickLink } from "@/lib/resources/types";

interface LinkFormDialogProps {
  trigger: ReactElement;
  link?: QuickLink;
  folders: LinkFolder[];
  /** Omit both to let the dialog manage its own open state. Pass both when
   * another component opens this dialog programmatically (see
   * `editingLink` in ResourcesBoard, Task 6). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (input: {
    url: string;
    title: string;
    description?: string;
    folderId: string | null;
  }) => void;
  onDelete?: (id: string) => void;
}

const NO_FOLDER_VALUE = "__none__";

export function LinkFormDialog({
  trigger,
  link,
  folders,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSubmit,
  onDelete,
}: LinkFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpenState = setControlledOpen ?? setInternalOpen;
  const [url, setUrl] = useState(link?.url ?? "");
  const [title, setTitle] = useState(link?.title ?? "");
  const [description, setDescription] = useState(link?.description ?? "");
  const [folderId, setFolderId] = useState<string>(link?.folderId ?? NO_FOLDER_VALUE);

  function handleOpenChange(next: boolean) {
    if (next) {
      setUrl(link?.url ?? "");
      setTitle(link?.title ?? "");
      setDescription(link?.description ?? "");
      setFolderId(link?.folderId ?? NO_FOLDER_VALUE);
    }
    setOpenState(next);
  }

  // If the user hasn't typed a title yet, suggest one from the domain once
  // they've finished typing the URL.
  function handleUrlBlur() {
    if (title.trim() || !url.trim()) return;
    try {
      setTitle(cleanDomainLabel(url));
    } catch {
      // Not a parseable URL yet; leave title blank, required-field
      // validation on submit will catch it.
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim() || !title.trim()) return;
    onSubmit({
      url: url.trim(),
      title: title.trim(),
      description: description.trim() || undefined,
      folderId: folderId === NO_FOLDER_VALUE ? null : folderId,
    });
    setOpenState(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{link ? "Sửa liên kết" : "Thêm liên kết mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://example.com"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link-title">Tiêu đề</Label>
            <Input
              id="link-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link-description">Mô tả (tùy chọn)</Label>
            <Input
              id="link-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Thư mục</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger>
                <SelectValue placeholder="Chưa phân loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FOLDER_VALUE}>Chưa phân loại</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" className="flex-1">
              {link ? "Lưu thay đổi" : "Lưu liên kết"}
            </Button>
            {link && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label="Xóa liên kết"
                onClick={() => {
                  onDelete(link.id);
                  setOpenState(false);
                }}
              >
                <Trash2Icon className="size-4" />
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors in the two new files.

- [ ] **Step 4: Commit**

```bash
git add src/components/resources/FolderFormDialog.tsx src/components/resources/LinkFormDialog.tsx
git commit -m "Add FolderFormDialog and LinkFormDialog"
```

---

### Task 6: `ResourcesBoard` client component + route files + nav entry

**Files:**
- Create: `src/components/resources/ResourcesBoard.tsx`
- Create: `src/app/(dashboard)/resources/ResourcesContent.tsx`
- Create: `src/app/(dashboard)/resources/page.tsx`
- Create: `src/app/(dashboard)/resources/loading.tsx`
- Modify: `src/components/layout/nav-items.ts`

**Interfaces:**
- Consumes: `getResources`, `createFolder`, `updateFolder`, `deleteFolder`, `createLink`, `updateLink`, `deleteLink`, `toggleLinkPinned` from `@/app/actions/resources`; `LinkFolder`, `QuickLink` from `@/lib/resources/types`; `FolderCard`, `FolderFormDialog`, `LinkFormDialog` from Task 4/5; shadcn `Input`, `Button`.
- Produces: the `/resources` route; `<ResourcesBoard folders links />` client component owning search text + optimistic-free refresh-via-router-pattern (same as other routes: server actions call `revalidatePath`, so after `await`ing an action the page's data will already be fresh on next navigation — but since this is a client component driving `useState` copies, each handler must also call `router.refresh()` so the current view picks up the revalidated data).

- [ ] **Step 1: Write `ResourcesBoard.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderCard } from "@/components/resources/FolderCard";
import { FolderFormDialog } from "@/components/resources/FolderFormDialog";
import { LinkFormDialog } from "@/components/resources/LinkFormDialog";
import {
  createFolder,
  createLink,
  deleteFolder,
  deleteLink,
  toggleLinkPinned,
  updateFolder,
  updateLink,
} from "@/app/actions/resources";
import { cleanDomainLabel } from "@/lib/resources/favicon";
import type { LinkFolder, QuickLink } from "@/lib/resources/types";

interface ResourcesBoardProps {
  folders: LinkFolder[];
  links: QuickLink[];
}

export function ResourcesBoard({ folders, links }: ResourcesBoardProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
  const [editingFolder, setEditingFolder] = useState<LinkFolder | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredLinks = useMemo(() => {
    if (!normalizedQuery) return links;
    return links.filter((link) => {
      const domain = (() => {
        try {
          return cleanDomainLabel(link.url).toLowerCase();
        } catch {
          return "";
        }
      })();
      return (
        link.title.toLowerCase().includes(normalizedQuery) || domain.includes(normalizedQuery)
      );
    });
  }, [links, normalizedQuery]);

  const filteredFolders = useMemo(() => {
    if (!normalizedQuery) return folders;
    return folders.filter((folder) => folder.name.toLowerCase().includes(normalizedQuery));
  }, [folders, normalizedQuery]);

  function linksFor(folderId: string | null) {
    return filteredLinks.filter((link) => link.folderId === folderId);
  }

  async function handleCreateFolder(input: { name: string; color: string; icon: string }) {
    await createFolder(input);
    router.refresh();
  }

  async function handleUpdateFolder(
    id: string,
    input: { name: string; color: string; icon: string }
  ) {
    await updateFolder(id, input);
    router.refresh();
  }

  async function handleDeleteFolder(id: string) {
    await deleteFolder(id);
    router.refresh();
  }

  async function handleCreateLink(input: {
    url: string;
    title: string;
    description?: string;
    folderId: string | null;
  }) {
    await createLink(input);
    router.refresh();
  }

  async function handleUpdateLink(
    id: string,
    input: { url: string; title: string; description?: string; folderId: string | null }
  ) {
    await updateLink(id, input);
    router.refresh();
  }

  async function handleDeleteLink(id: string) {
    await deleteLink(id);
    router.refresh();
  }

  async function handleTogglePinned(id: string, next: boolean) {
    await toggleLinkPinned(id, next);
    router.refresh();
  }

  function handleOpenLink(id: string) {
    const link = links.find((item) => item.id === id);
    if (link) window.open(link.url, "_blank", "noopener,noreferrer");
  }

  async function handleCopyLink(id: string) {
    const link = links.find((item) => item.id === id);
    if (link) await navigator.clipboard.writeText(link.url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm liên kết hoặc thư mục..."
            className="pl-9"
          />
        </div>
        <FolderFormDialog
          trigger={
            <Button type="button" variant="outline">
              <PlusIcon className="size-4" />
              Thư mục mới
            </Button>
          }
          onSubmit={handleCreateFolder}
        />
        <LinkFormDialog
          trigger={
            <Button type="button">
              <PlusIcon className="size-4" />
              Thêm liên kết
            </Button>
          }
          folders={folders}
          onSubmit={handleCreateLink}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredFolders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            links={linksFor(folder.id)}
            onOpenLink={handleOpenLink}
            onCopyLink={handleCopyLink}
            onToggleLinkPinned={handleTogglePinned}
            onEditLink={setEditingLink}
            onDeleteLink={handleDeleteLink}
            onEditFolder={setEditingFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        ))}

        <FolderCard
          folder={null}
          links={linksFor(null)}
          onOpenLink={handleOpenLink}
          onCopyLink={handleCopyLink}
          onToggleLinkPinned={handleTogglePinned}
          onEditLink={setEditingLink}
          onDeleteLink={handleDeleteLink}
        />
      </div>

      {editingLink && (
        <LinkFormDialog
          trigger={<span />}
          link={editingLink}
          folders={folders}
          open={editingLink !== null}
          onOpenChange={(next) => {
            if (!next) setEditingLink(null);
          }}
          onSubmit={(input) => {
            handleUpdateLink(editingLink.id, input);
            setEditingLink(null);
          }}
          onDelete={(id) => {
            handleDeleteLink(id);
            setEditingLink(null);
          }}
        />
      )}

      {editingFolder && (
        <FolderFormDialog
          trigger={<span />}
          folder={editingFolder}
          open={editingFolder !== null}
          onOpenChange={(next) => {
            if (!next) setEditingFolder(null);
          }}
          onSubmit={(input) => {
            handleUpdateFolder(editingFolder.id, input);
            setEditingFolder(null);
          }}
          onDelete={(id) => {
            handleDeleteFolder(id);
            setEditingFolder(null);
          }}
        />
      )}
    </div>
  );
}
```

This relies on `FolderFormDialog`/`LinkFormDialog` already accepting optional `open`/`onOpenChange` props from Task 5 — when passed, those drive the dialog instead of its internal state, which is required here since the `<span />` trigger used for the edit flow can't be clicked to open the dialog; it must open as soon as `editingLink`/`editingFolder` is set.

- [ ] **Step 2: Write the route's server component — `ResourcesContent.tsx`**

```tsx
import { getResources } from "@/app/actions/resources";
import { ResourcesBoard } from "@/components/resources/ResourcesBoard";
import { TopBar } from "@/components/layout/TopBar";

export async function ResourcesContent() {
  const { folders, links } = await getResources();

  return (
    <div className="min-h-screen bg-slate-100/70">
      <TopBar title="Tài nguyên" overdueCount={0} />
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <ResourcesBoard folders={folders} links={links} />
      </div>
    </div>
  );
}
```

Check `src/components/layout/TopBar.tsx`'s actual prop names before using it in this step — if `overdueCount` is required and doesn't make sense here, check whether it's optional; if it's required with no sensible default, render the page header without `TopBar` and use a plain `<h1>` instead, matching whichever is less awkward in that component's real signature.

- [ ] **Step 3: Write `page.tsx` and `loading.tsx`**

```tsx
// src/app/(dashboard)/resources/page.tsx
import { Suspense } from "react";
import { ResourcesContent } from "@/app/(dashboard)/resources/ResourcesContent";

export default function ResourcesPage() {
  return (
    <Suspense>
      <ResourcesContent />
    </Suspense>
  );
}
```

```tsx
// src/app/(dashboard)/resources/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function ResourcesLoading() {
  return (
    <div className="min-h-screen bg-slate-100/70">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-4 sm:px-8">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="size-10 shrink-0 rounded-full" />
      </div>
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add the nav entry**

Edit `src/components/layout/nav-items.ts`:

```ts
import { CalendarDays, LayoutDashboard, Link2 } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Tổng quan", shortLabel: "Tổng quan", icon: LayoutDashboard },
  { href: "/analytics", label: "Lịch & Sự kiện", shortLabel: "Lịch", icon: CalendarDays },
  { href: "/resources", label: "Tài nguyên", shortLabel: "Tài nguyên", icon: Link2 },
] as const;
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors in any file touched this task.

- [ ] **Step 6: Commit**

```bash
git add src/components/resources/ResourcesBoard.tsx "src/app/(dashboard)/resources" src/components/layout/nav-items.ts
git commit -m "Add Resources route, board UI, and sidebar nav entry"
```

---

### Task 7: Manual browser QA

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Walk the golden path**

In the browser, log in, open "Tài nguyên" from the sidebar, and verify:
1. The page loads with an empty "Chưa phân loại" card and no folders.
2. "Thư mục mới" creates a folder with a chosen color/icon; it appears as a card.
3. "Thêm liên kết" with a bare URL (e.g. `github.com`) auto-suggests a title on blur and saves with a visible favicon thumbnail.
4. The new link appears under the chosen folder (or "Chưa phân loại" if none chosen).
5. Pinning a link moves it above unpinned links in the same folder on refresh.
6. Editing a link (via the pencil icon) opens pre-filled and saves changes.
7. Editing a folder (name/color/icon) updates the card.
8. Deleting a folder keeps its links, now shown under "Chưa phân loại".
9. Deleting a link removes it.
10. The search box filters both folder names and link titles/domains live.
11. "Open in new tab" and "Copy URL" hover actions work.

- [ ] **Step 3: Confirm RLS isolation**

If a second test account is available, confirm it sees no folders/links created by the first account. If not available, at minimum re-read the migration's policies and confirm each one filters on `auth.uid() = user_id`.

- [ ] **Step 4: Fix anything broken**

Go back to the relevant task's files and fix issues found during manual QA; re-run Step 2 for the affected flows.

- [ ] **Step 5: Final commit (if fixes were needed)**

```bash
git add -A
git commit -m "Fix issues found during Quick Links manual QA"
```

---

## Self-Review Notes

- Spec coverage: schema ✅ (Task 1), server actions ✅ (Task 3), nav ✅ (Task 6), search ✅ (Task 6), folder grid/link cards/hover actions ✅ (Task 4), modals + color/icon pickers ✅ (Task 5), favicon auto-extraction ✅ (Task 2/3), pin-to-top ordering ✅ (Task 4's `FolderCard` sort), manual testing ✅ (Task 7). Drag-and-drop intentionally omitted per the approved design.
- Task 5's dialogs take optional controlled `open`/`onOpenChange` props specifically so Task 6's edit flows (editing an existing folder/link via a non-clickable `<span />` trigger) can drive them externally — confirmed both tasks' code agrees on this interface.
