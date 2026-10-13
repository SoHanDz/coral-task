"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getMonthsData, getYearProgress } from "@/lib/date/year-progress";
import { toDateKey } from "@/lib/date/date-key";
import { occurrenceInYear } from "@/lib/events/occurrence";
import { DayDot } from "@/components/year-grid/DayDot";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getDailyTaskStats } from "@/lib/tasks/stats";
import type { EventItem } from "@/lib/events/types";
import type { Task } from "@/lib/tasks/types";

interface YearGridProps {
  /** Overrides "today" — useful for testing/storybook. Defaults to the real current date. */
  referenceDate?: Date;
  /** Special events to highlight on their exact day. */
  events?: EventItem[];
  /** Tasks, used only to show a per-day completion rate in the tooltip. */
  tasks?: Task[];
  className?: string;
}

function YearGridImpl({ referenceDate, events = [], tasks = [], className }: YearGridProps) {
  const progress = useMemo(() => getYearProgress(referenceDate), [referenceDate]);
  const months = useMemo(() => getMonthsData(referenceDate), [referenceDate]);
  const eventsByDate = useMemo(
    () =>
      new Map(
        events.map((event) => [toDateKey(occurrenceInYear(event, progress.year)), event])
      ),
    [events, progress.year]
  );
  const taskStatsByDate = useMemo(() => getDailyTaskStats(tasks), [tasks]);

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-8 text-slate-800 shadow-sm",
        className
      )}
    >
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest text-slate-500">
            {progress.year}
          </p>
          <p className="font-mono text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
            DAY {String(progress.dayOfYear).padStart(3, "0")}
            <span className="text-slate-500"> / {progress.totalDaysInYear}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-semibold text-primary sm:text-3xl">
            {progress.percentComplete}%
          </p>
          <p className="text-xs tracking-wide text-slate-500">
            of {progress.year} completed
          </p>
        </div>
      </header>

      <TooltipProvider>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 xl:grid-cols-4">
          {months.map((month) => (
            <section key={month.index}>
              <h3 className="mb-2 font-mono text-xs tracking-widest text-slate-500">
                {month.label}
              </h3>
              <div className="grid grid-cols-7 gap-x-[6px] gap-y-[10px]">
                {month.days.map((cell) => {
                  const date = new Date(progress.year, month.index, cell.day);
                  const dateKey = toDateKey(date);
                  const event = eventsByDate.get(dateKey);
                  const taskStats = taskStatsByDate.get(dateKey);

                  return (
                    <DayDot
                      key={cell.day}
                      state={cell.state}
                      title={`${month.label} ${cell.day}`}
                      eventTitle={event?.title}
                      taskStats={taskStats}
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

export const YearGrid = memo(YearGridImpl);
