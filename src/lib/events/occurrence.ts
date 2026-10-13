import { getYear, setYear, startOfDay } from "date-fns";
import type { EventItem } from "@/lib/events/types";

/** Where this event falls within a given year. Recurring events keep their month/day. */
export function occurrenceInYear(event: EventItem, year: number): Date {
  if (!event.isRecurring) return event.eventDate;
  return setYear(event.eventDate, year);
}

/** The next upcoming occurrence on/after referenceDate (recurring events roll into next year). */
export function nextOccurrence(event: EventItem, referenceDate: Date = new Date()): Date {
  if (!event.isRecurring) return event.eventDate;

  const today = startOfDay(referenceDate);
  const thisYear = occurrenceInYear(event, getYear(today));
  if (thisYear >= today) return thisYear;

  return occurrenceInYear(event, getYear(today) + 1);
}
