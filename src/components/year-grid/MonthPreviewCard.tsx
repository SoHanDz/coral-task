"use client";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getMonthsData, getYearProgress } from "@/lib/date/year-progress";
import { toDateKey } from "@/lib/date/date-key";
import { occurrenceInYear } from "@/lib/events/occurrence";
import { YearGrid } from "@/components/year-grid/YearGrid";
import { DayDot } from "@/components/year-grid/DayDot";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { EventItem } from "@/lib/events/types";

interface MonthPreviewCardProps {
  referenceDate?: Date;
  events?: EventItem[];
  className?: string;
}

export function MonthPreviewCard({ referenceDate, events = [], className }: MonthPreviewCardProps) {
  const progress = getYearProgress(referenceDate);
  const months = getMonthsData(referenceDate);
  const currentMonth =
    months.find((month) => month.days.some((day) => day.state === "today")) ?? months[0];
  const eventsByDate = new Map(
    events.map((event) => [toDateKey(occurrenceInYear(event, progress.year)), event])
  );

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "w-full max-w-xs cursor-pointer rounded-2xl bg-slate-900 p-6 text-left text-slate-100 shadow-sm transition-colors duration-200 hover:bg-slate-800",
              className
            )}
          />
        }
      >
        <header className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs tracking-widest text-slate-400">
              {currentMonth.label} · {progress.year}
            </p>
            <p className="font-mono text-lg font-semibold tracking-tight text-white">
              DAY {String(progress.dayOfYear).padStart(3, "0")}
              <span className="text-slate-400">/{progress.totalDaysInYear}</span>
            </p>
          </div>
          <p className="font-mono text-lg font-semibold text-cyan-400">
            {progress.percentComplete}%
          </p>
        </header>

        <TooltipProvider>
          <div className="grid grid-cols-7 gap-x-[6px] gap-y-[10px]">
            {currentMonth.days.map((cell) => {
              const date = new Date(progress.year, currentMonth.index, cell.day);
              const event = eventsByDate.get(toDateKey(date));
              return <DayDot key={cell.day} state={cell.state} eventTitle={event?.title} />;
            })}
          </div>
        </TooltipProvider>
      </DialogTrigger>

      <DialogContent className="max-w-3xl border-none bg-transparent p-0 ring-0 sm:max-w-3xl">
        <DialogTitle className="sr-only">Year progress</DialogTitle>
        <YearGrid referenceDate={referenceDate} events={events} />
      </DialogContent>
    </Dialog>
  );
}
