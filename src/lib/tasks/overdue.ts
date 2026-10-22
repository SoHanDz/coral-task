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
