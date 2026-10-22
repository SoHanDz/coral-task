# Task Model Rework (Start/End Date + Habits Split) — Design

## Purpose

This is sub-project A of a larger set of changes (habit-tracking page, nav
restructure — tracked separately). It fixes two problems in the current task
model:

1. One-time tasks only have a single `due_date`, so a task created today with
   a deadline tomorrow is invisible today — it only appears on its due date.
   This encourages pushing undone tasks forward instead of seeing them land
   on the day the user meant to work on them.
2. Recurring ("daily") tasks are implemented by cloning a new row into
   `tasks` each time the current instance is completed
   (`updateTaskStatus` in `src/app/actions/tasks.ts`). Unticking and
   re-ticking the same day's instance clones a second "tomorrow" row,
   producing a duplicate. This model also doesn't support the streak/
   frequency statistics the upcoming "Dựng thói quen" (habit) page needs.

This rework also lays the data foundation (`habits` / `habit_logs`) that the
habit-tracking page (sub-project B) will read from. B is a separate design;
this spec only needs to produce tables and actions B can build on.

## Non-goals

- The year-calendar view, GitHub-style green/gray day coloring, streak
  statistics, quotes, and the habit delete-confirmation flow are sub-project
  B, designed separately.
- Nav restructure, header/avatar menu, sticky sidebar are sub-project C,
  unrelated to the data model.
- No migration of existing `recurrence='daily'` rows in `tasks` — there is no
  important historical data yet, so old daily rows are simply left behind
  (ignored by new code) or deleted by hand; not scripted.
- Weekly/monthly recurrence is removed entirely, not just hidden.

## Data model

New migration `supabase/migrations/0007_task_habit_rework.sql`:

```sql
alter table public.tasks rename column due_date to start_date;
alter table public.tasks add column end_date timestamptz;
update public.tasks set end_date = start_date where end_date is null;
alter table public.tasks alter column end_date set not null;
alter table public.tasks alter column start_date set not null;
alter table public.tasks drop column recurrence;

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  due_time time not null default '23:59',
  created_at timestamptz not null default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  completed_at timestamptz,
  unique (habit_id, log_date)
);

create index on public.habits (user_id);
create index on public.habit_logs (habit_id);
create index on public.habit_logs (user_id, log_date);

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
-- select/insert/update/delete policies on both, scoped to user_id = auth.uid()
```

Notes:
- `start_date`/`end_date` are both `not null`. The form always supplies both
  (default `start_date = now()`, `end_date = endOfDay(now())`), so a one-time
  task with no explicit range still behaves exactly like today's single-date
  task.
- `habit_logs` has one row per habit per day it was *acted on* (ticked or
  unticked back) — not one row per day in existence. A habit with no log row
  for a given date is treated as "not completed" for that date. This keeps
  the table small and makes "did X on day Y" an upsert, never an insert of a
  new independent row — eliminating the duplicate-row bug class entirely.
- `due_time` on `habits` is the daily deadline time-of-day shown in the form
  (mirrors today's due-date-with-time picker, but only the time part is
  meaningful since the habit recurs every day).

## Types (`src/lib/tasks/types.ts`, new `src/lib/habits/types.ts`)

`src/lib/tasks/types.ts`:
- Remove `Recurrence`, `RECURRENCE_LABELS`.
- `Task.dueDate` → `Task.startDate: Date` + `Task.endDate: Date` (both
  required, no longer nullable — a task always has a concrete window).

`src/lib/habits/types.ts` (new):
```ts
export interface Habit {
  id: string;
  title: string;
  description: string | null;
  dueTime: string; // "HH:mm"
  createdAt: Date;
}

export interface HabitLog {
  habitId: string;
  logDate: string; // "yyyy-MM-dd"
  completed: boolean;
  completedAt: Date | null;
}
```

## Server actions

`src/app/actions/tasks.ts`:
- `createTask`/`updateTask` input: `{ title, description, startDate: Date, endDate: Date, subtasks }` (no `recurrence`).
- `getTasksForDate(date)`: range-overlap query — `start_date <= endOfDay(date) AND end_date >= startOfDay(date)` — instead of exact match on a single column.
- `getOverdueTasks()`: `status = 'pending' AND end_date < startOfDay(now())` (overdue now means the window's end passed, not a single due date).
- `updateTaskStatus`: drop the entire "clone next instance" branch and `nextDueDate` helper — tasks are one-time only now, completing one never creates another row.
- `rescheduleTaskToToday`: sets both `start_date = startOfDay(now())` and `end_date = endOfDay(now())`, collapsing the window onto today (same visible effect as today's single-field reschedule).

`src/app/actions/habits.ts` (new), same `requireUser()` + `revalidatePath` pattern as `tasks.ts`:
- `getHabits()` — all habits for the user.
- `getHabitLogsForDate(date)` — all logs for that date (used to know which habits are ticked).
- `createHabit(input: { title, description, dueTime })`
- `updateHabit(id, input)`
- `deleteHabit(id)` — cascades to `habit_logs` via FK.
- `setHabitLogStatus(habitId, date, completed)` — **upsert** on `(habit_id, log_date)`: sets `completed_at = now()` or `null`. This single upsert is what replaces the old insert-a-new-row logic and is immune to the untick/retick duplicate bug by construction.

## UI

`TaskForm` (quick add) and `TaskFormDialog` (full create/edit dialog):
- Add a "Loại" select, default **"Chỉ một lần"**: options `once` / `daily`.
  This is a client-only, transient choice at creation time — it decides which
  server action to call, not a stored column (one-time tasks and habits live
  in different tables, so there is nothing to "switch" after creation; the
  type selector is hidden/disabled when editing an existing item).
- `once` selected → show two pickers, "Bắt đầu" and "Kết thúc" (both
  required; defaults: start = now, end = end of today). Submits via
  `createTask`/`updateTask`.
- `daily` selected → show a single "Hạn chót" time picker (same control
  used today), no date range. Submits via `createHabit`/`updateHabit`.
- When the dialog opens for an existing item, it shows the once/daily layout
  matching what that item already is (`Task` → once layout; `Habit` → daily
  layout), with the type select removed/disabled.

`TasksOverviewSection` (Todo page):
- Keeps rendering one-time tasks for `selectedDate` as it does today (now
  filtered by the new range-overlap query), in a "Công việc" block.
- Adds a second block below, "Thói quen hàng ngày": lists all habits with
  their `HabitLog` for `selectedDate` (defaulting to not-completed if no log
  row exists), each with a checkbox wired to `setHabitLogStatus`. This block
  is always driven by `selectedDate`, consistent with the tasks block above
  it, rather than being hard-pinned to "today" regardless of navigation.
- The two blocks never merge into one list — a habit is never shown mixed in
  with one-time tasks.

`DashboardCalendarCard`:
- `datesWithTasks` changes from "set of exact `dueDate` keys" to "every date
  key in `eachDayOfInterval({ start: task.startDate, end: task.endDate })`,
  unioned over all tasks" — a multi-day task now dots every day it spans, not
  just one.
- `datesOverdue` same idea, keyed off `end_date < today` for pending tasks.
- Habits are not shown on this calendar (it's the one-time-task navigator for
  the Todo page); habit-specific calendar visuals belong to sub-project B.

## Edge cases

- A one-time task's `start_date` can be after `end_date` if the user picks
  them wrong — the date pickers should clamp (`end` picker's min = selected
  `start`), not rely on server-side validation only.
- Deleting a habit deletes all of its `habit_logs` (cascade) — streak
  history for that habit is gone, which is expected since the habit itself is
  gone.
- `getOverdueTasks()` / the "Hôm nay" roll-forward in `TasksOverviewSection`
  operate on `end_date` now, so a multi-day task isn't flagged overdue until
  its whole window has passed, not just its first day.

## Testing

- Unit-level: `getTasksForDate` range-overlap logic (task spanning multiple
  days appears on each), `setHabitLogStatus` upsert (tick → untick → tick
  again produces exactly one `habit_logs` row, never two).
- Manual: create a one-time task spanning 3 days, confirm it shows on all 3
  in both the Todo list and the mini calendar dots; create a daily habit,
  tick/untick/tick on the same day and confirm no duplicate and the habit
  list reflects correct state across a day change.
