import { describe, expect, it } from "vitest";
import { toDateKey } from "@/lib/date/date-key";
import type { JournalField } from "./types";
import { buildChartPoints, periodDays, shiftAnchor, summarize } from "./chart";

const keys = (days: Date[]) => days.map(toDateKey);

describe("periodDays", () => {
  it("week starts on Monday and has 7 days", () => {
    const days = periodDays("week", new Date(2026, 10, 11)); // Wed
    expect(days).toHaveLength(7);
    expect(toDateKey(days[0])).toBe("2026-11-09");
    expect(toDateKey(days[6])).toBe("2026-11-15");
  });
  it("week crossing a year boundary spans 2026-12-28 to 2027-01-03", () => {
    const days = periodDays("week", new Date(2026, 11, 30));
    expect(toDateKey(days[0])).toBe("2026-12-28");
    expect(toDateKey(days[6])).toBe("2027-01-03");
  });
  it("month lengths, including leap February", () => {
    expect(periodDays("month", new Date(2028, 1, 10))).toHaveLength(29);
    expect(periodDays("month", new Date(2027, 1, 10))).toHaveLength(28);
    expect(periodDays("month", new Date(2026, 11, 10))).toHaveLength(31);
  });
});

describe("shiftAnchor", () => {
  it("moves a week by 7 days and a month by one month", () => {
    expect(toDateKey(shiftAnchor("week", new Date(2026, 10, 9), -1))).toBe("2026-11-02");
    expect(toDateKey(shiftAnchor("month", new Date(2026, 10, 9), 1))).toBe("2026-12-09");
  });
});

describe("buildChartPoints", () => {
  const today = new Date(2026, 10, 11);
  const days = periodDays("week", today);
  const num: JournalField[] = [{ id: "n", label: "Min", type: "number" }];

  it("uses the number field and marks days after today as future", () => {
    const pts = buildChartPoints({ "2026-11-09": { n: 30 }, "2026-11-11": { n: 60 } }, num, days, today);
    expect(pts.map((p) => p.value)).toEqual([30, 0, 60, 0, 0, 0, 0]);
    expect(pts.map((p) => p.future)).toEqual([false, false, false, true, true, true, true]);
    expect(pts[0].label).toBe("9");
    expect(pts[0].key).toBe("2026-11-09");
  });
  it("returns 1/0 by written state with no number field", () => {
    const f: JournalField[] = [{ id: "note", label: "N", type: "longtext" }];
    const pts = buildChartPoints({ "2026-11-10": { note: "x" } }, f, days, today);
    expect(pts.slice(0, 3).map((p) => p.value)).toEqual([0, 1, 0]);
  });
  it("keys match the day list", () => {
    expect(buildChartPoints({}, num, days, today).map((p) => p.key)).toEqual(keys(days));
  });
});

describe("summarize", () => {
  it("totals and averages over non-future points", () => {
    const p = (value: number, future = false) => ({ key: "k", label: "l", value, future });
    expect(summarize([p(30), p(0), p(60), p(0, true)])).toEqual({ total: 90, average: 30 });
  });
  it("is 0 average when all future", () => {
    expect(summarize([{ key: "k", label: "l", value: 0, future: true }])).toEqual({ total: 0, average: 0 });
  });
});
