import { differenceInCalendarDays, endOfDay, formatDistanceStrict, isBefore, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import type { Task } from "@/lib/tasks/types";

/**
 * Overdue = still pending AND due_date is strictly before today (date-only,
 * time-of-day ignored on both sides so a due date of "today" is never overdue).
 */
export function isOverdue(task: Task, referenceDate: Date = new Date()): boolean {
  if (task.status !== "pending" || !task.dueDate) return false;
  return isBefore(startOfDay(task.dueDate), startOfDay(referenceDate));
}

/** Days between a task's due date and today, for the "Trễ N ngày" footnote. */
export function getOverdueDays(task: Task, referenceDate: Date = new Date()): number | null {
  if (!isOverdue(task, referenceDate) || !task.dueDate) return null;
  return differenceInCalendarDays(startOfDay(referenceDate), startOfDay(task.dueDate));
}

export interface CompletionDelay {
  completedAt: Date;
  onTime: boolean;
  label: string;
}

/**
 * How late a completed task was, measured against the end of its due day
 * (so completing any time on the due date itself counts as on-time).
 */
export function getCompletionDelay(task: Task): CompletionDelay | null {
  if (task.status !== "completed" || !task.completedAt || !task.dueDate) return null;

  const deadline = endOfDay(task.dueDate);
  const onTime = task.completedAt.getTime() <= deadline.getTime();
  const label = onTime
    ? "Đúng hạn"
    : `Trễ ${formatDistanceStrict(task.completedAt, deadline, { locale: vi })}`;

  return { completedAt: task.completedAt, onTime, label };
}
