import { differenceInCalendarDays, differenceInMinutes, format, startOfDay } from "date-fns";
import type { Task } from "@/lib/tasks/types";

export type DeadlineTone = "done" | "overdue" | "urgent" | "soon" | "normal";

export interface DeadlineInfo {
  label: string;
  tone: DeadlineTone;
}

/** Days ahead that still count as "soon" (amber) rather than plain "normal". */
const SOON_WITHIN_DAYS = 3;

/**
 * Human-readable deadline for a task card, relative to `now`, plus a tone so
 * the card can colour the most pressing ones. Overdue is calendar-day based
 * (same rule as `isOverdue`); within the due day it falls back to hours/minutes.
 */
export function getDeadlineInfo(task: Task, now: Date = new Date()): DeadlineInfo {
  const due = task.endDate;

  if (task.status === "completed") {
    return { label: `Hạn ${format(due, "HH:mm dd/MM")}`, tone: "done" };
  }

  const days = differenceInCalendarDays(startOfDay(due), startOfDay(now));

  if (days < 0) {
    return { label: `Trễ ${-days} ngày · hạn ${format(due, "dd/MM")}`, tone: "overdue" };
  }

  if (days === 0) {
    const minutes = differenceInMinutes(due, now);
    if (minutes <= 0) return { label: `Hôm nay ${format(due, "HH:mm")} · đã quá giờ`, tone: "urgent" };
    if (minutes < 60) return { label: `Còn ${minutes} phút · ${format(due, "HH:mm")}`, tone: "urgent" };
    return { label: `Hôm nay ${format(due, "HH:mm")} · còn ${Math.floor(minutes / 60)} giờ`, tone: "urgent" };
  }

  if (days === 1) return { label: `Ngày mai ${format(due, "HH:mm")}`, tone: "soon" };

  return {
    label: `Còn ${days} ngày · ${format(due, "dd/MM")}`,
    tone: days <= SOON_WITHIN_DAYS ? "soon" : "normal",
  };
}

export const DEADLINE_TONE_CLASS: Record<DeadlineTone, string> = {
  done: "text-slate-400",
  overdue: "font-medium text-destructive",
  urgent: "font-medium text-orange-600",
  soon: "text-amber-600",
  normal: "text-slate-500",
};
