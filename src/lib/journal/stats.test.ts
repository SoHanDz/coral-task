import { describe, expect, it } from "vitest";
import { addDays } from "date-fns";
import { toDateKey } from "@/lib/date/date-key";
import type { JournalEntries, JournalField } from "./types";
import { currentStreak, gridLevel, isEntryFilled } from "./stats";

const fields: JournalField[] = [
  { id: "note", label: "Note", type: "longtext" },
  { id: "n", label: "Minutes", type: "number", unit: "phút" },
  { id: "tags", label: "Tags", type: "tags" },
  { id: "mood", label: "Mood", type: "mood" },
];
const today = new Date(2026, 10, 9, 15, 0);
const key = (offset: number) => toDateKey(addDays(today, offset));
const filled = (...offsets: number[]): JournalEntries =>
  Object.fromEntries(offsets.map((o) => [key(o), { note: "x" }]));

describe("isEntryFilled", () => {
  it("is false for undefined, empty, blank, zero and empty list", () => {
    expect(isEntryFilled(undefined, fields)).toBe(false);
    expect(isEntryFilled({}, fields)).toBe(false);
    expect(isEntryFilled({ note: "  " }, fields)).toBe(false);
    expect(isEntryFilled({ n: 0 }, fields)).toBe(false);
    expect(isEntryFilled({ tags: [] }, fields)).toBe(false);
  });
  it("is true for text, positive number, list and mood", () => {
    expect(isEntryFilled({ note: "hi" }, fields)).toBe(true);
    expect(isEntryFilled({ n: 5 }, fields)).toBe(true);
    expect(isEntryFilled({ tags: ["a"] }, fields)).toBe(true);
    expect(isEntryFilled({ mood: 3 }, fields)).toBe(true);
  });
  it("ignores values of fields not in the form", () => {
    expect(isEntryFilled({ gone: "x" }, [])).toBe(false);
    expect(isEntryFilled({ gone: "x" }, [{ id: "gone", label: "G", type: "longtext" }])).toBe(true);
  });
});

describe("currentStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(currentStreak(filled(0, -1, -2), fields, today)).toBe(3);
  });
  it("keeps the streak when today is still empty", () => {
    expect(currentStreak(filled(-1, -2, -3), fields, today)).toBe(3);
  });
  it("stops at a gap", () => {
    expect(currentStreak(filled(0, -2), fields, today)).toBe(1);
  });
  it("is 0 with nothing filled", () => {
    expect(currentStreak({}, fields, today)).toBe(0);
  });
});

describe("gridLevel", () => {
  const numOnly: JournalField[] = [{ id: "n", label: "Min", type: "number" }];
  it("shades by ratio of the primary number field", () => {
    expect(gridLevel({ n: 0 }, numOnly, 60)).toBe(0);
    expect(gridLevel({ n: 10 }, numOnly, 60)).toBe(1);
    expect(gridLevel({ n: 30 }, numOnly, 60)).toBe(2);
    expect(gridLevel({ n: 50 }, numOnly, 60)).toBe(3);
  });
  it("uses one shade without a number field", () => {
    const f: JournalField[] = [{ id: "note", label: "N", type: "longtext" }];
    expect(gridLevel({ note: "x" }, f, 1)).toBe(2);
    expect(gridLevel({}, f, 1)).toBe(0);
  });
});
