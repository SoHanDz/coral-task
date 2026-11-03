import { addDays, getDay, getDaysInMonth, startOfDay } from "date-fns";
import { toDateKey } from "@/lib/date/date-key";
import type { Task, TaskRecurrence } from "@/lib/tasks/types";

/**
 * A weekly/monthly task definition. It never changes status itself: every due
 * day is a derived "occurrence" whose identity is `templateId::yyyy-MM-dd`, and
 * only that key is stored when an occurrence is ticked. Because occurrences are
 * computed from the template (never inserted), opening or completing an overdue
 * one cannot spawn a duplicate.
 */
export interface RecurringTask {
  id: string;
  title: string;
  description: string | null;
  recurrence: TaskRecurrence;
  createdAt: Date;
}

/** occurrence id -> when it was completed. Absent = still pending. */
export type OccurrenceCompletions = Record<string, Date>;

const SEPARATOR = "::";

export function occurrenceId(templateId: string, day: Date): string {
  return `${templateId}${SEPARATOR}${toDateKey(day)}`;
}

export function isOccurrenceId(id: string): boolean {
  return id.includes(SEPARATOR);
}

export function templateIdOf(id: string): string {
  return id.split(SEPARATOR)[0];
}

function withTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const due = new Date(day);
  due.setHours(hours || 0, minutes || 0, 0, 0);
  return due;
}

function occursOn(recurrence: TaskRecurrence, day: Date): boolean {
  if (recurrence.type === "weekly") return recurrence.weekdays.includes(getDay(day));
  // A month shorter than the chosen day (e.g. the 31st) falls on its last day.
  return day.getDate() === Math.min(recurrence.monthDay, getDaysInMonth(day));
}

function buildOccurrence(template: RecurringTask, day: Date, completedAt: Date | null): Task {
  return {
    id: occurrenceId(template.id, day),
    title: template.title,
    description: template.description,
    startDate: startOfDay(day),
    endDate: withTime(day, template.recurrence.time),
    status: completedAt ? "completed" : "pending",
    createdAt: template.createdAt,
    completedAt,
    subtasks: [],
    recurrence: template.recurrence,
  };
}

/**
 * Occurrences to show when `selectedDate` is on screen.
 * - Today: today's occurrence plus every earlier one that is still unfinished.
 * - Any other day: only that day's occurrence (done or not).
 * Nothing before the template's creation day ever appears.
 */
export function getVisibleOccurrences(
  templates: RecurringTask[],
  completions: OccurrenceCompletions,
  selectedDate: Date,
  today: Date = new Date()
): Task[] {
  const selectedDay = startOfDay(selectedDate);
  const todayDay = startOfDay(today);
  const showBacklog = selectedDay.getTime() === todayDay.getTime();
  const result: Task[] = [];

  for (const template of templates) {
    const firstDay = startOfDay(template.createdAt);
    const from = showBacklog ? firstDay : selectedDay;

    for (let day = from; day.getTime() <= selectedDay.getTime(); day = addDays(day, 1)) {
      if (day.getTime() < firstDay.getTime() || !occursOn(template.recurrence, day)) continue;

      const completedAt = completions[occurrenceId(template.id, day)] ?? null;
      const isSelectedDay = day.getTime() === selectedDay.getTime();
      if (isSelectedDay || !completedAt) result.push(buildOccurrence(template, day, completedAt));
    }
  }

  return result;
}

const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Monday-first so "T2, T4, T6" reads naturally; Sunday goes last. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function describeRecurrence(recurrence: TaskRecurrence): string {
  if (recurrence.type === "monthly") return `Hàng tháng · ngày ${recurrence.monthDay}`;
  const days = WEEK_ORDER.filter((day) => recurrence.weekdays.includes(day)).map((day) => WEEKDAY_SHORT[day]);
  return `Hàng tuần · ${days.join(", ")}`;
}
