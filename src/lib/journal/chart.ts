import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { toDateKey } from "@/lib/date/date-key";
import { isEntryFilled, primaryNumberField } from "./stats";
import type { JournalEntries, JournalField } from "./types";

export type ChartPeriod = "week" | "month";

export interface ChartPoint {
  key: string;
  label: string;
  value: number;
  future: boolean;
}

export function periodDays(period: ChartPeriod, anchor: Date): Date[] {
  if (period === "week") {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }
  return eachDayOfInterval({
    start: startOfMonth(anchor),
    end: endOfMonth(anchor),
  });
}

export function shiftAnchor(
  period: ChartPeriod,
  anchor: Date,
  direction: -1 | 1,
): Date {
  return period === "week"
    ? addDays(anchor, 7 * direction)
    : addMonths(anchor, direction);
}

export function buildChartPoints(
  entries: JournalEntries,
  fields: JournalField[],
  days: Date[],
  today: Date,
): ChartPoint[] {
  const primary = primaryNumberField(fields);
  const todayKey = toDateKey(today);
  return days.map((day) => {
    const key = toDateKey(day);
    const values = entries[key];
    let value = 0;
    if (primary) {
      const v = values?.[primary.id];
      value = typeof v === "number" ? v : 0;
    } else {
      value = isEntryFilled(values, fields) ? 1 : 0;
    }
    return { key, label: String(day.getDate()), value, future: key > todayKey };
  });
}

export function summarize(points: ChartPoint[]): {
  total: number;
  average: number;
} {
  const past = points.filter((p) => !p.future);
  const total = past.reduce((sum, p) => sum + p.value, 0);
  return { total, average: past.length ? total / past.length : 0 };
}
