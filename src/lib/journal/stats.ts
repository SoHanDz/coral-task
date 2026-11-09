import { addDays } from "date-fns";
import { toDateKey } from "@/lib/date/date-key";
import type {
  EntryValue,
  EntryValues,
  JournalEntries,
  JournalField,
} from "./types";

function hasValue(value: EntryValue | undefined): boolean {
  if (value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return value > 0;
  return value.length > 0;
}

/** An entry counts as written only through fields currently on the form. */
export function isEntryFilled(
  values: EntryValues | undefined,
  fields: JournalField[],
): boolean {
  if (!values) return false;
  return fields.some((f) => hasValue(values[f.id]));
}

/** Consecutive written days ending today; an empty today doesn't break it. */
export function currentStreak(
  entries: JournalEntries,
  fields: JournalField[],
  today: Date,
): number {
  const filled = (d: Date) => isEntryFilled(entries[toDateKey(d)], fields);
  let day = filled(today) ? today : addDays(today, -1);
  let streak = 0;
  while (filled(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export function primaryNumberField(
  fields: JournalField[],
): JournalField | undefined {
  return fields.find((f) => f.type === "number");
}

export function maxPrimaryValue(
  entries: JournalEntries,
  field: JournalField | undefined,
): number {
  if (!field) return 1;
  let max = 1;
  for (const values of Object.values(entries)) {
    const v = values[field.id];
    if (typeof v === "number" && v > max) max = v;
  }
  return max;
}

export function gridLevel(
  values: EntryValues | undefined,
  fields: JournalField[],
  max: number,
): 0 | 1 | 2 | 3 {
  if (!isEntryFilled(values, fields)) return 0;
  const primary = primaryNumberField(fields);
  if (!primary) return 2;
  const v = values?.[primary.id];
  if (typeof v !== "number" || v <= 0) return 1;
  const ratio = v / Math.max(max, 1);
  if (ratio >= 0.66) return 3;
  if (ratio >= 0.33) return 2;
  return 1;
}
