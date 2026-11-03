"use client";

import { Flame, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Habit, HabitLog } from "@/lib/habits/types";

interface HabitChecklistItemProps {
  habit: Habit;
  log: HabitLog | undefined;
  onToggle: (habitId: string, completed: boolean) => void;
  /** True while a toggle mutation for this habit is in flight. */
  pending?: boolean;
  /** Clicking the row (not the checkbox) opens the habit's detail view. Omit to keep the row non-clickable. */
  onRowClick?: (habit: Habit) => void;
  /** Current streak in days. Renders a 🔥 badge when >= 1; omit to hide it. */
  streak?: number;
}

/**
 * One daily-habit row: a checkbox for the currently selected day plus its
 * due time. When `onRowClick` is passed, the row itself opens the
 * detail/edit dialog — used on both the Todo page and the habit-tracking page.
 */
export function HabitChecklistItem({
  habit,
  log,
  onToggle,
  pending = false,
  onRowClick,
  streak,
}: HabitChecklistItemProps) {
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
      {!!streak && streak >= 1 && (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-500">
          <Flame className="size-3.5 fill-orange-400 text-orange-500" />
          {streak} ngày
        </span>
      )}
      <span className="shrink-0 text-xs text-slate-400">{habit.dueTime}</span>
    </li>
  );
}
