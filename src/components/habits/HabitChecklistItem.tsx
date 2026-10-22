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
  /** Clicking the row (not the checkbox) opens the habit's detail view. Omit to keep the row non-clickable, as on the Todo page. */
  onRowClick?: (habit: Habit) => void;
}

/**
 * One daily-habit row: a checkbox for the currently selected day plus its
 * due time. On the Todo page this is checkbox-only (no `onRowClick`); on
 * the habit-tracking page the row itself opens the detail/edit dialog.
 */
export function HabitChecklistItem({ habit, log, onToggle, pending = false, onRowClick }: HabitChecklistItemProps) {
  const completed = log?.completed ?? false;

  return (
    <li
      onClick={onRowClick ? () => onRowClick(habit) : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors duration-200",
        completed ? "border-slate-200/60 bg-slate-50" : "border-slate-200/80 bg-white hover:bg-slate-50",
        onRowClick && "cursor-pointer"
      )}
    >
      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
        {pending ? (
          <Loader2 className="size-4 animate-spin text-slate-400" />
        ) : (
          <Checkbox
            checked={completed}
            onCheckedChange={(checked) => onToggle(habit.id, checked === true)}
            aria-label={completed ? "Đánh dấu chưa làm" : "Đánh dấu đã xong"}
          />
        )}
      </div>
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
