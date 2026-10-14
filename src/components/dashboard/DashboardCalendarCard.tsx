"use client";

import { useMemo } from "react";
import { vi } from "date-fns/locale";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { toDateKey } from "@/lib/date/date-key";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/tasks/types";

interface DashboardCalendarCardProps {
  tasks: Task[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

/** Controlled mini calendar: pick a day to filter the task list elsewhere on the dashboard. */
export function DashboardCalendarCard({ tasks, selectedDate, onSelectDate }: DashboardCalendarCardProps) {
  const todayKey = toDateKey(new Date());

  const datesWithTasks = useMemo(
    () => new Set(tasks.filter((t) => t.dueDate).map((t) => toDateKey(t.dueDate!))),
    [tasks]
  );

  // Past dates still carrying unfinished tasks get a red flag instead of the
  // normal dot, since those tasks have already rolled over into "Hôm nay".
  const datesOverdue = useMemo(
    () =>
      new Set(
        tasks
          .filter((t) => t.status === "pending" && t.dueDate && toDateKey(t.dueDate) < todayKey)
          .map((t) => toDateKey(t.dueDate!))
      ),
    [tasks, todayKey]
  );

  return (
    <Calendar
      mode="single"
      locale={vi}
      selected={selectedDate}
      onSelect={(date) => date && onSelectDate(date)}
      modifiers={{
        hasTask: (date) => datesWithTasks.has(toDateKey(date)),
        isOverdueDay: (date) => datesOverdue.has(toDateKey(date)),
      }}
      className="mx-auto"
      components={{
        DayButton: ({ modifiers, ...props }) => (
          <div className="relative h-full w-full">
            <CalendarDayButton
              modifiers={modifiers}
              {...props}
              className={cn(props.className, modifiers.isOverdueDay && "text-destructive")}
            />
            {modifiers.isOverdueDay ? (
              <span className="pointer-events-none absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-destructive" />
            ) : (
              modifiers.hasTask && (
                <span className="pointer-events-none absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
              )
            )}
          </div>
        ),
      }}
    />
  );
}
