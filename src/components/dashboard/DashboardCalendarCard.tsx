"use client";

import { useMemo } from "react";
import { vi } from "date-fns/locale";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { toDateKey } from "@/lib/date/date-key";
import type { Task } from "@/lib/tasks/types";

interface DashboardCalendarCardProps {
  tasks: Task[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

/** Controlled mini calendar: pick a day to filter the task list elsewhere on the dashboard. */
export function DashboardCalendarCard({ tasks, selectedDate, onSelectDate }: DashboardCalendarCardProps) {
  const datesWithTasks = useMemo(
    () => new Set(tasks.filter((t) => t.dueDate).map((t) => toDateKey(t.dueDate!))),
    [tasks]
  );

  return (
    <Calendar
      mode="single"
      locale={vi}
      selected={selectedDate}
      onSelect={(date) => date && onSelectDate(date)}
      modifiers={{ hasTask: (date) => datesWithTasks.has(toDateKey(date)) }}
      className="mx-auto"
      components={{
        DayButton: ({ modifiers, ...props }) => (
          <div className="relative h-full w-full">
            <CalendarDayButton modifiers={modifiers} {...props} />
            {modifiers.hasTask && (
              <span className="pointer-events-none absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
            )}
          </div>
        ),
      }}
    />
  );
}
