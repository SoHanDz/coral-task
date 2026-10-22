# Habit Tracking Page + Navigation Polish — Design

This covers the two remaining sub-projects from the original request:

- **Part 1 — "Dựng thói quen" page** (architectural): new habit-tracking
  page with a year calendar, daily checklist, frequency stats, streak
  messaging, a rotating quote, and full habit CRUD with a GitHub-style
  delete flow.
- **Part 2 — Navigation & small UI fixes** (bounded): rename "Tổng quan" →
  "Todo List", group Todo List + Dựng thói quen under a "Công việc" submenu,
  drop the header bell, add a logout entry under the avatar, make the
  sidebar sticky.

Part 1 depends on the `habits` / `habit_logs` tables and actions from
[`2026-10-22-task-model-rework-design.md`](./2026-10-22-task-model-rework-design.md)
(sub-project A) — it only reads/writes through those, no new base tables for
tasks. Part 2 is independent of A and B.

Per the user's choices during brainstorming:
- The streak call-out sentence uses the **current** (ongoing) streak of the
  single most-completed habit, hidden when that streak is 0.
- "Khác" opens a **modal** listing every non-top-3 habit with its count.
- A day before any habit existed yet is colored **distinctly** (not green,
  not the "missed" gray) so "no habit existed" reads differently from "habit
  existed but wasn't done".
- The quote widget holds a **list** of quotes the user maintains; one is
  picked at random each time the page loads.

## Part 1 — "Dựng thói quen" page

### Data additions

New migration (next number after sub-project A's), adds only a quotes table
— habits/logs already exist from sub-project A:

```sql
create table public.habit_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index on public.habit_quotes (user_id);
alter table public.habit_quotes enable row level security;
-- select/insert/update/delete policies scoped to user_id = auth.uid()
```

### Stats library (`src/lib/habits/stats.ts`, new)

Pure functions operating on `Habit[]` + `HabitLog[]` (already fetched),
mirroring the existing `getDailyTaskStats` pattern in `lib/tasks/stats.ts`:

- `getDayState(habits, logs, date)` → `"all-done" | "missed" | "no-habit"`
  per day: `"no-habit"` if no habit's `createdAt <= date`; else `"all-done"`
  if every applicable habit has a completed log for that date; else
  `"missed"`. This drives the year-grid color (green / gray / neutral).
- `getCurrentStreak(habitId, logs, today)` — consecutive completed days
  ending today (0 if today isn't completed).
- `getBestStreak(habitId, logs)` — longest consecutive completed run ever.
- `getLongestBreak(habitId, logs, createdAt)` — longest consecutive
  not-completed run between `createdAt` and today.
- `getCompletedDaysCount(habitId, logs)` — total completed-day count.
- `rankByFrequency(habits, logs)` → sorted list of `{ habit, count }`; caller
  slices top 3 + sums the rest into "Khác".

### Year calendar (`src/components/habits/HabitYearGrid.tsx`, new)

Visually mirrors `YearGrid` (same `getMonthsData`/`getYearProgress` header:
year, "DAY xxx/365", % of year complete) but with its own day-dot coloring
instead of task-based tooltips:

- `today` state: same enlarged/ringed treatment `DayDot` already has for
  `state === "today"` — reused as-is.
- `all-done` → green dot (GitHub-style), `missed` → gray dot, `no-habit` →
  a third neutral/lighter dot style (e.g. outlined, no fill) distinct from
  both.
- Tooltip per day: `${completed}/${total} thói quen hoàn thành` (skipped for
  `no-habit` days).

Implementation: extract a small shared `MonthGrid` iteration helper (or just
duplicate the ~15-line nested-grid markup from `YearGrid` — it's small
enough that a shared abstraction isn't required) and add a sibling `DayDot`
variant (`HabitDayDot`) with the 3-state color map above, since the existing
`DayDot` is wired specifically to `DayState` (past/today/future) + task
tooltip shape and shouldn't be overloaded with a second, unrelated meaning
for its colors.

### Page layout (`src/app/(dashboard)/habits/`, new route `/habits`)

Top to bottom:
1. `TopBar` (title "Dựng thói quen").
2. `HabitYearGrid`.
3. Stats row: top-3 habit cards (title + completed-day count) + one "Khác"
   card (sum of the rest) that opens a modal listing every remaining habit
   with its count.
4. Streak callout: `"Bạn đã liên tục thực hiện {top-1 habit} liên tục {N}
   ngày"`, rendered only when the top-1 habit's current streak ≥ 1.
5. Quote widget: shows one random `habit_quotes` row on load; a small
   "Quản lý quote" affordance opens a simple list editor (add/edit/delete
   rows) — reuses `Dialog` + `Input` the way `TaskFormDialog` does.
6. Habit checklist for **today**: every habit, checkbox wired to
   `setHabitLogStatus(habitId, todayKey, completed)` (same action added in
   sub-project A). Clicking a habit's row (not its checkbox) opens the
   detail view instead of toggling.

### Habit detail / edit (`src/components/habits/HabitDetailDialog.tsx`, new)

Click → read-only detail view: title, description, `createdAt`,
`getCompletedDaysCount`, `getBestStreak`, `getLongestBreak`. An "Sửa" button
switches the same dialog into the edit form (title/description/`dueTime`),
submitting through `updateHabit`. A "Xóa" button starts the delete flow
below. This mirrors how `TaskFormDialog` already toggles between view and
edit affordances for subtasks.

### Delete flow (`src/components/habits/DeleteHabitDialog.tsx`, new)

1. "Xóa" opens a confirm modal: "Bạn có chắc chắn muốn xóa?" with two
   buttons — **Xóa** (left, default/white) and **Đừng xóa** (right, blue/
   primary).
2. Pressing and holding **Xóa** fills it with a progress animation over 3s
   (`requestAnimationFrame`-driven width/background fill). Releasing before
   3s reverses the animation back from whatever fill level it reached to 0
   (not an instant reset) — implemented as a single animated value driven by
   pointerdown/pointerup, not two separate CSS animations.
3. On reaching the 3s hold, the modal reveals a text input: "Nhập **{habit
   title}** để xác nhận xóa" (same pattern as GitHub repo deletion). A final
   "Xóa vĩnh viễn" button stays disabled until the typed text matches the
   habit's title exactly; clicking it calls `deleteHabit` and closes the
   dialog.
4. Releasing the hold before 3s (or closing the modal) discards the reveal —
   the type-to-confirm step never appears until the hold completes once.

## Part 2 — Navigation & small UI fixes (bounded)

- `nav-items.ts`: restructure into a tree — a "Công việc" parent entry with
  two children (`{ href: "/", label: "Todo List" }`,
  `{ href: "/habits", label: "Dựng thói quen" }`), plus the existing
  "Lịch & Sự kiện" and "Tài nguyên" as flat top-level entries.
- `Sidebar.tsx` (desktop): renders "Công việc" as an expandable group
  (click to toggle, auto-expanded when the active route is one of its
  children); children indent under it. Also add `sticky top-0` to the
  `<aside>` — the dashboard layout's outer container is `min-h-screen`
  (grows with page content) while the sidebar is `h-screen` with normal flow
  positioning, so on a tall page it scrolls away with the content instead of
  staying pinned; `sticky top-0` fixes that without restructuring the layout.
- `MobileNav.tsx` (bottom tab bar): flattens the tree instead of nesting —
  shows Todo List, Dựng thói quen, Lịch & Sự kiện, Tài nguyên as four flat
  tabs (no room for a submenu at this width).
- `TopBar.tsx`: remove the `overdueCount`/Bell affordance entirely (prop and
  JSX), including its two call sites in `OverviewContent.tsx` and
  `AnalyticsContent.tsx`. The avatar circle becomes a `DropdownMenu` trigger
  (component already in `src/components/ui/dropdown-menu.tsx`) with one item,
  "Đăng xuất", posting to the existing `signOut` action from
  `src/app/login/actions.ts` (same action `SidebarProfile.tsx` already
  uses). The avatar renders whenever `email` is available, independent of
  `title` being set, so it's reachable from every page on mobile (today it's
  only rendered on the title-less Overview page).

## Testing

- Part 1: unit tests for `getDayState`/`getCurrentStreak`/`getBestStreak`/
  `getLongestBreak` against hand-built log fixtures (including a habit
  created mid-range, to check `no-habit` days resolve correctly). Manual:
  create 2 habits, complete one for 3 days running, confirm streak callout
  and best-streak figure match; run the delete flow for a habit including
  releasing the hold early and confirming the reveal never appears.
- Part 2: manual check — sidebar stays pinned on a long scroll, mobile
  bottom nav shows 4 flat tabs, avatar dropdown logs out from a
  title-mode page (e.g. Tài nguyên) on a mobile viewport.
