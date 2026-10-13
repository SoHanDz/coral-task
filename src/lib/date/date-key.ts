import { format } from "date-fns";

/** Calendar-day identity key, independent of time-of-day. */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
