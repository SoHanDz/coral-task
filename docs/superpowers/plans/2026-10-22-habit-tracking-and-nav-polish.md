# Habit Tracking Page + Navigation Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the dedicated "Dựng thói quen" (`/habits`) page — year calendar, frequency stats, streak callout, quote widget, today's checklist, and full habit CRUD with a GitHub-style delete flow — on top of the `habits`/`habit_logs` tables and actions that already exist from the task-model-rework plan; then apply the independent navigation/UI fixes (nav restructuring, sticky sidebar, bell removal, avatar logout dropdown).

**Architecture:** Part 1 adds one new table (`habit_quotes`), one new pure stats module (`src/lib/habits/stats.ts`, mirroring `src/lib/tasks/stats.ts`), a `src/app/actions/habitQuotes.ts` actions file (mirroring `src/app/actions/habits.ts`), and a `src/components/habits/` UI layer culminating in a new `/habits` route — it never touches `habits`/`habit_logs` through anything but the existing `src/app/actions/habits.ts`. Part 2 is self-contained changes to `src/components/layout/*` and has no data dependency on Part 1; the two parts can be built and reviewed independently and are ordered Part 1 → Part 2 in this file only for a single linear task list.

**Tech Stack:** Next.js (App Router, Server Actions), Supabase (Postgres + RLS), TypeScript strict mode, date-fns.

**Spec:** `docs/superpowers/specs/2026-10-22-habit-tracking-and-nav-polish-design.md`

**Testing approach for this plan:** Same convention as `docs/superpowers/plans/2026-10-22-task-model-rework.md` — this repo has no test runner (no `*.test.*` files, no Jest/Vitest in `package.json`), and introducing one for this plan would be disproportionate (YAGNI) and inconsistent with the rest of the codebase. Each task uses a **type-driven red/green cycle**: `npx tsc --noEmit` after each file change should list only the call sites the task hasn't fixed yet, until it's clean. The final task adds lint, a production build, and a manual QA pass that walks the spec's "Testing" section line by line.

## Global Constraints

- Part 1 reads/writes `habits`/`habit_logs` **only** through the existing `src/app/actions/habits.ts` (`getHabits`, `getHabitLogs`, `createHabit`, `updateHabit`, `deleteHabit`, `setHabitLogStatus`) — no new base tables for tasks, no duplicate queries.
- The streak callout uses the **current** (ongoing) streak of the single most-completed habit, hidden when that streak is 0.
- "Khác" opens a **modal** listing every non-top-3 habit with its count — never an inline expandable list.
- A day before any habit existed yet is colored **distinctly** from both "all-done" and "missed" (a third neutral/outlined style), so "no habit existed" never reads as "habit existed but wasn't done".
- The quote widget holds a **list** of quotes the user maintains in `habit_quotes`; one is picked at random on each page load (server-side, since the page is a Server Component).
- The delete flow's 3-second hold is a **single animated value** driven by `pointerdown`/`pointerup` (not two separate CSS animations) — releasing early reverses from whatever fill level it reached, never resets instantly.
- Part 2's `TopBar` avatar renders whenever `email` is available, independent of `title` being set — it must become reachable from every page on mobile, not just the title-less Overview page.

---

### Task 1: Database migration — `habit_quotes`

**Files:**
- Create: `supabase/migrations/0008_habit_quotes.sql`

**Interfaces:**
- Produces: `public.habit_quotes(id uuid, user_id uuid, text text, created_at timestamptz)` with RLS scoped to `user_id = auth.uid()` on all four operations — Task 2's actions depend on this table and these policies existing.

- [ ] **Step 1: Write the migration**

```sql
begin;

-- Habit-tracking page: a small list of user-maintained quotes, one shown
-- at random each time the /habits page loads. habits/habit_logs already
-- exist from the 0007 migration — this adds only the quotes table.
create table public.habit_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index habit_quotes_user_id_idx on public.habit_quotes (user_id);

alter table public.habit_quotes enable row level security;

create policy "Users can view their own habit quotes"
  on public.habit_quotes for select
  using (auth.uid() = user_id);

create policy "Users can create their own habit quotes"
  on public.habit_quotes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own habit quotes"
  on public.habit_quotes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own habit quotes"
  on public.habit_quotes for delete
  using (auth.uid() = user_id);

commit;
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push` (or however this repo applies pending migrations — check `package.json` scripts first; the 0007 migration was applied the same way).
Expected: `habit_quotes` exists in the Supabase project with RLS enabled.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0008_habit_quotes.sql
git commit -m "feat: add habit_quotes table for the habit-tracking page's quote widget"
```

---

### Task 2: Types + `src/app/actions/habitQuotes.ts` — quote CRUD

**Files:**
- Modify: `src/lib/habits/types.ts`
- Create: `src/app/actions/habitQuotes.ts`

**Interfaces:**
- Consumes: `requireUser` from `@/lib/supabase/require-user` (same pattern as `src/app/actions/habits.ts`).
- Produces: `HabitQuote { id: string; text: string; createdAt: Date }`; `getHabitQuotes(): Promise<HabitQuote[]>`; `createHabitQuote(text: string): Promise<HabitQuote>`; `updateHabitQuote(id: string, text: string): Promise<void>`; `deleteHabitQuote(id: string): Promise<void>` — Task 7's quote widget/manager dialog calls these by these exact names.

- [ ] **Step 1: Add `HabitQuote` to `src/lib/habits/types.ts`**

Add to the existing file (append, don't remove `Habit`/`HabitLog`):

```ts
export interface HabitQuote {
  id: string;
  text: string;
  createdAt: Date;
}
```

- [ ] **Step 2: Write `src/app/actions/habitQuotes.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { parseISO } from "date-fns";
import { requireUser } from "@/lib/supabase/require-user";
import type { HabitQuote } from "@/lib/habits/types";

interface HabitQuoteRow {
  id: string;
  text: string;
  created_at: string;
}

const HABIT_QUOTE_COLUMNS = "id, text, created_at";

function mapHabitQuote(row: HabitQuoteRow): HabitQuote {
  return {
    id: row.id,
    text: row.text,
    createdAt: parseISO(row.created_at),
  };
}

export async function getHabitQuotes(): Promise<HabitQuote[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("habit_quotes")
    .select(HABIT_QUOTE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as HabitQuoteRow[]).map(mapHabitQuote);
}

export async function createHabitQuote(text: string): Promise<HabitQuote> {
  if (!text.trim()) throw new Error("text is required");

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("habit_quotes")
    .insert({ user_id: userId, text: text.trim() })
    .select(HABIT_QUOTE_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/habits");
  return mapHabitQuote(data as HabitQuoteRow);
}

export async function updateHabitQuote(id: string, text: string): Promise<void> {
  if (!text.trim()) throw new Error("text is required");

  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("habit_quotes")
    .update({ text: text.trim() })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/habits");
}

export async function deleteHabitQuote(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("habit_quotes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/habits");
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (this file has no callers yet).

- [ ] **Step 4: Commit**

```bash
git add src/lib/habits/types.ts src/app/actions/habitQuotes.ts
git commit -m "feat: add HabitQuote type and habit_quotes CRUD actions"
```

---

### Task 3: `src/lib/habits/stats.ts` — pure stats functions

**Files:**
- Create: `src/lib/habits/stats.ts`

**Interfaces:**
- Consumes: `Habit`, `HabitLog` from `@/lib/habits/types`; `toDateKey` from `@/lib/date/date-key`.
- Produces: `getDayState(habits, logs, date): "all-done" | "missed" | "no-habit"`; `getCurrentStreak(habitId, logs, today): number`; `getBestStreak(habitId, logs): number`; `getLongestBreak(habitId, logs, createdAt): number`; `getCompletedDaysCount(habitId, logs): number`; `rankByFrequency(habits, logs): { habit: Habit; count: number }[]` — Task 4 (year grid), Task 8 (frequency stats row) and Task 10 ("Dựng thói quen" page: streak callout), and Task 6 (detail dialog) all call these by these exact names.

- [ ] **Step 1: Write the module**

```ts
import { addDays, isBefore, isSameDay, subDays } from "date-fns";
import { toDateKey } from "@/lib/date/date-key";
import type { Habit, HabitLog } from "@/lib/habits/types";

export type HabitDayState = "all-done" | "missed" | "no-habit";

function logsByDate(logs: HabitLog[], habitId: string): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const log of logs) {
    if (log.habitId === habitId) map.set(log.logDate, log.completed);
  }
  return map;
}

/**
 * Per-day state for the year grid: "no-habit" if no habit existed yet on
 * that date (every habit's createdAt is after it); else "all-done" only if
 * every habit that existed by then was completed that day; else "missed".
 */
export function getDayState(habits: Habit[], logs: HabitLog[], date: Date): HabitDayState {
  const applicable = habits.filter((habit) => !isBefore(date, habit.createdAt) || isSameDay(date, habit.createdAt));
  if (applicable.length === 0) return "no-habit";

  const dateKey = toDateKey(date);
  const allDone = applicable.every((habit) =>
    logs.some((log) => log.habitId === habit.id && log.logDate === dateKey && log.completed)
  );
  return allDone ? "all-done" : "missed";
}

/** Consecutive completed days ending today (0 if today itself isn't completed). */
export function getCurrentStreak(habitId: string, logs: HabitLog[], today: Date): number {
  const byDate = logsByDate(logs, habitId);
  let streak = 0;
  let cursor = today;

  while (byDate.get(toDateKey(cursor)) === true) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  return streak;
}

/** Longest consecutive completed run ever recorded for this habit. */
export function getBestStreak(habitId: string, logs: HabitLog[]): number {
  const completedDates = logs
    .filter((log) => log.habitId === habitId && log.completed)
    .map((log) => log.logDate)
    .sort();

  let best = 0;
  let current = 0;
  let previousKey: string | null = null;

  for (const dateKey of completedDates) {
    if (previousKey !== null && toDateKey(addDays(new Date(previousKey), 1)) === dateKey) {
      current += 1;
    } else {
      current = 1;
    }
    best = Math.max(best, current);
    previousKey = dateKey;
  }

  return best;
}

/** Longest consecutive not-completed run between createdAt and today. */
export function getLongestBreak(habitId: string, logs: HabitLog[], createdAt: Date, today: Date = new Date()): number {
  const byDate = logsByDate(logs, habitId);
  let longest = 0;
  let current = 0;
  let cursor = createdAt;

  while (!isBefore(today, cursor)) {
    const completed = byDate.get(toDateKey(cursor)) === true;
    current = completed ? 0 : current + 1;
    longest = Math.max(longest, current);
    cursor = addDays(cursor, 1);
  }

  return longest;
}

/** Total number of distinct days this habit was completed. */
export function getCompletedDaysCount(habitId: string, logs: HabitLog[]): number {
  return logs.filter((log) => log.habitId === habitId && log.completed).length;
}

/** Habits sorted by completed-day count, descending — caller slices top 3 + sums the rest into "Khác". */
export function rankByFrequency(habits: Habit[], logs: HabitLog[]): { habit: Habit; count: number }[] {
  return habits
    .map((habit) => ({ habit, count: getCompletedDaysCount(habit.id, logs) }))
    .sort((a, b) => b.count - a.count);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/habits/stats.ts
git commit -m "feat: add pure habit stats functions (day state, streaks, frequency rank)"
```

---

### Task 4: `HabitDayDot` + `HabitYearGrid`

**Files:**
- Create: `src/components/habits/HabitDayDot.tsx`
- Create: `src/components/habits/HabitYearGrid.tsx`

**Interfaces:**
- Consumes: `getMonthsData`, `getYearProgress` from `@/lib/date/year-progress`; `toDateKey` from `@/lib/date/date-key`; `getDayState` from `@/lib/habits/stats` (Task 3); `Habit`, `HabitLog` from `@/lib/habits/types`.
- Produces: `HabitDayDot({ dayState, today, title, completedCount, totalCount }: HabitDayDotProps)`; `HabitYearGrid({ habits, habitLogs, referenceDate?, className? }: HabitYearGridProps)` — Task 10's `/habits` page renders `HabitYearGrid` directly.

- [ ] **Step 1: Write `HabitDayDot`**

```tsx
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { HabitDayState } from "@/lib/habits/stats";

const DOT_STYLES: Record<HabitDayState, string> = {
  "all-done": "bg-emerald-500",
  missed: "bg-slate-300",
  "no-habit": "border border-slate-300 bg-transparent",
};

interface HabitDayDotProps {
  dayState: HabitDayState;
  /** True for the real current day — gets the enlarged/ringed treatment. */
  today?: boolean;
  title: string;
  /** Omitted entirely for "no-habit" days. */
  completedCount?: number;
  totalCount?: number;
}

export function HabitDayDot({ dayState, today = false, title, completedCount, totalCount }: HabitDayDotProps) {
  const hasTooltip = dayState !== "no-habit" && completedCount !== undefined && totalCount !== undefined;

  const dot = (
    <span
      title={hasTooltip ? undefined : title}
      className={cn("relative inline-flex size-[6px]", today && "scale-[1.9]")}
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full transition-colors duration-200",
          DOT_STYLES[dayState],
          today && "ring-2 ring-sky-300"
        )}
      />
    </span>
  );

  if (!hasTooltip) return dot;

  return (
    <Tooltip>
      <TooltipTrigger render={dot} />
      <TooltipContent>
        {title} · {completedCount}/{totalCount} thói quen hoàn thành
      </TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Step 2: Write `HabitYearGrid`**

```tsx
"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getMonthsData, getYearProgress } from "@/lib/date/year-progress";
import { toDateKey } from "@/lib/date/date-key";
import { getDayState } from "@/lib/habits/stats";
import { HabitDayDot } from "@/components/habits/HabitDayDot";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Habit, HabitLog } from "@/lib/habits/types";

interface HabitYearGridProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  /** Overrides "today" — useful for testing. Defaults to the real current date. */
  referenceDate?: Date;
  className?: string;
}

function HabitYearGridImpl({ habits, habitLogs, referenceDate, className }: HabitYearGridProps) {
  const progress = useMemo(() => getYearProgress(referenceDate), [referenceDate]);
  const months = useMemo(() => getMonthsData(referenceDate), [referenceDate]);
  const todayKey = toDateKey(referenceDate ?? new Date());

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-8 text-slate-800 shadow-sm",
        className
      )}
    >
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest text-slate-500">{progress.year}</p>
          <p className="font-mono text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
            DAY {String(progress.dayOfYear).padStart(3, "0")}
            <span className="text-slate-500"> / {progress.totalDaysInYear}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-semibold text-primary sm:text-3xl">
            {progress.percentComplete}%
          </p>
          <p className="text-xs tracking-wide text-slate-500">of {progress.year} completed</p>
        </div>
      </header>

      <TooltipProvider>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 xl:grid-cols-4">
          {months.map((month) => (
            <section key={month.index}>
              <h3 className="mb-2 font-mono text-xs tracking-widest text-slate-500">{month.label}</h3>
              <div className="grid grid-cols-7 gap-x-[6px] gap-y-[10px]">
                {month.days.map((cell) => {
                  const date = new Date(progress.year, month.index, cell.day);
                  const dateKey = toDateKey(date);
                  const dayState = getDayState(habits, habitLogs, date);
                  const applicableCount = habits.filter((h) => toDateKey(h.createdAt) <= dateKey).length;
                  const completedCount = habitLogs.filter(
                    (log) => log.logDate === dateKey && log.completed
                  ).length;

                  return (
                    <HabitDayDot
                      key={cell.day}
                      dayState={dayState}
                      today={dateKey === todayKey}
                      title={`${month.label} ${cell.day}`}
                      completedCount={dayState === "no-habit" ? undefined : completedCount}
                      totalCount={dayState === "no-habit" ? undefined : applicableCount}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}

export const HabitYearGrid = memo(HabitYearGridImpl);
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (not wired into any page yet).

- [ ] **Step 4: Commit**

```bash
git add src/components/habits/HabitDayDot.tsx src/components/habits/HabitYearGrid.tsx
git commit -m "feat: add HabitDayDot and HabitYearGrid for the habit-tracking page"
```

---

### Task 5: `DeleteHabitDialog` — press-and-hold + type-to-confirm

**Files:**
- Create: `src/components/habits/DeleteHabitDialog.tsx`

**Interfaces:**
- Consumes: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog`; `Button` from `@/components/ui/button`; `Input` from `@/components/ui/input`.
- Produces: `DeleteHabitDialog({ open, onOpenChange, habitTitle, onConfirm }: DeleteHabitDialogProps)` — Task 6's `HabitDetailDialog` renders this when its own "Xóa" button is pressed.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const HOLD_DURATION_MS = 3000;

interface DeleteHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitTitle: string;
  onConfirm: () => void;
}

export function DeleteHabitDialog({ open, onOpenChange, habitTitle, onConfirm }: DeleteHabitDialogProps) {
  const [fillPercent, setFillPercent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const frameRef = useRef<number | null>(null);
  const directionRef = useRef<1 | -1>(1);

  function stopAnimation() {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }

  function animate(startPercent: number, startTime: number, direction: 1 | -1) {
    directionRef.current = direction;

    function step(now: number) {
      const elapsed = now - startTime;
      const deltaPercent = (elapsed / HOLD_DURATION_MS) * 100 * direction;
      const next = Math.min(100, Math.max(0, startPercent + deltaPercent));
      setFillPercent(next);

      if (direction === 1 && next >= 100) {
        setRevealed(true);
        stopAnimation();
        return;
      }
      if (direction === -1 && next <= 0) {
        stopAnimation();
        return;
      }
      frameRef.current = requestAnimationFrame(step);
    }

    frameRef.current = requestAnimationFrame(step);
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (revealed) return;
    e.preventDefault();
    stopAnimation();
    animate(fillPercent, performance.now(), 1);
  }

  function handlePointerUp() {
    if (revealed) return;
    stopAnimation();
    animate(fillPercent, performance.now(), -1);
  }

  function resetState() {
    stopAnimation();
    setFillPercent(0);
    setRevealed(false);
    setConfirmText("");
  }

  const canConfirmDelete = confirmText === habitTitle;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetState();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[420px] w-full p-6 bg-white rounded-2xl border-none shadow-xl">
        <DialogHeader>
          <DialogTitle>Bạn có chắc chắn muốn xóa?</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!revealed && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="relative h-9 flex-1 overflow-hidden rounded-lg bg-slate-100 text-sm font-medium text-slate-700 select-none"
              >
                <span
                  className="absolute inset-y-0 left-0 bg-destructive/80"
                  style={{ width: `${fillPercent}%` }}
                />
                <span className="relative z-10">Xóa (giữ 3 giây)</span>
              </button>
              <Button type="button" variant="default" onClick={() => onOpenChange(false)}>
                Đừng xóa
              </Button>
            </div>
          )}

          {revealed && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-600">
                Nhập <span className="font-semibold">{habitTitle}</span> để xác nhận xóa
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={habitTitle}
                autoFocus
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!canConfirmDelete}
                  className="flex-1"
                  onClick={() => {
                    onConfirm();
                    onOpenChange(false);
                  }}
                >
                  Xóa vĩnh viễn
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Hủy
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

Note on the spec's "Xóa (left, default/white) / Đừng xóa (right, blue/primary)" button order: implemented here as the hold-button on the left and `variant="default"` (primary) "Đừng xóa" on the right, matching the spec's left/right + color pairing exactly.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/habits/DeleteHabitDialog.tsx
git commit -m "feat: add GitHub-style press-and-hold delete flow for habits"
```

---

### Task 6: `HabitDetailDialog` — view/edit toggle + delete entry point

**Files:**
- Create: `src/components/habits/HabitDetailDialog.tsx`

**Interfaces:**
- Consumes: `Habit`, `HabitLog` from `@/lib/habits/types`; `getCompletedDaysCount`, `getBestStreak`, `getLongestBreak` from `@/lib/habits/stats` (Task 3); `DeleteHabitDialog` (Task 5); `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` from `@/components/ui/dialog`; `Input`, `Textarea`, `Label`, `Button` from `@/components/ui`.
- Produces: `HabitDetailDialog({ habit, habitLogs, open, onOpenChange, onUpdate, onDelete }: HabitDetailDialogProps)` where `onUpdate(id: string, input: { title: string; description: string | null; dueTime: string }): void` and `onDelete(id: string): void` — Task 10's `/habits` page renders this per-habit row click and wires these to `updateHabit`/`deleteHabit`.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DeleteHabitDialog } from "@/components/habits/DeleteHabitDialog";
import { getBestStreak, getCompletedDaysCount, getLongestBreak } from "@/lib/habits/stats";
import type { Habit, HabitLog } from "@/lib/habits/types";

interface HabitDetailDialogProps {
  habit: Habit | null;
  habitLogs: HabitLog[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, input: { title: string; description: string | null; dueTime: string }) => void;
  onDelete: (id: string) => void;
}

export function HabitDetailDialog({ habit, habitLogs, open, onOpenChange, onUpdate, onDelete }: HabitDetailDialogProps) {
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueTime, setDueTime] = useState("23:59");

  function startEditing() {
    if (!habit) return;
    setTitle(habit.title);
    setDescription(habit.description ?? "");
    setDueTime(habit.dueTime);
    setEditing(true);
  }

  function handleSave() {
    if (!habit || !title.trim()) return;
    onUpdate(habit.id, {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      dueTime,
    });
    setEditing(false);
  }

  if (!habit) return null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setEditing(false);
          onOpenChange(next);
        }}
      >
        <DialogContent className="sm:max-w-[480px] w-full p-6 bg-white rounded-2xl border-none shadow-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa thói quen" : habit.title}</DialogTitle>
          </DialogHeader>

          {editing ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habit-title">Tiêu đề</Label>
                <Input id="habit-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habit-description">Mô tả</Label>
                <Textarea
                  id="habit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ghi chú thêm (không bắt buộc)"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habit-due-time">Hạn chót (giờ)</Label>
                <Input
                  id="habit-due-time"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" className="flex-1" onClick={handleSave}>
                  Lưu thay đổi
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Hủy
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {habit.description && <p className="text-sm text-slate-600">{habit.description}</p>}
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-400">Bắt đầu</dt>
                  <dd className="font-medium text-slate-700">{format(habit.createdAt, "dd/MM/yyyy")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Hạn chót</dt>
                  <dd className="font-medium text-slate-700">{habit.dueTime}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Số ngày hoàn thành</dt>
                  <dd className="font-medium text-slate-700">{getCompletedDaysCount(habit.id, habitLogs)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Streak tốt nhất</dt>
                  <dd className="font-medium text-slate-700">{getBestStreak(habit.id, habitLogs)} ngày</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Chuỗi gián đoạn dài nhất</dt>
                  <dd className="font-medium text-slate-700">{getLongestBreak(habit.id, habitLogs, habit.createdAt)} ngày</dd>
                </div>
              </dl>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={startEditing}>
                  Sửa
                </Button>
                <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
                  Xóa
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteHabitDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        habitTitle={habit.title}
        onConfirm={() => {
          onDelete(habit.id);
          onOpenChange(false);
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/habits/HabitDetailDialog.tsx
git commit -m "feat: add habit detail dialog with view/edit toggle and delete entry point"
```

---

### Task 7: Quote widget — `QuoteWidget` + `QuoteManagerDialog`

**Files:**
- Create: `src/components/habits/QuoteWidget.tsx`
- Create: `src/components/habits/QuoteManagerDialog.tsx`

**Interfaces:**
- Consumes: `HabitQuote` from `@/lib/habits/types`; `createHabitQuote`, `updateHabitQuote`, `deleteHabitQuote` from `@/app/actions/habitQuotes` (Task 2); `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` from `@/components/ui/dialog`; `Input`, `Button` from `@/components/ui`.
- Produces: `QuoteWidget({ quotes }: { quotes: HabitQuote[] })` (picks one at random client-side on mount so it varies per load without a server round trip, and renders the "Quản lý quote" trigger) — Task 10's `/habits` page renders this with the server-fetched `quotes` list.

- [ ] **Step 1: Write `QuoteManagerDialog`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createHabitQuote, deleteHabitQuote, updateHabitQuote } from "@/app/actions/habitQuotes";
import type { HabitQuote } from "@/lib/habits/types";

interface QuoteManagerDialogProps {
  quotes: HabitQuote[];
  trigger: React.ReactElement;
}

export function QuoteManagerDialog({ quotes, trigger }: QuoteManagerDialogProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  function handleAdd() {
    if (!newText.trim()) return;
    const text = newText.trim();
    setNewText("");
    startTransition(async () => {
      await createHabitQuote(text);
      router.refresh();
    });
  }

  function handleSaveEdit(id: string) {
    if (!editingText.trim()) return;
    const text = editingText.trim();
    setEditingId(null);
    startTransition(async () => {
      await updateHabitQuote(id, text);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteHabitQuote(id);
      router.refresh();
    });
  }

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-[480px] w-full p-6 bg-white rounded-2xl border-none shadow-xl">
        <DialogHeader>
          <DialogTitle>Quản lý quote</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {quotes.length > 0 && (
            <ul className="flex flex-col gap-2">
              {quotes.map((quote) => (
                <li key={quote.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  {editingId === quote.id ? (
                    <Input
                      className="min-w-0 flex-1"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(quote.id);
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left text-sm text-slate-700"
                      onClick={() => {
                        setEditingId(quote.id);
                        setEditingText(quote.text);
                      }}
                    >
                      {quote.text}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Xóa quote"
                    className="shrink-0 text-slate-400 hover:text-destructive"
                    onClick={() => handleDelete(quote.id)}
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <Input
              className="min-w-0 flex-1"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Thêm quote mới"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
            <Button type="button" variant="outline" size="icon" onClick={handleAdd}>
              <PlusIcon className="size-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Write `QuoteWidget`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { QuoteManagerDialog } from "@/components/habits/QuoteManagerDialog";
import type { HabitQuote } from "@/lib/habits/types";

interface QuoteWidgetProps {
  quotes: HabitQuote[];
}

export function QuoteWidget({ quotes }: QuoteWidgetProps) {
  // Picked client-side on mount (not during render) so a prerendered page
  // doesn't bake in one fixed quote — each load gets its own random pick.
  const [quote, setQuote] = useState<HabitQuote | null>(null);

  useEffect(() => {
    if (quotes.length === 0) {
      setQuote(null);
      return;
    }
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, [quotes]);

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <p className="min-w-0 flex-1 text-sm italic text-slate-600">
        {quote ? `"${quote.text}"` : "Chưa có quote nào — thêm một câu truyền cảm hứng."}
      </p>
      <QuoteManagerDialog
        quotes={quotes}
        trigger={
          <button type="button" className="shrink-0 text-xs font-medium text-primary hover:underline">
            Quản lý quote
          </button>
        }
      />
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/habits/QuoteWidget.tsx src/components/habits/QuoteManagerDialog.tsx
git commit -m "feat: add habit quote widget and quote list manager dialog"
```

---

### Task 8: Stats row — `HabitFrequencyRow` + "Khác" modal

**Files:**
- Create: `src/components/habits/HabitFrequencyRow.tsx`

**Interfaces:**
- Consumes: `rankByFrequency` from `@/lib/habits/stats` (Task 3); `Habit`, `HabitLog` from `@/lib/habits/types`; `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` from `@/components/ui/dialog`.
- Produces: `HabitFrequencyRow({ habits, habitLogs }: { habits: Habit[]; habitLogs: HabitLog[] })` — Task 10's `/habits` page renders this directly; `rankByFrequency` (Task 3) is also re-imported by Task 10 itself to compute the streak callout's top habit.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { rankByFrequency } from "@/lib/habits/stats";
import type { Habit, HabitLog } from "@/lib/habits/types";

interface HabitFrequencyRowProps {
  habits: Habit[];
  habitLogs: HabitLog[];
}

export function HabitFrequencyRow({ habits, habitLogs }: HabitFrequencyRowProps) {
  const [open, setOpen] = useState(false);
  const ranked = rankByFrequency(habits, habitLogs);
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const restTotal = rest.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {top3.map(({ habit, count }) => (
        <div key={habit.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="truncate text-sm font-medium text-slate-700" title={habit.title}>
            {habit.title}
          </p>
          <p className="mt-1 font-mono text-xl font-semibold text-primary">{count}</p>
          <p className="text-xs text-slate-400">ngày hoàn thành</p>
        </div>
      ))}

      {rest.length > 0 && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <button
                type="button"
                className="rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition-colors duration-200 hover:bg-slate-50"
              >
                <p className="text-sm font-medium text-slate-700">Khác</p>
                <p className="mt-1 font-mono text-xl font-semibold text-primary">{restTotal}</p>
                <p className="text-xs text-slate-400">{rest.length} thói quen khác</p>
              </button>
            }
          />
          <DialogContent className="sm:max-w-[420px] w-full p-6 bg-white rounded-2xl border-none shadow-xl">
            <DialogHeader>
              <DialogTitle>Thói quen khác</DialogTitle>
            </DialogHeader>
            <ul className="flex flex-col gap-2">
              {rest.map(({ habit, count }) => (
                <li key={habit.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="truncate text-slate-700">{habit.title}</span>
                  <span className="shrink-0 font-mono text-slate-500">{count}</span>
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/habits/HabitFrequencyRow.tsx
git commit -m "feat: add habit frequency stats row with Khác modal"
```

---

### Task 9: Today's habit checklist with row-click-to-detail

**Files:**
- Modify: `src/components/habits/HabitChecklistItem.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `HabitChecklistItem` gains an optional `onRowClick?: (habit: Habit) => void` prop — clicking the row (not the checkbox) calls it; existing callers that omit it (the Todo page's `TasksOverviewSection`) keep today's checkbox-only behavior unchanged. Task 10's `/habits` page passes `onRowClick` to open `HabitDetailDialog`.

- [ ] **Step 1: Add the optional row-click prop**

Replace the whole file:

```tsx
"use client";

import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Habit, HabitLog } from "@/lib/habits/types";

interface HabitChecklistItemProps {
  habit: Habit;
  log: HabitLog | undefined;
  onToggle: (habitId: string, completed: boolean) => void;
  /** True while a toggle mutation for this habit is in flight. */
  pending?: boolean;
  /** Clicking the row (not the checkbox) opens the habit's detail view. Omit to keep the row non-clickable, as on the Todo page. */
  onRowClick?: (habit: Habit) => void;
}

/**
 * One daily-habit row: a checkbox for the currently selected day plus its
 * due time. On the Todo page this is checkbox-only (no `onRowClick`); on
 * the habit-tracking page the row itself opens the detail/edit dialog.
 */
export function HabitChecklistItem({ habit, log, onToggle, pending = false, onRowClick }: HabitChecklistItemProps) {
  const completed = log?.completed ?? false;

  return (
    <li
      onClick={onRowClick ? () => onRowClick(habit) : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors duration-200",
        completed ? "border-slate-200/60 bg-slate-50" : "border-slate-200/80 bg-white hover:bg-slate-50",
        onRowClick && "cursor-pointer"
      )}
    >
      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
        {pending ? (
          <Loader2 className="size-4 animate-spin text-slate-400" />
        ) : (
          <Checkbox
            checked={completed}
            onCheckedChange={(checked) => onToggle(habit.id, checked === true)}
            aria-label={completed ? "Đánh dấu chưa làm" : "Đánh dấu đã xong"}
          />
        )}
      </div>
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

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors — `TasksOverviewSection`'s existing usage (no `onRowClick` passed) still compiles since the prop is optional.

- [ ] **Step 3: Commit**

```bash
git add src/components/habits/HabitChecklistItem.tsx
git commit -m "feat: let HabitChecklistItem open a row-click detail callback"
```

---

### Task 10: `/habits` page — wire everything together

**Files:**
- Create: `src/components/habits/HabitsPageContent.tsx`
- Create: `src/app/(dashboard)/habits/HabitsContent.tsx`
- Create: `src/app/(dashboard)/habits/page.tsx`
- Create: `src/app/(dashboard)/habits/loading.tsx`

**Interfaces:**
- Consumes: `getHabits`, `getHabitLogs`, `setHabitLogStatus`, `updateHabit`, `deleteHabit` from `@/app/actions/habits`; `getHabitQuotes` from `@/app/actions/habitQuotes` (Task 2); `getCurrentStreak`, `rankByFrequency` from `@/lib/habits/stats` (Task 3); `HabitYearGrid` (Task 4); `HabitFrequencyRow` (Task 8); `QuoteWidget` (Task 7); `HabitChecklistItem` (Task 9); `HabitDetailDialog` (Task 6); `TopBar` from `@/components/layout/TopBar`; `toDateKey` from `@/lib/date/date-key`.
- Produces: the `/habits` route, rendering the full page described in the spec.

- [ ] **Step 1: Write the client board — `HabitsPageContent`**

```tsx
"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteHabit, setHabitLogStatus, updateHabit } from "@/app/actions/habits";
import { HabitChecklistItem } from "@/components/habits/HabitChecklistItem";
import { HabitDetailDialog } from "@/components/habits/HabitDetailDialog";
import { HabitFrequencyRow } from "@/components/habits/HabitFrequencyRow";
import { HabitYearGrid } from "@/components/habits/HabitYearGrid";
import { QuoteWidget } from "@/components/habits/QuoteWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toDateKey } from "@/lib/date/date-key";
import { getCurrentStreak, rankByFrequency } from "@/lib/habits/stats";
import type { Habit, HabitLog, HabitQuote } from "@/lib/habits/types";

interface HabitsPageContentProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  quotes: HabitQuote[];
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

export function HabitsPageContent({ habits, habitLogs, quotes }: HabitsPageContentProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimisticLogs, applyOptimisticLog] = useOptimistic(habitLogs, applyOptimisticHabitLog);
  const [pendingHabitIds, setPendingHabitIds] = useState<Set<string>>(new Set());
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  const todayKey = toDateKey(new Date());
  const todayLogsByHabitId = new Map(
    optimisticLogs.filter((log) => log.logDate === todayKey).map((log) => [log.habitId, log])
  );

  function handleToggle(habitId: string, completed: boolean) {
    setPendingHabitIds((prev) => new Set(prev).add(habitId));
    startTransition(async () => {
      try {
        applyOptimisticLog({ habitId, logDate: todayKey, completed });
        await setHabitLogStatus(habitId, todayKey, completed);
        router.refresh();
      } finally {
        setPendingHabitIds((prev) => {
          const next = new Set(prev);
          next.delete(habitId);
          return next;
        });
      }
    });
  }

  function handleUpdate(id: string, input: { title: string; description: string | null; dueTime: string }) {
    startTransition(async () => {
      await updateHabit(id, input);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteHabit(id);
      router.refresh();
    });
  }

  const ranked = rankByFrequency(habits, optimisticLogs);
  const topHabit = ranked[0]?.habit;
  const topStreak = topHabit ? getCurrentStreak(topHabit.id, optimisticLogs, new Date()) : 0;
  const selectedHabit = habits.find((h) => h.id === selectedHabitId) ?? null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <HabitYearGrid habits={habits} habitLogs={optimisticLogs} />

      {habits.length > 0 && <HabitFrequencyRow habits={habits} habitLogs={optimisticLogs} />}

      {topHabit && topStreak >= 1 && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Bạn đã liên tục thực hiện {topHabit.title} liên tục {topStreak} ngày
        </p>
      )}

      <QuoteWidget quotes={quotes} />

      <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
        <CardHeader className="px-8 pt-8">
          <CardTitle className="text-lg font-semibold text-slate-700">Hôm nay</CardTitle>
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
                  log={todayLogsByHabitId.get(habit.id)}
                  onToggle={handleToggle}
                  pending={pendingHabitIds.has(habit.id)}
                  onRowClick={(h) => setSelectedHabitId(h.id)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <HabitDetailDialog
        habit={selectedHabit}
        habitLogs={optimisticLogs}
        open={selectedHabitId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedHabitId(null);
        }}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

- [ ] **Step 2: Write the server data-fetching wrapper — `HabitsContent`**

```tsx
import { connection } from "next/server";
import { getHabits, getHabitLogs } from "@/app/actions/habits";
import { getHabitQuotes } from "@/app/actions/habitQuotes";
import { HabitsPageContent } from "@/components/habits/HabitsPageContent";
import { TopBar } from "@/components/layout/TopBar";

export async function HabitsContent() {
  await connection();
  const [habits, habitLogs, quotes] = await Promise.all([getHabits(), getHabitLogs(), getHabitQuotes()]);

  return (
    <div className="min-h-screen bg-slate-100/70">
      <TopBar title="Dựng thói quen" />
      <HabitsPageContent habits={habits} habitLogs={habitLogs} quotes={quotes} />
    </div>
  );
}
```

- [ ] **Step 3: Write `page.tsx`**

```tsx
import { Suspense } from "react";
import { HabitsContent } from "@/app/(dashboard)/habits/HabitsContent";

export default function HabitsPage() {
  return (
    <Suspense>
      <HabitsContent />
    </Suspense>
  );
}
```

- [ ] **Step 4: Write `loading.tsx`**

```tsx
export default function HabitsLoading() {
  return <div className="min-h-screen bg-slate-100/70" />;
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors across the whole project.

- [ ] **Step 6: Commit**

```bash
git add src/components/habits/HabitsPageContent.tsx src/app/(dashboard)/habits/HabitsContent.tsx src/app/(dashboard)/habits/page.tsx src/app/(dashboard)/habits/loading.tsx
git commit -m "feat: add the /habits page wiring year grid, stats, quote widget, and today's checklist"
```

---

### Task 11: Nav restructure — `nav-items.ts` tree

**Files:**
- Modify: `src/components/layout/nav-items.ts`

**Interfaces:**
- Produces: `NAV_GROUPS` — a tree with a `"Công việc"` parent (`children: [{ href: "/", label: "Todo List" }, { href: "/habits", label: "Dựng thói quen" }]`) plus flat `"Lịch & Sự kiện"` and `"Tài nguyên"` entries. Also keeps exporting a flat `NAV_ITEMS` (all leaf entries, in display order) so `MobileNav.tsx` (Task 13) doesn't need its own flattening logic. Task 12 (`Sidebar.tsx`) consumes `NAV_GROUPS`; Task 13 (`MobileNav.tsx`) consumes `NAV_ITEMS`.

- [ ] **Step 1: Replace the file**

```ts
import { CalendarDays, CheckSquare2, Flame, LayoutDashboard, Link2 } from "lucide-react";

interface NavLeaf {
  href: string;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  icon: typeof LayoutDashboard;
  children: NavLeaf[];
}

export const NAV_GROUPS: (NavGroup | NavLeaf)[] = [
  {
    label: "Công việc",
    icon: LayoutDashboard,
    children: [
      { href: "/", label: "Todo List", shortLabel: "Todo List", icon: CheckSquare2 },
      { href: "/habits", label: "Dựng thói quen", shortLabel: "Thói quen", icon: Flame },
    ],
  },
  { href: "/analytics", label: "Lịch & Sự kiện", shortLabel: "Lịch", icon: CalendarDays },
  { href: "/resources", label: "Tài nguyên", shortLabel: "Tài nguyên", icon: Link2 },
];

function isGroup(entry: NavGroup | NavLeaf): entry is NavGroup {
  return "children" in entry;
}

/** Flat list of every leaf entry, in display order — used by the mobile bottom nav, which has no room for a submenu. */
export const NAV_ITEMS: NavLeaf[] = NAV_GROUPS.flatMap((entry) => (isGroup(entry) ? entry.children : [entry]));
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: errors in `Sidebar.tsx` and `MobileNav.tsx` (`NAV_ITEMS` import shape changed / `NAV_GROUPS` doesn't exist yet there) — expected, fixed in Tasks 12–13.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/nav-items.ts
git commit -m "refactor: restructure nav items into a Công việc group plus flat entries"
```

---

### Task 12: `Sidebar.tsx` — expandable group + sticky

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `NAV_GROUPS` from `@/components/layout/nav-items` (Task 11).

- [ ] **Step 1: Replace the file**

```tsx
"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "@/components/layout/nav-items";

interface SidebarProps {
  profileSlot: ReactNode;
}

function isActiveHref(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar({ profileSlot }: SidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(
      NAV_GROUPS.filter(
        (entry) => "children" in entry && entry.children.some((child) => isActiveHref(pathname, child.href))
      ).map((entry) => entry.label)
    )
  );

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-2 px-5 py-6">
        <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <span className="font-mono text-sm font-semibold tracking-wide text-sidebar-foreground">CoralTask</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_GROUPS.map((entry) => {
          if (!("children" in entry)) {
            const active = isActiveHref(pathname, entry.href);
            const Icon = entry.icon;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                prefetch={true}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("size-4", active && "text-sidebar-primary")} />
                {entry.label}
              </Link>
            );
          }

          const GroupIcon = entry.icon;
          const open = openGroups.has(entry.label);

          return (
            <div key={entry.label} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => toggleGroup(entry.label)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/60 transition-colors duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              >
                <GroupIcon className="size-4" />
                <span className="flex-1 text-left">{entry.label}</span>
                <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
              </button>
              {open && (
                <div className="flex flex-col gap-1 pl-6">
                  {entry.children.map((child) => {
                    const active = isActiveHref(pathname, child.href);
                    const ChildIcon = child.icon;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        prefetch={true}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                        )}
                      >
                        <ChildIcon className={cn("size-4", active && "text-sidebar-primary")} />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {profileSlot}
    </aside>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `MobileNav.tsx` still errors (Task 13 fixes it); no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: make sidebar sticky and group Todo List + habit page under Công việc"
```

---

### Task 13: `MobileNav.tsx` — flatten to 4 tabs

**Files:**
- Modify: `src/components/layout/MobileNav.tsx`

**Interfaces:**
- Consumes: `NAV_ITEMS` from `@/components/layout/nav-items` (Task 11, already flat — no change needed to the consuming logic, only the import still resolves the same shape).

- [ ] **Step 1: Verify the file compiles unchanged**

`MobileNav.tsx` already imports `NAV_ITEMS` and maps over `{ href, shortLabel, icon }` — Task 11 kept `NAV_ITEMS` exported with that exact shape (now sourced from flattening `NAV_GROUPS`), so no edit is needed here. Confirm by reading the file: it should still read exactly as it did before Task 11.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors across the whole project — this closes out the nav-items refactor from Tasks 11–12.

- [ ] **Step 3: Commit**

Nothing to commit for this task (no file changed) — skip the commit step.

---

### Task 14: `TopBar.tsx` — drop the bell, add avatar logout dropdown

**Files:**
- Modify: `src/components/layout/TopBar.tsx`
- Modify: `src/app/(dashboard)/OverviewContent.tsx`
- Modify: `src/app/(dashboard)/analytics/AnalyticsContent.tsx`

**Interfaces:**
- Consumes: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` from `@/components/ui/dropdown-menu`; `signOut` from `@/app/login/actions`.
- Produces: `TopBarProps` drops `overdueCount` entirely; the avatar renders whenever `email` is truthy (regardless of `title`) and is now a `DropdownMenu` trigger with one "Đăng xuất" item.

- [ ] **Step 1: Rewrite `TopBar.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopBarProps {
  /** Omit to render a plain page title instead of the personalized greeting. */
  email?: string | null;
  title?: string;
}

function getGreeting(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function TopBar({ email, title }: TopBarProps) {
  // Starts null so the initial (and prerendered) render never reads the
  // current time — Next's static prerendering rejects `new Date()` during
  // render. The real clock is filled in after mount, client-side only.
  const [now, setNow] = useState<Date | null>(null);
  const displayName = email ? email.split("@")[0] : "bạn";
  const initial = (email?.[0] ?? "?").toUpperCase();

  useEffect(() => {
    if (title) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [title]);

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-4 sm:px-8">
      {title ? (
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
      ) : now ? (
        <div>
          <p className="text-xs font-medium capitalize text-slate-500">{format(now, "EEEE", { locale: vi })}</p>
          <p className="flex items-baseline gap-2 text-base font-semibold text-slate-800">
            {format(now, "dd/MM/yyyy")}
            <span className="font-mono text-sm font-medium text-slate-500">{format(now, "HH:mm:ss")}</span>
          </p>
        </div>
      ) : (
        <div className="h-10" />
      )}

      {email && (
        <div className="flex min-w-0 items-center gap-3">
          {!title && (
            <div className="min-w-0 text-right">
              <p className="text-xs font-medium text-slate-500">{now ? getGreeting(now) : " "}</p>
              <p className="truncate text-base font-semibold text-slate-800">{displayName}</p>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Tài khoản"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
                >
                  {initial}
                </button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                render={
                  <form action={signOut} className="w-full">
                    <button type="submit" className="flex w-full items-center gap-1.5">
                      <LogOut />
                      Đăng xuất
                    </button>
                  </form>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Remove `overdueCount` from `OverviewContent.tsx`**

In `src/app/(dashboard)/OverviewContent.tsx`, remove the `overdueCount` computation and prop:

```tsx
import { connection } from "next/server";
import { getTasks } from "@/app/actions/tasks";
import { getHabits, getHabitLogs } from "@/app/actions/habits";
import { getEvents } from "@/app/actions/events";
import { getCurrentUserEmail } from "@/lib/supabase/require-user";
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

  return (
    <div className="min-h-screen bg-slate-100/70">
      <TopBar email={email} />

      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        <OverviewBoard tasks={tasks} habits={habits} habitLogs={habitLogs} events={events} />
      </div>
    </div>
  );
}
```

Note: `isOverdue` is no longer imported/used here — the overdue-tasks UI itself (e.g. `#overdue-tasks` highlighting inside `OverviewBoard`) is untouched; only the bell affordance in `TopBar` is removed.

- [ ] **Step 3: Remove `overdueCount` from `AnalyticsContent.tsx`**

```tsx
import { connection } from "next/server";
import { getTasks } from "@/app/actions/tasks";
import { getEvents } from "@/app/actions/events";
import { EventsListSection } from "@/components/events/EventsListSection";
import { TopBar } from "@/components/layout/TopBar";
import { YearGrid } from "@/components/year-grid/YearGrid";
import { getCurrentUserEmail } from "@/lib/supabase/require-user";

export async function AnalyticsContent() {
  await connection();
  const [tasks, events, email] = await Promise.all([getTasks(), getEvents(), getCurrentUserEmail()]);

  return (
    <div className="min-h-screen bg-slate-100/70">
      <TopBar title="Lịch & Sự kiện" email={email} />

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-3 lg:items-start">
        <YearGrid events={events} tasks={tasks} className="w-full lg:col-span-2" />

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:sticky lg:top-6">
          <EventsListSection events={events} title="Sự kiện đặc biệt" pageSize={5} />
        </div>
      </div>
    </div>
  );
}
```

Note: `email` is now threaded into this page's `TopBar` too (via `getCurrentUserEmail`), since the avatar must be reachable from every page per the spec — `AnalyticsContent` previously never fetched the email at all.

- [ ] **Step 4: Update `HabitsContent.tsx` (Task 10) the same way, for consistency**

In `src/app/(dashboard)/habits/HabitsContent.tsx`, thread `email` through too so the avatar/logout is reachable from the habits page as well:

```tsx
import { connection } from "next/server";
import { getHabits, getHabitLogs } from "@/app/actions/habits";
import { getHabitQuotes } from "@/app/actions/habitQuotes";
import { HabitsPageContent } from "@/components/habits/HabitsPageContent";
import { TopBar } from "@/components/layout/TopBar";
import { getCurrentUserEmail } from "@/lib/supabase/require-user";

export async function HabitsContent() {
  await connection();
  const [habits, habitLogs, quotes, email] = await Promise.all([
    getHabits(),
    getHabitLogs(),
    getHabitQuotes(),
    getCurrentUserEmail(),
  ]);

  return (
    <div className="min-h-screen bg-slate-100/70">
      <TopBar title="Dựng thói quen" email={email} />
      <HabitsPageContent habits={habits} habitLogs={habitLogs} quotes={quotes} />
    </div>
  );
}
```

- [ ] **Step 5: Thread `email` through `ResourcesContent.tsx` too, for the same reason**

```tsx
import { connection } from "next/server";
import { getResources } from "@/app/actions/resources";
import { ResourcesBoard } from "@/components/resources/ResourcesBoard";
import { TopBar } from "@/components/layout/TopBar";
import { getCurrentUserEmail } from "@/lib/supabase/require-user";

export async function ResourcesContent() {
  await connection();
  const [{ folders, links }, email] = await Promise.all([getResources(), getCurrentUserEmail()]);

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Tài nguyên" email={email} />
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <ResourcesBoard folders={folders} links={links} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors across the whole project.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/TopBar.tsx src/app/\(dashboard\)/OverviewContent.tsx src/app/\(dashboard\)/analytics/AnalyticsContent.tsx src/app/\(dashboard\)/habits/HabitsContent.tsx src/app/\(dashboard\)/resources/ResourcesContent.tsx
git commit -m "feat: drop the overdue bell and add an avatar logout dropdown reachable from every page"
```

---

### Task 15: Lint, build, and manual QA

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: builds successfully.

- [ ] **Step 3: Manual QA — habit-tracking page core flow**

Run: `npm run dev`, open `/habits`. Create two habits via... (there is no create-habit UI on `/habits` itself per the spec — habits are created from the Todo page's "+ Thêm công việc" → "Loại: Hàng ngày"). Create 2 habits from the Todo page, then on `/habits`:
Expected: both habits appear in "Hôm nay"; the year grid shows today as a ringed dot; completing one habit for 3 days running (toggle it today, then use the Todo page's date picker to jump back and toggle the previous 2 days — or just toggle today 3 separate days during testing) makes the streak callout read "Bạn đã liên tục thực hiện {habit} liên tục 3 ngày" once that habit is the most-completed; the frequency row shows its count; clicking a habit row (not its checkbox) opens `HabitDetailDialog` showing best-streak/completed-days figures that match what was just toggled.

- [ ] **Step 4: Manual QA — delete flow**

On a habit's detail dialog, click "Xóa", then press-and-hold the hold button and release after ~1 second.
Expected: the fill animates up then reverses back to 0 (not an instant reset) and the type-to-confirm input never appears. Press-and-hold for the full 3 seconds: the type-to-confirm input appears; typing anything other than the exact title keeps "Xóa vĩnh viễn" disabled; typing the exact title enables it and clicking it deletes the habit and closes the dialog.

- [ ] **Step 5: Manual QA — navigation**

On desktop width, confirm the sidebar's "Công việc" group expands/collapses and stays visually pinned (`sticky top-0`) while scrolling a long page (e.g. `/resources` with many links). On a mobile-width viewport, confirm the bottom nav shows exactly 4 flat tabs (Todo List, Dựng thói quen, Lịch & Sự kiện, Tài nguyên) with no nesting. On `/resources` (a title-mode page) at mobile width, confirm the avatar is visible in the `TopBar` and its dropdown's "Đăng xuất" logs out.

- [ ] **Step 6: Commit (only if QA uncovered fixes)**

If any manual QA step required a code fix, commit it separately with a message describing the fix. If everything passed as-is, there's nothing to commit for this task.
