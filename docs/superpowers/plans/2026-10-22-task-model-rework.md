# Task Model Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give one-time tasks a real start/end window (instead of a single due date) and move daily recurring tasks out of `tasks` into a dedicated `habits` + `habit_logs` model, eliminating the clone-a-row-per-day bug and laying the data foundation the future habit-tracking page will read from.

**Architecture:** One new Supabase migration adds `start_date`/`end_date` to `tasks` (dropping `recurrence`) and creates `habits` + `habit_logs` (one row per habit per day it was acted on, upserted — never cloned). `src/app/actions/tasks.ts` and a new `src/app/actions/habits.ts` are the only places that touch these tables; every UI change is downstream of their new input/output shapes. The Todo page keeps one-time tasks and daily habits as two separate, never-merged list blocks.

**Tech Stack:** Next.js (App Router, Server Actions), Supabase (Postgres + RLS), TypeScript strict mode, date-fns.

**Spec:** `docs/superpowers/specs/2026-10-22-task-model-rework-design.md`

**Testing approach for this plan:** This repo has no test runner (no `*.test.*` files, no Jest/Vitest in `package.json`) and all mutations are Server Actions hitting a real Supabase instance, which existing code never mocks. Introducing a new test framework for this one plan would be disproportionate (YAGNI) and inconsistent with the codebase as it stands. Each task instead uses a **type-driven red/green cycle**: a type/signature changes first (red — `npx tsc --noEmit` lists every now-broken call site), then every listed call site is fixed until the project compiles clean again (green). The final task adds a manual QA pass that exercises the actual bug this plan fixes.

## Global Constraints

- No migration of existing `recurrence='daily'` rows in `tasks` — leave them or delete by hand, not scripted (per spec's Non-goals).
- Weekly/monthly recurrence is removed entirely, not hidden.
- `start_date`/`end_date` on `tasks` are both `not null` — a task always has a concrete window, never "no due date".
- `habit_logs` holds one row per `(habit_id, log_date)` **ever acted on** — ticking/unticking/re-ticking the same day must stay exactly one row (upsert, never insert).
- Habit editing/deleting UI is explicitly **out of scope** for this plan (belongs to the separate habit-tracking-page plan) — the Todo page's habit block in this plan is checkbox-only, no click-to-edit.

---

### Task 1: Database migration — `tasks` start/end window + `habits`/`habit_logs`

**Files:**
- Create: `supabase/migrations/0007_task_habit_rework.sql`

**Interfaces:**
- Produces: `public.tasks` columns `start_date timestamptz not null`, `end_date timestamptz not null` (replacing `due_date`/`recurrence`, which are gone). `public.habits(id, user_id, title, description, due_time, created_at)`. `public.habit_logs(id, habit_id, user_id, log_date, completed_at)` with a unique constraint on `(habit_id, log_date)` — every later task's upsert logic depends on that constraint existing.

- [ ] **Step 1: Write the migration**

```sql
-- Task model rework: one-time tasks get a start/end window instead of a
-- single due date; daily recurring tasks move out of `tasks` entirely into
-- a dedicated habit + per-day completion log, so completing/unticking a
-- habit never clones a new row (the old recurrence bug class).
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

create index habits_user_id_idx on public.habits (user_id);
create index habit_logs_habit_id_idx on public.habit_logs (habit_id);
create index habit_logs_user_id_log_date_idx on public.habit_logs (user_id, log_date);

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "Users can view their own habits"
  on public.habits for select
  using (auth.uid() = user_id);

create policy "Users can create their own habits"
  on public.habits for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own habits"
  on public.habits for update
  using (auth.uid() = user_id);

create policy "Users can delete their own habits"
  on public.habits for delete
  using (auth.uid() = user_id);

create policy "Users can view their own habit logs"
  on public.habit_logs for select
  using (auth.uid() = user_id);

create policy "Users can create their own habit logs"
  on public.habit_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own habit logs"
  on public.habit_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete their own habit logs"
  on public.habit_logs for delete
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply it to the Supabase project**

There is no Supabase CLI config in this repo (`supabase/migrations` is the only folder — no `config.toml`), so this plan can't assume `supabase db push` is wired up. Paste the SQL above into the Supabase project's SQL editor and run it (or `supabase db push` yourself if you do have the CLI linked).

- [ ] **Step 3: Verify in the SQL editor**

Run:
```sql
select column_name from information_schema.columns where table_name = 'tasks';
```
Expected: `start_date` and `end_date` present, `due_date` and `recurrence` absent.

Run:
```sql
select * from public.habits limit 1;
select * from public.habit_logs limit 1;
```
Expected: both return an empty result set with no error (tables exist, RLS doesn't error out for an authenticated query — 0 rows is correct since nothing's been inserted yet).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0007_task_habit_rework.sql
git commit -m "feat: migrate tasks to start/end window, add habits/habit_logs tables"
```

---

### Task 2: Types — `Task` gets start/end window, new `Habit`/`HabitLog`

**Files:**
- Modify: `src/lib/tasks/types.ts`
- Create: `src/lib/habits/types.ts`

**Interfaces:**
- Produces: `Task { id, title, description, startDate: Date, endDate: Date, status, createdAt, completedAt, subtasks }` (no `recurrence`, no nullable dates). `Habit { id, title, description, dueTime: string /* "HH:mm" */, createdAt }`. `HabitLog { habitId, logDate: string /* "yyyy-MM-dd" */, completed: boolean, completedAt: Date | null }`.
- Consumes: nothing (leaf types).

- [ ] **Step 1: Rewrite `src/lib/tasks/types.ts`**

```ts
export type TaskStatus = "pending" | "completed";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  status: TaskStatus;
  createdAt: Date;
  completedAt: Date | null;
  subtasks: Subtask[];
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Chưa làm",
  completed: "Đã xong",
};
```

- [ ] **Step 2: Create `src/lib/habits/types.ts`**

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

- [ ] **Step 3: Run the type checker and confirm the expected failures (red)**

Run: `npx tsc --noEmit`
Expected: a list of errors, all about `recurrence`, `Recurrence`, `RECURRENCE_LABELS`, or `dueDate` not existing — in `src/app/actions/tasks.ts`, `src/lib/tasks/overdue.ts`, `src/lib/tasks/stats.ts`, `src/components/tasks/TaskFormDialog.tsx`, `src/components/tasks/TaskForm.tsx`, `src/components/tasks/TaskItem.tsx`, `src/components/tasks/TaskDayItem.tsx`, `src/components/tasks/TasksOverviewSection.tsx`, `src/components/dashboard/DashboardCalendarCard.tsx`, `src/hooks/use-tasks.ts`, `src/app/dev/tasks/TasksDevClient.tsx`. No error should be about anything else — if one is, stop and investigate before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/tasks/types.ts src/lib/habits/types.ts
git commit -m "feat: replace Task.dueDate/recurrence with start/end window, add Habit/HabitLog types"
```

---

### Task 3: Rewrite `src/app/actions/tasks.ts` for the new window + drop recurrence cloning

**Files:**
- Modify: `src/app/actions/tasks.ts`

**Interfaces:**
- Consumes: `Task`, `Subtask`, `TaskStatus` from `@/lib/tasks/types` (Task 2).
- Produces: `getTasks(): Promise<Task[]>`, `getTasksForDate(date: Date): Promise<Task[]>` (range-overlap, not exact match), `getOverdueTasks(): Promise<Task[]>`, `createTask(input: { title, description, startDate: Date, endDate: Date, subtasks }): Promise<Task>`, `updateTask(id, input: same shape as createTask's input): Promise<void>`, `updateTaskStatus(id, status): Promise<void>` (no longer clones a next instance — this is the bug fix), `rescheduleTaskToToday(id): Promise<void>`, `deleteTask(id): Promise<void>`.

- [ ] **Step 1: Replace the file**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import { requireUser } from "@/lib/supabase/require-user";
import type { Subtask, Task, TaskStatus } from "@/lib/tasks/types";

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  start_date: string;
  end_date: string;
  created_at: string;
  completed_at: string | null;
  subtasks: Subtask[];
}

const TASK_COLUMNS =
  "id, title, description, status, start_date, end_date, created_at, completed_at, subtasks";

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    // parseISO (not `new Date(string)`) so a date-only value is read as
    // local midnight instead of UTC midnight, which is what shifts a day
    // back once formatted in GMT+7.
    startDate: parseISO(row.start_date),
    endDate: parseISO(row.end_date),
    createdAt: parseISO(row.created_at),
    completedAt: row.completed_at ? parseISO(row.completed_at) : null,
    subtasks: row.subtasks ?? [],
  };
}

function revalidateDashboard() {
  revalidatePath("/");
  revalidatePath("/analytics");
}

export async function getTasks(): Promise<Task[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("user_id", userId)
    .order("start_date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as TaskRow[]).map(mapTask);
}

/** Tasks whose [start_date, end_date] window overlaps the given day. */
export async function getTasksForDate(date: Date): Promise<Task[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("user_id", userId)
    .lte("start_date", endOfDay(date).toISOString())
    .gte("end_date", startOfDay(date).toISOString());

  if (error) throw new Error(error.message);
  return (data as TaskRow[]).map(mapTask);
}

export async function getOverdueTasks(): Promise<Task[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("end_date", startOfDay(new Date()).toISOString());

  if (error) throw new Error(error.message);
  return (data as TaskRow[]).map(mapTask);
}

export async function createTask(input: {
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  subtasks: Subtask[];
}): Promise<Task> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      start_date: input.startDate.toISOString(),
      end_date: input.endDate.toISOString(),
      status: "pending",
      subtasks: input.subtasks,
    })
    .select(TASK_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidateDashboard();
  return mapTask(data as TaskRow);
}

export async function updateTask(
  id: string,
  input: {
    title: string;
    description: string | null;
    startDate: Date;
    endDate: Date;
    subtasks: Subtask[];
  }
): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({
      title: input.title,
      description: input.description,
      start_date: input.startDate.toISOString(),
      end_date: input.endDate.toISOString(),
      subtasks: input.subtasks,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateDashboard();
}

/**
 * Tasks are one-time only now — toggling status never creates another row,
 * so there is nothing left to duplicate (the old bug cloned a "next day"
 * row here on every pending->completed transition of a recurring task).
 */
export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateDashboard();
}

export async function rescheduleTaskToToday(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({
      start_date: startOfDay(new Date()).toISOString(),
      end_date: endOfDay(new Date()).toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateDashboard();
}

export async function deleteTask(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateDashboard();
}
```

- [ ] **Step 2: Run the type checker**

Run: `npx tsc --noEmit`
Expected: no more errors reference `src/app/actions/tasks.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/tasks.ts
git commit -m "fix: drop recurrence row-cloning, query tasks by start/end window overlap"
```

---

### Task 4: `src/app/actions/habits.ts` — habit CRUD + upsert-based completion log

**Files:**
- Create: `src/app/actions/habits.ts`

**Interfaces:**
- Consumes: `Habit`, `HabitLog` from `@/lib/habits/types` (Task 2); `requireUser` from `@/lib/supabase/require-user`.
- Produces: `getHabits(): Promise<Habit[]>`, `getHabitLogs(): Promise<HabitLog[]>` (every log for the user, unfiltered — the Todo page filters client-side by day the same way it already does for tasks), `createHabit(input: { title, description, dueTime }): Promise<Habit>`, `updateHabit(id, input): Promise<void>`, `deleteHabit(id): Promise<void>`, `setHabitLogStatus(habitId: string, logDate: string, completed: boolean): Promise<void>` — upserts on `(habit_id, log_date)`, the one function later UI tasks call to toggle a habit for a day.

- [ ] **Step 1: Write the file**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { parseISO } from "date-fns";
import { requireUser } from "@/lib/supabase/require-user";
import type { Habit, HabitLog } from "@/lib/habits/types";

interface HabitRow {
  id: string;
  title: string;
  description: string | null;
  due_time: string;
  created_at: string;
}

interface HabitLogRow {
  habit_id: string;
  log_date: string;
  completed_at: string | null;
}

const HABIT_COLUMNS = "id, title, description, due_time, created_at";
const HABIT_LOG_COLUMNS = "habit_id, log_date, completed_at";

function mapHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueTime: row.due_time.slice(0, 5),
    createdAt: parseISO(row.created_at),
  };
}

function mapHabitLog(row: HabitLogRow): HabitLog {
  return {
    habitId: row.habit_id,
    logDate: row.log_date,
    completed: row.completed_at !== null,
    completedAt: row.completed_at ? parseISO(row.completed_at) : null,
  };
}

function revalidateHabits() {
  revalidatePath("/");
  revalidatePath("/habits");
}

export async function getHabits(): Promise<Habit[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("habits")
    .select(HABIT_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as HabitRow[]).map(mapHabit);
}

/** All completion logs for the user, across every habit and day. */
export async function getHabitLogs(): Promise<HabitLog[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("habit_logs")
    .select(HABIT_LOG_COLUMNS)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return (data as HabitLogRow[]).map(mapHabitLog);
}

export async function createHabit(input: {
  title: string;
  description: string | null;
  dueTime: string;
}): Promise<Habit> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      due_time: input.dueTime,
    })
    .select(HABIT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidateHabits();
  return mapHabit(data as HabitRow);
}

export async function updateHabit(
  id: string,
  input: { title: string; description: string | null; dueTime: string }
): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("habits")
    .update({
      title: input.title,
      description: input.description,
      due_time: input.dueTime,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateHabits();
}

export async function deleteHabit(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("habits").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateHabits();
}

/**
 * Upserts a single day's completion for a habit — never inserts a second
 * row for the same (habit, day), so ticking, unticking, and re-ticking the
 * same day stays exactly one row. Relies on the unique (habit_id, log_date)
 * constraint from the 0007 migration.
 */
export async function setHabitLogStatus(
  habitId: string,
  logDate: string,
  completed: boolean
): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("habit_logs").upsert(
    {
      habit_id: habitId,
      user_id: userId,
      log_date: logDate,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "habit_id,log_date" }
  );

  if (error) throw new Error(error.message);
  revalidateHabits();
}
```

- [ ] **Step 2: Run the type checker**

Run: `npx tsc --noEmit`
Expected: no errors reference `src/app/actions/habits.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/habits.ts
git commit -m "feat: add habit CRUD and upsert-based daily completion log actions"
```

---

### Task 5: `src/lib/tasks/overdue.ts` — key off `endDate` instead of `dueDate`

**Files:**
- Modify: `src/lib/tasks/overdue.ts`

**Interfaces:**
- Consumes: `Task` from `@/lib/tasks/types` (Task 2) — now with non-nullable `endDate`.
- Produces: `isOverdue(task, referenceDate?): boolean`, `getOverdueDays(task, referenceDate?): number | null`, `getCompletionDelay(task): CompletionDelay | null` — same signatures as before, callers in later tasks are unaffected.

- [ ] **Step 1: Replace `dueDate` with `endDate`, drop the now-unnecessary null checks**

```ts
import { differenceInCalendarDays, endOfDay, formatDistanceStrict, isBefore, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import type { Task } from "@/lib/tasks/types";

/**
 * Overdue = still pending AND end_date is strictly before today (date-only,
 * time-of-day ignored on both sides so an end date of "today" is never overdue).
 */
export function isOverdue(task: Task, referenceDate: Date = new Date()): boolean {
  if (task.status !== "pending") return false;
  return isBefore(startOfDay(task.endDate), startOfDay(referenceDate));
}

/** Days between a task's end date and today, for the "Trễ N ngày" footnote. */
export function getOverdueDays(task: Task, referenceDate: Date = new Date()): number | null {
  if (!isOverdue(task, referenceDate)) return null;
  return differenceInCalendarDays(startOfDay(referenceDate), startOfDay(task.endDate));
}

export interface CompletionDelay {
  completedAt: Date;
  onTime: boolean;
  label: string;
}

/**
 * How late a completed task was, measured against the end of its end date
 * (so completing any time on that day itself counts as on-time).
 */
export function getCompletionDelay(task: Task): CompletionDelay | null {
  if (task.status !== "completed" || !task.completedAt) return null;

  const deadline = endOfDay(task.endDate);
  const onTime = task.completedAt.getTime() <= deadline.getTime();
  const label = onTime
    ? "Đúng hạn"
    : `Trễ ${formatDistanceStrict(task.completedAt, deadline, { locale: vi })}`;

  return { completedAt: task.completedAt, onTime, label };
}
```

- [ ] **Step 2: Run the type checker**

Run: `npx tsc --noEmit`
Expected: no errors reference `src/lib/tasks/overdue.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/tasks/overdue.ts
git commit -m "refactor: key task overdue/delay logic off endDate"
```

---

### Task 6: `src/lib/tasks/stats.ts` — per-day stats across a task's whole window

**Files:**
- Modify: `src/lib/tasks/stats.ts`

**Interfaces:**
- Consumes: `Task` from `@/lib/tasks/types` (Task 2); `toDateKey` from `@/lib/date/date-key`.
- Produces: `getDailyTaskStats(tasks: Task[]): Map<string, { completed: number; total: number }>` — same signature as before (used by `YearGrid` on the Analytics page, untouched by this plan).

- [ ] **Step 1: Replace the file**

```ts
import { eachDayOfInterval } from "date-fns";
import { toDateKey } from "@/lib/date/date-key";
import type { Task } from "@/lib/tasks/types";

/** Groups tasks by every day their [startDate, endDate] window touches, counting completed vs. total per day (for the year grid tooltip). */
export function getDailyTaskStats(tasks: Task[]): Map<string, { completed: number; total: number }> {
  const stats = new Map<string, { completed: number; total: number }>();

  for (const task of tasks) {
    for (const day of eachDayOfInterval({ start: task.startDate, end: task.endDate })) {
      const key = toDateKey(day);
      const entry = stats.get(key) ?? { completed: 0, total: 0 };
      entry.total += 1;
      if (task.status === "completed") entry.completed += 1;
      stats.set(key, entry);
    }
  }

  return stats;
}
```

- [ ] **Step 2: Run the type checker**

Run: `npx tsc --noEmit`
Expected: no errors reference `src/lib/tasks/stats.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/tasks/stats.ts
git commit -m "refactor: compute daily task stats across each task's start/end window"
```

---

### Task 7: `TaskFormDialog` — "Loại" selector (once/daily), start+end pickers, habit submit path

**Files:**
- Modify: `src/components/tasks/TaskFormDialog.tsx`

**Interfaces:**
- Consumes: `Subtask, Task, TaskStatus` from `@/lib/tasks/types`; `getCompletionDelay` from `@/lib/tasks/overdue` (Task 5).
- Produces: `TaskFormInput { title, description, startDate: Date, endDate: Date, subtasks }`, `HabitFormInput { title, description, dueTime: string }`, and the component `TaskFormDialog({ trigger, task?, onSubmitTask, onSubmitHabit?, onDelete?, onStatusChange? })`. `onSubmitHabit` is optional because editing an existing `task` never needs it (the "Loại" selector only appears when creating a brand-new item). Tasks 8 and 10 depend on these exact prop names.

- [ ] **Step 1: Replace the file**

```tsx
"use client";

import { endOfDay, format, startOfToday } from "date-fns";
import { useState, type FormEvent, type ReactElement } from "react";
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCompletionDelay } from "@/lib/tasks/overdue";
import type { Subtask, Task, TaskStatus } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

export interface TaskFormInput {
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  subtasks: Subtask[];
}

export interface HabitFormInput {
  title: string;
  description: string | null;
  dueTime: string;
}

interface TaskFormDialogProps {
  trigger: ReactElement;
  /** Pass an existing task to edit it (and allow deleting it); omit to create a new one. */
  task?: Task;
  onSubmitTask: (input: TaskFormInput) => void;
  /** Called instead of onSubmitTask when creating a new item with "Hàng ngày" selected. Never needed when `task` is set, since the "Loại" selector only appears on create. */
  onSubmitHabit?: (input: HabitFormInput) => void;
  onDelete?: (id: string) => void;
  /** Called the instant checking/unchecking a subtask flips the parent task's completion. */
  onStatusChange?: (id: string, status: TaskStatus) => void;
}

function defaultStartDate(): Date {
  return new Date();
}

function defaultEndDate(): Date {
  return endOfDay(startOfToday());
}

export function TaskFormDialog({
  trigger,
  task,
  onSubmitTask,
  onSubmitHabit,
  onDelete,
  onStatusChange,
}: TaskFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"once" | "daily">("once");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>(defaultStartDate());
  const [endDate, setEndDate] = useState<Date>(defaultEndDate());
  const [dueTime, setDueTime] = useState("23:59");
  const [dateError, setDateError] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "pending");

  // Editing an existing task always uses the task-shaped fields; creating
  // a new item switches shape based on the "Loại" selector.
  const isTaskShape = Boolean(task) || kind === "once";

  function resetForm() {
    setKind("once");
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setStartDate(task?.startDate ?? defaultStartDate());
    setEndDate(task?.endDate ?? defaultEndDate());
    setDueTime("23:59");
    setDateError(null);
    setSubtasks(task?.subtasks ?? []);
    setSubtaskInput("");
    setStatus(task?.status ?? "pending");
  }

  function handleAddSubtask() {
    if (!subtaskInput.trim()) return;
    setSubtasks((prev) => [...prev, { id: crypto.randomUUID(), title: subtaskInput.trim(), completed: false }]);
    setSubtaskInput("");
  }

  // Finishing the last subtask auto-completes the task; unchecking one on an
  // auto-completed task reopens it, so the checklist and the task status
  // never fall out of sync.
  function handleToggleSubtask(id: string) {
    setSubtasks((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s));
      const allDone = next.length > 0 && next.every((s) => s.completed);
      const nextStatus: TaskStatus = allDone ? "completed" : "pending";

      if (task && nextStatus !== status) {
        setStatus(nextStatus);
        onStatusChange?.(task.id, nextStatus);
      }

      return next;
    });
  }

  function handleRemoveSubtask(id: string) {
    setSubtasks((prev) => prev.filter((subtask) => subtask.id !== id));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    if (!isTaskShape) {
      onSubmitHabit?.({
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        dueTime,
      });
      setOpen(false);
      return;
    }

    if (endDate.getTime() < startDate.getTime()) {
      setDateError("Ngày kết thúc phải sau ngày bắt đầu.");
      return;
    }
    setDateError(null);

    // A subtask typed but never confirmed with "+" shouldn't be silently
    // dropped when the whole task is saved.
    const pendingSubtask = subtaskInput.trim();
    const finalSubtasks = pendingSubtask
      ? [...subtasks, { id: crypto.randomUUID(), title: pendingSubtask, completed: false }]
      : subtasks;

    onSubmitTask({
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      startDate,
      endDate,
      subtasks: finalSubtasks,
    });

    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) resetForm();
        setOpen(next);
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-[520px] w-full p-6 bg-white rounded-2xl border-none shadow-xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{task ? "Sửa công việc" : "Công việc mới"}</DialogTitle>
        </DialogHeader>
        {task && (() => {
          const delay = getCompletionDelay(task);
          if (!delay) return null;
          return (
            <p className={cn("text-xs", delay.onTime ? "text-emerald-600" : "text-destructive")}>
              Hoàn thành lúc {format(delay.completedAt, "HH:mm dd/MM/yyyy")} · {delay.label}
            </p>
          );
        })()}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
            <Label htmlFor="task-title">Tiêu đề</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tên công việc"
              required
            />
          </div>

          <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
            <Label htmlFor="task-description">Mô tả</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú thêm (không bắt buộc)"
            />
          </div>

          {!task && (
            <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
              <Label htmlFor="task-kind">Loại</Label>
              <Select value={kind} onValueChange={(value) => setKind(value as "once" | "daily")}>
                <SelectTrigger id="task-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Chỉ một lần</SelectItem>
                  <SelectItem value="daily">Hàng ngày</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {isTaskShape ? (
            <>
              <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
                <Label htmlFor="task-start-date">Bắt đầu</Label>
                <DateTimePicker
                  id="task-start-date"
                  value={startDate}
                  onChange={(date) => setStartDate(date ?? defaultStartDate())}
                />
              </div>

              <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
                <Label htmlFor="task-end-date">Kết thúc</Label>
                <DateTimePicker
                  id="task-end-date"
                  value={endDate}
                  onChange={(date) => setEndDate(date ?? defaultEndDate())}
                />
                {dateError && <p className="text-xs text-destructive">{dateError}</p>}
              </div>
            </>
          ) : (
            <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
              <Label htmlFor="task-due-time">Hạn chót (giờ)</Label>
              <Input
                id="task-due-time"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          )}

          {isTaskShape && (
            <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
              <Label>Sub-task</Label>
              {subtasks.length > 0 && (
                <ul className="flex w-full min-w-0 flex-col gap-1.5 box-border">
                  {subtasks.map((subtask) => (
                    <li
                      key={subtask.id}
                      className="flex w-full min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-700 box-border"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                        <Checkbox checked={subtask.completed} onCheckedChange={() => handleToggleSubtask(subtask.id)} />
                        <span
                          className={cn(
                            "block min-w-0 flex-1 truncate",
                            subtask.completed && "text-slate-400 line-through"
                          )}
                          title={subtask.title}
                        >
                          {subtask.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(subtask.id)}
                        aria-label="Xóa sub-task"
                        className="shrink-0 text-slate-400 hover:text-destructive"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex w-full min-w-0 flex-1 items-center gap-2 box-border">
                <Input
                  className="min-w-0 flex-1"
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder="Thêm sub-task"
                />
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={handleAddSubtask}>
                  <PlusIcon className="size-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex w-full min-w-0 items-center gap-3 box-border">
            <Button type="submit" className="min-w-0 flex-1">
              {task ? "Lưu thay đổi" : "Thêm công việc"}
            </Button>
            {task && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="shrink-0"
                aria-label="Xóa công việc"
                onClick={() => {
                  onDelete(task.id);
                  setOpen(false);
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

- [ ] **Step 2: Run the type checker**

Run: `npx tsc --noEmit`
Expected: no errors reference `src/components/tasks/TaskFormDialog.tsx` itself (errors in its callers are expected and fixed in Tasks 8 and 10).

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/TaskFormDialog.tsx
git commit -m "feat: add once/daily type selector and start/end pickers to TaskFormDialog"
```

---

### Task 8: `TaskDayItem` — use `endDate`, new `onSubmitTask` prop name

**Files:**
- Modify: `src/components/tasks/TaskDayItem.tsx`

**Interfaces:**
- Consumes: `TaskFormDialog` with prop `onSubmitTask` (renamed from `onSubmit` in Task 7); `getOverdueDays`, `isOverdue` from `@/lib/tasks/overdue` (Task 5); `Task`, `TaskStatus` from `@/lib/tasks/types`.
- Produces: same `TaskDayItem({ task, onToggleStatus, onEdit, onDelete, onRescheduleToToday?, onStatusChange? })` props as before — Task 10 depends on this signature being unchanged.

- [ ] **Step 1: Swap `task.dueDate` for `task.endDate`, rename the dialog prop**

```tsx
"use client";

import { format } from "date-fns";
import { CheckCircle2, CalendarArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskFormDialog, type TaskFormInput } from "@/components/tasks/TaskFormDialog";
import { getOverdueDays, isOverdue } from "@/lib/tasks/overdue";
import type { Task, TaskStatus } from "@/lib/tasks/types";

interface TaskDayItemProps {
  task: Task;
  onToggleStatus: (id: string) => void;
  onEdit: (id: string, input: TaskFormInput) => void;
  onDelete: (id: string) => void;
  onRescheduleToToday?: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
}

export function TaskDayItem({
  task,
  onToggleStatus,
  onEdit,
  onDelete,
  onRescheduleToToday,
  onStatusChange,
}: TaskDayItemProps) {
  const completed = task.status === "completed";
  const overdue = isOverdue(task);
  const overdueDays = getOverdueDays(task);
  const doneSubtasks = task.subtasks.filter((s) => s.completed).length;

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors duration-200",
        completed
          ? "border-slate-200/60 bg-slate-50"
          : overdue
            ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
            : "border-slate-200/80 bg-white hover:bg-slate-50"
      )}
    >
      <button
        type="button"
        onClick={() => onToggleStatus(task.id)}
        aria-label={completed ? "Đánh dấu chưa làm" : "Đánh dấu đã xong"}
        className="shrink-0"
      >
        <CheckCircle2
          className={cn(
            "size-6 transition-colors duration-200",
            completed ? "fill-emerald-500 text-white" : "text-slate-300 hover:text-emerald-500"
          )}
        />
      </button>

      <TaskFormDialog
        task={task}
        onSubmitTask={(input) => onEdit(task.id, input)}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        trigger={
          <button type="button" className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
            <span
              className={cn(
                "truncate text-sm font-medium",
                completed ? "text-slate-500 line-through" : overdue ? "font-bold text-destructive" : "text-slate-800"
              )}
            >
              {task.title}
            </span>
            {overdue ? (
              <span className="text-xs font-medium text-destructive">
                Đến hạn: {format(task.endDate, "dd/MM")} (Trễ {overdueDays} ngày)
              </span>
            ) : (
              task.subtasks.length > 0 && (
                <span className="text-xs text-slate-400">
                  {doneSubtasks}/{task.subtasks.length} sub-task
                </span>
              )
            )}
          </button>
        }
      />

      <div className="flex shrink-0 items-center gap-2">
        {!overdue && <span className="text-xs text-slate-400">{format(task.endDate, "HH:mm")}</span>}
        {overdue && onRescheduleToToday && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-destructive/30 px-2 text-xs text-destructive transition-colors duration-200 hover:bg-destructive/10"
            onClick={() => onRescheduleToToday(task.id)}
          >
            <CalendarArrowUp className="size-3.5" />
            Dời sang hôm nay
          </Button>
        )}
        {overdue && <Badge className="border-none bg-destructive text-white">Trễ hạn</Badge>}
      </div>
    </li>
  );
}
```

- [ ] **Step 2: Run the type checker**

Run: `npx tsc --noEmit`
Expected: no errors reference `src/components/tasks/TaskDayItem.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/TaskDayItem.tsx
git commit -m "refactor: TaskDayItem displays endDate, uses renamed onSubmitTask prop"
```

---

### Task 9: `HabitChecklistItem` — the Todo page's daily-habit checkbox row

**Files:**
- Create: `src/components/habits/HabitChecklistItem.tsx`

**Interfaces:**
- Consumes: `Habit`, `HabitLog` from `@/lib/habits/types` (Task 2); `Checkbox` from `@/components/ui/checkbox`.
- Produces: `HabitChecklistItem({ habit, log, onToggle })` where `onToggle: (habitId: string, completed: boolean) => void` — Task 10 wires this directly to its `handleToggleHabitLog`.

- [ ] **Step 1: Write the file**

```tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Habit, HabitLog } from "@/lib/habits/types";

interface HabitChecklistItemProps {
  habit: Habit;
  log: HabitLog | undefined;
  onToggle: (habitId: string, completed: boolean) => void;
}

/**
 * One daily-habit row on the Todo page: a checkbox for the currently
 * selected day plus its due time. No click-to-edit/delete here — that
 * belongs to the dedicated habit-tracking page (separate plan).
 */
export function HabitChecklistItem({ habit, log, onToggle }: HabitChecklistItemProps) {
  const completed = log?.completed ?? false;

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors duration-200",
        completed ? "border-slate-200/60 bg-slate-50" : "border-slate-200/80 bg-white hover:bg-slate-50"
      )}
    >
      <Checkbox
        checked={completed}
        onCheckedChange={(checked) => onToggle(habit.id, checked === true)}
        aria-label={completed ? "Đánh dấu chưa làm" : "Đánh dấu đã xong"}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm font-medium",
          completed ? "text-slate-500 line-through" : "text-slate-800"
        )}
      >
        {habit.title}
      </span>
      <span className="shrink-0 text-xs text-slate-400">{habit.dueTime}</span>
    </li>
  );
}
```

- [ ] **Step 2: Run the type checker**

Run: `npx tsc --noEmit`
Expected: no errors reference `src/components/habits/HabitChecklistItem.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/habits/HabitChecklistItem.tsx
git commit -m "feat: add HabitChecklistItem for the Todo page's daily-habit block"
```

---

### Task 10: `TasksOverviewSection` — separate habit block, range-based day filtering

**Files:**
- Modify: `src/components/tasks/TasksOverviewSection.tsx`

**Interfaces:**
- Consumes: `createTask, deleteTask, rescheduleTaskToToday, updateTask, updateTaskStatus` from `@/app/actions/tasks` (Task 3); `createHabit, setHabitLogStatus` from `@/app/actions/habits` (Task 4); `TaskDayItem` (Task 8); `TaskFormDialog, HabitFormInput, TaskFormInput` (Task 7); `HabitChecklistItem` (Task 9); `Habit, HabitLog` from `@/lib/habits/types`.
- Produces: `TasksOverviewSection({ tasks, habits, habitLogs, selectedDate })` — Task 11 passes `habits`/`habitLogs` into this new prop shape.

- [ ] **Step 1: Replace the file**

```tsx
"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { endOfDay, startOfDay } from "date-fns";
import { createTask, deleteTask, rescheduleTaskToToday, updateTask, updateTaskStatus } from "@/app/actions/tasks";
import { createHabit, setHabitLogStatus } from "@/app/actions/habits";
import { Button } from "@/components/ui/button";
import { TaskDayItem } from "@/components/tasks/TaskDayItem";
import { TaskFormDialog, type HabitFormInput, type TaskFormInput } from "@/components/tasks/TaskFormDialog";
import { HabitChecklistItem } from "@/components/habits/HabitChecklistItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toDateKey } from "@/lib/date/date-key";
import type { Habit, HabitLog } from "@/lib/habits/types";
import type { Task, TaskStatus } from "@/lib/tasks/types";

interface TasksOverviewSectionProps {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  selectedDate: Date;
}

type OptimisticAction =
  | { type: "create"; task: Task }
  | { type: "edit"; id: string; input: TaskFormInput }
  | { type: "setStatus"; id: string; status: TaskStatus }
  | { type: "reschedule"; id: string }
  | { type: "delete"; id: string };

function applyOptimisticAction(state: Task[], action: OptimisticAction): Task[] {
  switch (action.type) {
    case "create":
      return [action.task, ...state];
    case "edit":
      return state.map((task) =>
        task.id === action.id
          ? {
              ...task,
              title: action.input.title,
              description: action.input.description,
              startDate: action.input.startDate,
              endDate: action.input.endDate,
              subtasks: action.input.subtasks,
            }
          : task
      );
    case "setStatus":
      return state.map((task) =>
        task.id === action.id
          ? { ...task, status: action.status, completedAt: action.status === "completed" ? new Date() : null }
          : task
      );
    case "reschedule": {
      const now = new Date();
      return state.map((task) =>
        task.id === action.id ? { ...task, startDate: startOfDay(now), endDate: endOfDay(now) } : task
      );
    }
    case "delete":
      return state.filter((task) => task.id !== action.id);
  }
}

type HabitLogAction = { habitId: string; logDate: string; completed: boolean };

function applyOptimisticHabitLog(state: HabitLog[], action: HabitLogAction): HabitLog[] {
  const next: HabitLog = {
    habitId: action.habitId,
    logDate: action.logDate,
    completed: action.completed,
    completedAt: action.completed ? new Date() : null,
  };
  const idx = state.findIndex((log) => log.habitId === action.habitId && log.logDate === action.logDate);
  if (idx === -1) return [...state, next];
  return state.map((log, i) => (i === idx ? next : log));
}

/** True when the task's [startDate, endDate] window includes this calendar day. */
function isTaskOnDay(task: Task, dayKey: string): boolean {
  return toDateKey(task.startDate) <= dayKey && dayKey <= toDateKey(task.endDate);
}

export function TasksOverviewSection({ tasks, habits, habitLogs, selectedDate }: TasksOverviewSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Local state updates immediately on every action; it reconciles with the
  // server-fetched props once router.refresh() lands, so interactions never
  // wait on the Supabase round trip to feel instant.
  const [optimisticTasks, applyOptimistic] = useOptimistic(tasks, applyOptimisticAction);
  const [optimisticHabitLogs, applyOptimisticLog] = useOptimistic(habitLogs, applyOptimisticHabitLog);

  function handleCreate(input: TaskFormInput) {
    const optimisticTask: Task = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "pending",
      createdAt: new Date(),
      completedAt: null,
      subtasks: input.subtasks,
    };
    startTransition(async () => {
      applyOptimistic({ type: "create", task: optimisticTask });
      await createTask(input);
      router.refresh();
    });
  }

  function handleCreateHabit(input: HabitFormInput) {
    startTransition(async () => {
      await createHabit(input);
      router.refresh();
    });
  }

  function handleEdit(id: string, input: TaskFormInput) {
    startTransition(async () => {
      applyOptimistic({ type: "edit", id, input });
      await updateTask(id, input);
      router.refresh();
    });
  }

  function handleToggleStatus(id: string) {
    const task = optimisticTasks.find((t) => t.id === id);
    if (!task) return;
    const nextStatus = task.status === "pending" ? "completed" : "pending";
    startTransition(async () => {
      applyOptimistic({ type: "setStatus", id, status: nextStatus });
      await updateTaskStatus(id, nextStatus);
      router.refresh();
    });
  }

  // Wired to the task-edit dialog's subtask checklist: finishing the last
  // subtask (or unchecking one) flips the parent task's own status.
  function handleStatusChange(id: string, status: TaskStatus) {
    startTransition(async () => {
      applyOptimistic({ type: "setStatus", id, status });
      await updateTaskStatus(id, status);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: "delete", id });
      await deleteTask(id);
      router.refresh();
    });
  }

  function handleRescheduleToToday(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: "reschedule", id });
      await rescheduleTaskToToday(id);
      router.refresh();
    });
  }

  function handleToggleHabitLog(habitId: string, completed: boolean) {
    const logDate = toDateKey(selectedDate);
    startTransition(async () => {
      applyOptimisticLog({ habitId, logDate, completed });
      await setHabitLogStatus(habitId, logDate, completed);
      router.refresh();
    });
  }

  const todayKey = toDateKey(new Date());
  const selectedKey = toDateKey(selectedDate);
  const isTodaySelected = selectedKey === todayKey;

  // "Hôm nay" rolls every unfinished past-due task forward so nothing gets
  // silently skipped: status='pending' AND its whole window already ended.
  const orderedDayTasks = isTodaySelected
    ? [
        ...optimisticTasks
          .filter((task) => task.status === "pending" && toDateKey(task.endDate) < todayKey)
          .sort((a, b) => a.endDate.getTime() - b.endDate.getTime()),
        ...optimisticTasks.filter((task) => task.status === "pending" && isTaskOnDay(task, todayKey)),
        ...optimisticTasks.filter((task) => task.status === "completed" && isTaskOnDay(task, todayKey)),
      ]
    : (() => {
        const dayTasks = optimisticTasks.filter((task) => isTaskOnDay(task, selectedKey));
        return [
          ...dayTasks.filter((task) => task.status === "pending"),
          ...dayTasks.filter((task) => task.status === "completed"),
        ];
      })();

  const habitLogsByHabitId = new Map(
    optimisticHabitLogs.filter((log) => log.logDate === selectedKey).map((log) => [log.habitId, log])
  );

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
        <CardHeader className="flex flex-row items-center justify-between px-8 pt-8">
          <CardTitle className="text-lg font-semibold text-slate-700">Công việc cần làm</CardTitle>
          <TaskFormDialog
            trigger={<Button type="button">+ Thêm công việc</Button>}
            onSubmitTask={handleCreate}
            onSubmitHabit={handleCreateHabit}
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-8 pb-8">
          {orderedDayTasks.length === 0 ? (
            <p className="text-sm text-slate-500">Không có việc nào vào ngày này.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {orderedDayTasks.map((task) => (
                <TaskDayItem
                  key={task.id}
                  task={task}
                  onToggleStatus={handleToggleStatus}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onRescheduleToToday={handleRescheduleToToday}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </ul>
          )}

          {isPending && <p className="text-xs text-slate-500">Đang cập nhật…</p>}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
        <CardHeader className="px-8 pt-8">
          <CardTitle className="text-lg font-semibold text-slate-700">Thói quen hàng ngày</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-8 pb-8">
          {habits.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có thói quen nào.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {habits.map((habit) => (
                <HabitChecklistItem
                  key={habit.id}
                  habit={habit}
                  log={habitLogsByHabitId.get(habit.id)}
                  onToggle={handleToggleHabitLog}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Run the type checker**

Run: `npx tsc --noEmit`
Expected: no errors reference `src/components/tasks/TasksOverviewSection.tsx` itself (its caller, `OverviewBoard`, is fixed in Task 11).

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/TasksOverviewSection.tsx
git commit -m "feat: split Todo page into separate task and daily-habit blocks"
```

---

### Task 11: Thread habits/habitLogs through `OverviewBoard` and `OverviewContent`

**Files:**
- Modify: `src/components/dashboard/OverviewBoard.tsx`
- Modify: `src/app/(dashboard)/OverviewContent.tsx`

**Interfaces:**
- Consumes: `getHabits, getHabitLogs` from `@/app/actions/habits` (Task 4); `TasksOverviewSection` with its new `habits`/`habitLogs` props (Task 10).
- Produces: `OverviewBoard({ tasks, habits, habitLogs, events })`.

- [ ] **Step 1: Update `src/components/dashboard/OverviewBoard.tsx`**

```tsx
"use client";

import { useState } from "react";
import { TasksOverviewSection } from "@/components/tasks/TasksOverviewSection";
import { TodayWidget } from "@/components/dashboard/TodayWidget";
import { EventsListSection } from "@/components/events/EventsListSection";
import { Card, CardContent } from "@/components/ui/card";
import type { EventItem } from "@/lib/events/types";
import type { Habit, HabitLog } from "@/lib/habits/types";
import type { Task } from "@/lib/tasks/types";

interface OverviewBoardProps {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  events: EventItem[];
}

export function OverviewBoard({ tasks, habits, habitLogs, events }: OverviewBoardProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start">
      <div className="flex flex-col gap-8 lg:col-span-2">
        <TasksOverviewSection tasks={tasks} habits={habits} habitLogs={habitLogs} selectedDate={selectedDate} />
      </div>

      <div className="flex flex-col gap-8 lg:sticky lg:top-8">
        <TodayWidget tasks={tasks} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
          <CardContent className="px-8 py-8">
            <EventsListSection events={events} maxDaysAhead={7} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/app/(dashboard)/OverviewContent.tsx`**

```tsx
import { connection } from "next/server";
import { getTasks } from "@/app/actions/tasks";
import { getHabits, getHabitLogs } from "@/app/actions/habits";
import { getEvents } from "@/app/actions/events";
import { getCurrentUserEmail } from "@/lib/supabase/require-user";
import { isOverdue } from "@/lib/tasks/overdue";
import { OverviewBoard } from "@/components/dashboard/OverviewBoard";
import { TopBar } from "@/components/layout/TopBar";

export async function OverviewContent() {
  await connection();
  const [tasks, habits, habitLogs, events, email] = await Promise.all([
    getTasks(),
    getHabits(),
    getHabitLogs(),
    getEvents(),
    getCurrentUserEmail(),
  ]);
  const overdueCount = tasks.filter((task) => task.status === "pending" && isOverdue(task)).length;

  return (
    <div className="min-h-screen bg-slate-100/70">
      <TopBar email={email} overdueCount={overdueCount} />

      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        <OverviewBoard tasks={tasks} habits={habits} habitLogs={habitLogs} events={events} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run the type checker**

Run: `npx tsc --noEmit`
Expected: no errors reference either file.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/OverviewBoard.tsx "src/app/(dashboard)/OverviewContent.tsx"
git commit -m "feat: fetch and thread habits/habitLogs into the Todo page"
```

---

### Task 12: `DashboardCalendarCard` — dot every day in a task's window

**Files:**
- Modify: `src/components/dashboard/DashboardCalendarCard.tsx`

**Interfaces:**
- Consumes: `Task` from `@/lib/tasks/types` (startDate/endDate from Task 2).
- Produces: same `DashboardCalendarCard({ tasks, selectedDate, onSelectDate })` props as before.

- [ ] **Step 1: Replace the file**

```tsx
"use client";

import { useMemo } from "react";
import { eachDayOfInterval } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { toDateKey } from "@/lib/date/date-key";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/tasks/types";

interface DashboardCalendarCardProps {
  tasks: Task[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

/** Controlled mini calendar: pick a day to filter the task list elsewhere on the dashboard. */
export function DashboardCalendarCard({ tasks, selectedDate, onSelectDate }: DashboardCalendarCardProps) {
  const todayKey = toDateKey(new Date());

  // A multi-day task dots every day in its [startDate, endDate] window, not just one.
  const datesWithTasks = useMemo(() => {
    const keys = new Set<string>();
    for (const task of tasks) {
      for (const day of eachDayOfInterval({ start: task.startDate, end: task.endDate })) {
        keys.add(toDateKey(day));
      }
    }
    return keys;
  }, [tasks]);

  // Past dates still carrying an unfinished task get a red flag instead of the
  // normal dot, since those tasks have already rolled over into "Hôm nay".
  const datesOverdue = useMemo(() => {
    const keys = new Set<string>();
    for (const task of tasks) {
      if (task.status !== "pending" || toDateKey(task.endDate) >= todayKey) continue;
      for (const day of eachDayOfInterval({ start: task.startDate, end: task.endDate })) {
        keys.add(toDateKey(day));
      }
    }
    return keys;
  }, [tasks, todayKey]);

  return (
    <Calendar
      mode="single"
      locale={vi}
      selected={selectedDate}
      onSelect={(date) => date && onSelectDate(date)}
      modifiers={{
        hasTask: (date) => datesWithTasks.has(toDateKey(date)),
        isOverdueDay: (date) => datesOverdue.has(toDateKey(date)),
      }}
      className="mx-auto"
      components={{
        DayButton: ({ modifiers, ...props }) => (
          <div className="relative h-full w-full">
            <CalendarDayButton
              modifiers={modifiers}
              {...props}
              className={cn(props.className, modifiers.isOverdueDay && "text-destructive")}
            />
            {modifiers.isOverdueDay ? (
              <span className="pointer-events-none absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-destructive" />
            ) : (
              modifiers.hasTask && (
                <span className="pointer-events-none absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
              )
            )}
          </div>
        ),
      }}
    />
  );
}
```

- [ ] **Step 2: Run the type checker**

Run: `npx tsc --noEmit`
Expected: no errors reference `src/components/dashboard/DashboardCalendarCard.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardCalendarCard.tsx
git commit -m "refactor: dot every day of a task's start/end window on the mini calendar"
```

---

### Task 13: Dev sandbox (`/dev/tasks`) — keep it compiling and usable

**Files:**
- Modify: `src/hooks/use-tasks.ts`
- Modify: `src/components/tasks/TaskForm.tsx`
- Modify: `src/components/tasks/TaskItem.tsx`
- Modify: `src/app/dev/tasks/TasksDevClient.tsx`

**Interfaces:**
- Consumes: `Task`, `STATUS_LABELS` from `@/lib/tasks/types` (Task 2); `isOverdue` from `@/lib/tasks/overdue` (Task 5).
- Produces: `useTasks(initialTasks?)` returning `{ tasks, addTask, toggleStatus }` where `addTask(input: { title, startDate: Date, endDate: Date })` (no `recurrence`).

Note: `TaskForm`/`TaskItem`/`useTasks`/`TasksDevClient` only back the `/dev/tasks` sandbox route — `TasksOverviewSection` (the real Todo page, Task 10) does not use any of them. The spec's "Loại" once/daily selector therefore isn't added here; this task only keeps the sandbox compiling against the new `Task` shape with the minimum change (two date fields instead of one, recurrence dropped).

- [ ] **Step 1: Update `src/hooks/use-tasks.ts`**

```ts
"use client";

import { useState } from "react";
import type { Task } from "@/lib/tasks/types";

export function useTasks(initialTasks: Task[] = []) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  function addTask(input: { title: string; startDate: Date; endDate: Date }) {
    const task: Task = {
      id: crypto.randomUUID(),
      title: input.title,
      description: null,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "pending",
      createdAt: new Date(),
      completedAt: null,
      subtasks: [],
    };
    setTasks((prev) => [task, ...prev]);
  }

  function toggleStatus(id: string) {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const status = task.status === "pending" ? "completed" : "pending";
        return { ...task, status, completedAt: status === "completed" ? new Date() : null };
      })
    );
  }

  return { tasks, addTask, toggleStatus };
}
```

- [ ] **Step 2: Update `src/components/tasks/TaskForm.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TaskFormProps {
  onCreate: (input: { title: string; startDate: Date; endDate: Date }) => void;
}

export function TaskForm({ onCreate }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(endOfDay(new Date()));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    onCreate({ title: title.trim(), startDate, endDate });

    setTitle("");
    setStartDate(new Date());
    setEndDate(endOfDay(new Date()));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-4"
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <Label htmlFor="task-title" className="text-sm text-slate-600">
          Tiêu đề
        </Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tên công việc"
          required
          className="bg-white"
        />
      </div>

      <div className="flex w-40 flex-col gap-1.5">
        <Label htmlFor="task-start-date" className="text-sm text-slate-600">
          Bắt đầu
        </Label>
        <DatePicker
          id="task-start-date"
          value={startDate}
          onChange={(date) => setStartDate(date ?? new Date())}
          placeholder="dd/mm/yyyy"
          className="bg-white"
        />
      </div>

      <div className="flex w-40 flex-col gap-1.5">
        <Label htmlFor="task-end-date" className="text-sm text-slate-600">
          Kết thúc
        </Label>
        <DatePicker
          id="task-end-date"
          value={endDate}
          onChange={(date) => setEndDate(date ?? endOfDay(new Date()))}
          placeholder="dd/mm/yyyy"
          className="bg-white"
        />
      </div>

      <Button type="submit">Thêm công việc</Button>
    </form>
  );
}
```

- [ ] **Step 3: Update `src/components/tasks/TaskItem.tsx`**

```tsx
"use client";

import { format } from "date-fns";
import { Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isOverdue } from "@/lib/tasks/overdue";
import { STATUS_LABELS, type Task } from "@/lib/tasks/types";

interface TaskItemProps {
  task: Task;
  onToggleStatus: (id: string) => void;
  onDelete?: (id: string) => void;
  referenceDate?: Date;
}

export function TaskItem({ task, onToggleStatus, onDelete, referenceDate }: TaskItemProps) {
  const overdue = isOverdue(task, referenceDate);

  return (
    <li
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition-colors duration-200",
        overdue
          ? "border-destructive/30 bg-destructive/5 text-foreground hover:bg-destructive/10"
          : "border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("font-medium text-slate-800", overdue && "font-bold text-destructive")}>
            {task.title}
          </p>
          {overdue && (
            <Badge className="border-none bg-destructive text-white">
              Trễ hạn
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-500">
          {format(task.startDate, "dd/MM/yyyy")} → {format(task.endDate, "dd/MM/yyyy")} ·{" "}
          {STATUS_LABELS[task.status]}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={overdue ? "destructive" : "outline"}
          className="transition-colors duration-200"
          onClick={() => onToggleStatus(task.id)}
        >
          {task.status === "pending" ? "Đánh dấu Đã xong" : "Đánh dấu Chưa làm"}
        </Button>
        {onDelete && (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Xóa công việc"
            className="text-muted-foreground transition-colors duration-200"
            onClick={() => onDelete(task.id)}
          >
            <Trash2Icon />
          </Button>
        )}
      </div>
    </li>
  );
}
```

- [ ] **Step 4: Update `src/app/dev/tasks/TasksDevClient.tsx`**

```tsx
"use client";

import { addDays, endOfDay, subDays } from "date-fns";
import { useTasks } from "@/hooks/use-tasks";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskList } from "@/components/tasks/TaskList";
import type { Task } from "@/lib/tasks/types";

const today = new Date();

const seedTasks: Task[] = [
  {
    id: "seed-overdue",
    title: "[Expect RED] Quá hạn 3 ngày, chưa làm",
    description: null,
    startDate: subDays(today, 3),
    endDate: endOfDay(subDays(today, 3)),
    status: "pending",
    createdAt: today,
    completedAt: null,
    subtasks: [],
  },
  {
    id: "seed-overdue-completed",
    title: "[Expect normal] Quá hạn nhưng đã xong",
    description: null,
    startDate: subDays(today, 3),
    endDate: endOfDay(subDays(today, 3)),
    status: "completed",
    createdAt: today,
    completedAt: today,
    subtasks: [],
  },
  {
    id: "seed-today",
    title: "[Expect normal] Hạn đúng hôm nay",
    description: null,
    startDate: today,
    endDate: endOfDay(today),
    status: "pending",
    createdAt: today,
    completedAt: null,
    subtasks: [],
  },
  {
    id: "seed-future",
    title: "[Expect normal] Hạn còn 5 ngày nữa",
    description: null,
    startDate: addDays(today, 5),
    endDate: endOfDay(addDays(today, 5)),
    status: "pending",
    createdAt: today,
    completedAt: null,
    subtasks: [],
  },
  {
    id: "seed-range",
    title: "[Expect normal] Kéo dài 3 ngày",
    description: null,
    startDate: today,
    endDate: endOfDay(addDays(today, 2)),
    status: "pending",
    createdAt: today,
    completedAt: null,
    subtasks: [],
  },
];

export function TasksDevClient() {
  const { tasks, addTask, toggleStatus } = useTasks(seedTasks);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-10">
      <h1 className="text-xl font-semibold">Quản lý công việc</h1>
      <TaskForm onCreate={addTask} />
      <TaskList tasks={tasks} onToggleStatus={toggleStatus} />
    </div>
  );
}
```

- [ ] **Step 5: Run the type checker across the whole project**

Run: `npx tsc --noEmit`
Expected: **zero errors** anywhere in the project. If anything remains, it's a file this plan missed — find it and fix it before moving on.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-tasks.ts src/components/tasks/TaskForm.tsx src/components/tasks/TaskItem.tsx src/app/dev/tasks/TasksDevClient.tsx
git commit -m "chore: update /dev/tasks sandbox for the start/end task model"
```

---

### Task 14: Lint, build, and manual QA of the bug this plan fixes

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: builds successfully (this also re-runs the TypeScript check in a production context and will catch anything `tsc --noEmit` alone might miss, e.g. serialization of Server Action arguments).

- [ ] **Step 3: Manual QA — multi-day one-time task**

Run: `npm run dev`, open the Todo page (`/`), click "+ Thêm công việc", leave "Loại" on "Chỉ một lần", set "Bắt đầu" to today and "Kết thúc" to 2 days from now, save.
Expected: the task appears today; navigating the mini calendar forward shows it on tomorrow and the day after too (not just the end day); the mini calendar dot appears on all 3 days.

- [ ] **Step 4: Manual QA — the duplicate-habit bug is gone**

In the same dialog, click "+ Thêm công việc" again, switch "Loại" to "Hàng ngày", give it a title, save. In the new "Thói quen hàng ngày" block, tick its checkbox, then untick it, then tick it again.
Expected: at every step there is still exactly one row for that habit in the list (no duplicate appears). Confirm in the Supabase table editor that `habit_logs` has exactly one row for that `(habit_id, log_date)` pair, not two.

- [ ] **Step 5: Commit (if any fixes were needed)**

Only if Steps 1–4 turned up something to fix — make the fix, then:

```bash
git add -A
git commit -m "fix: address issues found during build/lint/QA pass"
```

If nothing needed fixing, skip this step — there's nothing to commit.
