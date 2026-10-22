"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getMonthsData, getYearProgress } from "@/lib/date/year-progress";
import { toDateKey } from "@/lib/date/date-key";
import { getDayState } from "@/lib/habits/stats";
import { HabitDayDot } from "@/components/habits/HabitDayDot";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Habit, HabitLog } from "@/lib/habits/types";

interface HabitYearGridProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  /** Overrides "today" — useful for testing. Defaults to the real current date. */
  referenceDate?: Date;
  className?: string;
}

function HabitYearGridImpl({ habits, habitLogs, referenceDate, className }: HabitYearGridProps) {
  const progress = useMemo(() => getYearProgress(referenceDate), [referenceDate]);
  const months = useMemo(() => getMonthsData(referenceDate), [referenceDate]);
  const todayKey = toDateKey(referenceDate ?? new Date());

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-8 text-slate-800 shadow-sm",
        className
      )}
    >
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest text-slate-500">{progress.year}</p>
          <p className="font-mono text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
            DAY {String(progress.dayOfYear).padStart(3, "0")}
            <span className="text-slate-500"> / {progress.totalDaysInYear}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-semibold text-primary sm:text-3xl">
            {progress.percentComplete}%
          </p>
          <p className="text-xs tracking-wide text-slate-500">of {progress.year} completed</p>
        </div>
      </header>

      <TooltipProvider>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 xl:grid-cols-4">
          {months.map((month) => (
            <section key={month.index}>
              <h3 className="mb-2 font-mono text-xs tracking-widest text-slate-500">{month.label}</h3>
              <div className="grid grid-cols-7 gap-x-[6px] gap-y-[10px]">
                {month.days.map((cell) => {
                  const date = new Date(progress.year, month.index, cell.day);
                  const dateKey = toDateKey(date);
                  const dayState = getDayState(habits, habitLogs, date);
                  const applicableCount = habits.filter((h) => toDateKey(h.createdAt) <= dateKey).length;
                  const completedCount = habitLogs.filter(
                    (log) => log.logDate === dateKey && log.completed
                  ).length;

                  return (
                    <HabitDayDot
                      key={cell.day}
                      dayState={dayState}
                      today={dateKey === todayKey}
                      title={`${month.label} ${cell.day}`}
                      completedCount={dayState === "no-habit" ? undefined : completedCount}
                      totalCount={dayState === "no-habit" ? undefined : applicableCount}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}

export const HabitYearGrid = memo(HabitYearGridImpl);
