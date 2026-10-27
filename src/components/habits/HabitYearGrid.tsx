"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getMonthsData, getYearProgress, type MonthData } from "@/lib/date/year-progress";
import { toDateKey } from "@/lib/date/date-key";
import { getDayCompletion } from "@/lib/habits/stats";
import { HABIT_LEVEL_STYLES, HabitDayDot } from "@/components/habits/HabitDayDot";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Habit, HabitLog } from "@/lib/habits/types";

interface HabitYearGridProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  /** Overrides "today" — useful for testing. Defaults to the real current date. */
  referenceDate?: Date;
  className?: string;
}

interface MonthSectionProps extends Pick<HabitYearGridProps, "habits" | "habitLogs"> {
  month: MonthData;
  year: number;
  todayKey: string;
  large?: boolean;
}

function MonthSection({ month, year, todayKey, habits, habitLogs, large = false }: MonthSectionProps) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 transition-all hover:bg-white">
      <h3 className="mb-1.5 font-mono text-[10px] tracking-widest text-slate-500">{month.label}</h3>
      <div className={cn("grid grid-cols-7", large ? "gap-2" : "gap-x-[4px] gap-y-[7px]")}>
        {month.days.map((cell) => {
          const date = new Date(year, month.index, cell.day);
          const dateKey = toDateKey(date);
          const title = `${month.label} ${cell.day}`;
          const isToday = dateKey === todayKey;

          if (cell.state === "future") {
            return <HabitDayDot key={cell.day} kind="future" large={large} title={title} />;
          }

          const { total, completed, level } = getDayCompletion(habits, habitLogs, date);
          if (total === 0) {
            return <HabitDayDot key={cell.day} kind="no-habit" large={large} today={isToday} title={title} />;
          }

          return (
            <HabitDayDot
              key={cell.day}
              kind="level"
              level={level}
              large={large}
              today={isToday}
              title={title}
              completedCount={completed}
              totalCount={total}
            />
          );
        })}
      </div>
    </section>
  );
}

function Legend() {
  return (
    <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-500">
      <span>Ít</span>
      {([0, 1, 2, 3, 4] as const).map((level) => (
        <span key={level} className={cn("size-3 rounded-full", HABIT_LEVEL_STYLES[level])} aria-hidden />
      ))}
      <span>Nhiều</span>
    </div>
  );
}

function HabitYearGridImpl({ habits, habitLogs, referenceDate, className }: HabitYearGridProps) {
  const progress = useMemo(() => getYearProgress(referenceDate), [referenceDate]);
  const months = useMemo(() => getMonthsData(referenceDate), [referenceDate]);
  const todayKey = toDateKey(referenceDate ?? new Date());
  const currentMonth = months.find((m) => m.days.some((d) => d.state === "today")) ?? months[0];

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-5 text-slate-800 shadow-sm",
        className
      )}
    >
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-widest text-slate-500">{progress.year}</p>
          <p className="font-mono text-xl font-semibold tracking-tight text-slate-800">
            DAY {String(progress.dayOfYear).padStart(3, "0")}
            <span className="text-slate-500"> / {progress.totalDaysInYear}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xl font-semibold text-primary">{progress.percentComplete}%</p>
          <p className="text-xs tracking-wide text-slate-500">of {progress.year}</p>
        </div>
      </header>

      <TooltipProvider>
        <MonthSection
          month={currentMonth}
          year={progress.year}
          todayKey={todayKey}
          habits={habits}
          habitLogs={habitLogs}
          large
        />
      </TooltipProvider>

      <div className="mt-4 flex flex-col gap-3">
        <Legend />

        <Dialog>
          <DialogTrigger
            render={
              <Button type="button" variant="outline" className="w-full">
                Xem lịch đầy đủ
              </Button>
            }
          />
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogTitle>Lịch thói quen {progress.year}</DialogTitle>
            <TooltipProvider>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {months.map((month) => (
                  <MonthSection
                    key={month.index}
                    month={month}
                    year={progress.year}
                    todayKey={todayKey}
                    habits={habits}
                    habitLogs={habitLogs}
                  />
                ))}
              </div>
            </TooltipProvider>
            <Legend />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export const HabitYearGrid = memo(HabitYearGridImpl);
