"use client";

import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Habit, HabitLog } from "@/lib/habits/types";

interface HabitChecklistItemProps {
  habit: Habit;
  log: HabitLog | undefined;
  onToggle: (habitId: string, completed: boolean) => void;
  /** True while a toggle mutation for this habit is in flight. */
  pending?: boolean;
}

/**
 * One daily-habit row on the Todo page: a checkbox for the currently
 * selected day plus its due time. No click-to-edit/delete here — that
 * belongs to the dedicated habit-tracking page (separate plan).
 */
export function HabitChecklistItem({ habit, log, onToggle, pending = false }: HabitChecklistItemProps) {
  const completed = log?.completed ?? false;

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors duration-200",
        completed ? "border-slate-200/60 bg-slate-50" : "border-slate-200/80 bg-white hover:bg-slate-50"
      )}
    >
      {pending ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-slate-400" />
      ) : (
        <Checkbox
          checked={completed}
          onCheckedChange={(checked) => onToggle(habit.id, checked === true)}
          aria-label={completed ? "Đánh dấu chưa làm" : "Đánh dấu đã xong"}
        />
      )}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm font-medium",
          completed ? "text-slate-500 line-through" : "text-slate-800"
        )}
      >
        {habit.title}
      </span>
      <span className="shrink-0 text-xs text-slate-400">{habit.dueTime}</span>
    </li>
  );
}
