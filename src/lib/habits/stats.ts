import { addDays, parseISO, subDays } from "date-fns";
import { toDateKey } from "@/lib/date/date-key";
import type { Habit, HabitLog } from "@/lib/habits/types";

/** 0 = nothing done (grey) … 4 = everything done (darkest green), GitHub-contribution style. */
export type HabitIntensity = 0 | 1 | 2 | 3 | 4;

export interface HabitDayCompletion {
  /** Habits that already existed on this date. */
  total: number;
  completed: number;
  level: HabitIntensity;
}

function logsByDate(logs: HabitLog[], habitId: string): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const log of logs) {
    if (log.habitId === habitId) map.set(log.logDate, log.completed);
  }
  return map;
}

/** Buckets a completion ratio: 0 → 0, ≤25% → 1, ≤50% → 2, <100% → 3, 100% → 4. */
export function getIntensityLevel(completed: number, total: number): HabitIntensity {
  if (total === 0 || completed === 0) return 0;
  const ratio = completed / total;
  if (ratio >= 1) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

/**
 * Per-day completion for the calendar grid. Only habits whose createdAt is on
 * or before the date count, so adding a habit today doesn't retroactively
 * lower past days. `total === 0` means no habit existed yet on that date.
 */
export function getDayCompletion(habits: Habit[], logs: HabitLog[], date: Date): HabitDayCompletion {
  const dateKey = toDateKey(date);
  const applicable = habits.filter((habit) => toDateKey(habit.createdAt) <= dateKey);
  const completed = applicable.filter((habit) =>
    logs.some((log) => log.habitId === habit.id && log.logDate === dateKey && log.completed)
  ).length;
  return { total: applicable.length, completed, level: getIntensityLevel(completed, applicable.length) };
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
    if (previousKey !== null && toDateKey(addDays(parseISO(previousKey), 1)) === dateKey) {
      current += 1;
    } else {
      current = 1;
    }
    best = Math.max(best, current);
    previousKey = dateKey;
  }

  return best;
}

/** Longest consecutive not-completed run between the day after createdAt and today. */
export function getLongestBreak(habitId: string, logs: HabitLog[], createdAt: Date, today: Date = new Date()): number {
  const byDate = logsByDate(logs, habitId);
  let longest = 0;
  let current = 0;
  let cursor = addDays(parseISO(toDateKey(createdAt)), 1);

  while (toDateKey(cursor) <= toDateKey(today)) {
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
