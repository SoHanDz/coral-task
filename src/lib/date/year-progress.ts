import {
  getDaysInMonth,
  getYear,
  isAfter,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfYear,
  differenceInCalendarDays,
  isLeapYear,
} from "date-fns";

export type DayState = "past" | "today" | "future";

export interface DayCell {
  day: number;
  state: DayState;
}

export interface MonthData {
  index: number; // 0-11
  label: string; // "JAN"
  days: DayCell[];
}

export interface YearProgress {
  year: number;
  dayOfYear: number;
  totalDaysInYear: number;
  percentComplete: number;
}

const MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export function getYearProgress(referenceDate: Date = new Date()): YearProgress {
  const today = startOfDay(referenceDate);
  const year = getYear(today);
  const dayOfYear = differenceInCalendarDays(today, startOfYear(today)) + 1;
  const totalDaysInYear = isLeapYear(today) ? 366 : 365;
  const percentComplete = Math.round((dayOfYear / totalDaysInYear) * 100);

  return { year, dayOfYear, totalDaysInYear, percentComplete };
}

export function getMonthsData(referenceDate: Date = new Date()): MonthData[] {
  const today = startOfDay(referenceDate);
  const year = getYear(today);

  return MONTH_LABELS.map((label, monthIndex) => {
    const monthStart = new Date(year, monthIndex, 1);
    const daysInMonth = getDaysInMonth(monthStart);

    const days: DayCell[] = Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, monthIndex, i + 1);
      let state: DayState = "future";

      if (isSameDay(date, today)) {
        state = "today";
      } else if (isAfter(today, date)) {
        state = "past";
      } else if (isSameMonth(date, today) && isAfter(date, today)) {
        state = "future";
      }

      return { day: i + 1, state };
    });

    return { index: monthIndex, label, days };
  });
}
