import { addDays, parseISO, subDays } from "date-fns";
import { toDateKey } from "@/lib/date/date-key";
import type { Habit, HabitLog } from "@/lib/habits/types";

export type HabitDayState = "all-done" | "missed" | "no-habit" | "future";

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
  const applicable = habits.filter((habit) => toDateKey(habit.createdAt) <= toDateKey(date));
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

/** Longest consecutive not-completed run between createdAt and today. */
export function getLongestBreak(habitId: string, logs: HabitLog[], createdAt: Date, today: Date = new Date()): number {
  const byDate = logsByDate(logs, habitId);
  let longest = 0;
  let current = 0;
  let cursor = parseISO(toDateKey(createdAt));

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
