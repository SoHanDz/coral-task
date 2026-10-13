import { differenceInCalendarDays, startOfDay } from "date-fns";
import { nextOccurrence } from "@/lib/events/occurrence";
import type { EventItem } from "@/lib/events/types";

/** Positive = days until the event's next occurrence, 0 = today, negative = days since it passed (non-recurring only). */
export function daysRemaining(event: EventItem, referenceDate: Date = new Date()): number {
  return differenceInCalendarDays(startOfDay(nextOccurrence(event, referenceDate)), startOfDay(referenceDate));
}

export function formatCountdown(days: number): string {
  if (days > 0) return `Còn ${days} ngày`;
  if (days === 0) return "Hôm nay";
  return `Đã qua ${Math.abs(days)} ngày`;
}
