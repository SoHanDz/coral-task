"use client";

import { format } from "date-fns";
import { CheckCircle2, CalendarArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskFormDialog, type TaskFormInput } from "@/components/tasks/TaskFormDialog";
import { getOverdueDays, isOverdue } from "@/lib/tasks/overdue";
import type { Task, TaskStatus } from "@/lib/tasks/types";

interface TaskDayItemProps {
  task: Task;
  onToggleStatus: (id: string) => void;
  onEdit: (id: string, input: TaskFormInput) => void;
  onDelete: (id: string) => void;
  onRescheduleToToday?: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
}

export function TaskDayItem({
  task,
  onToggleStatus,
  onEdit,
  onDelete,
  onRescheduleToToday,
  onStatusChange,
}: TaskDayItemProps) {
  const completed = task.status === "completed";
  const overdue = isOverdue(task);
  const overdueDays = getOverdueDays(task);
  const doneSubtasks = task.subtasks.filter((s) => s.completed).length;

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors duration-200",
        completed
          ? "border-slate-200/60 bg-slate-50"
          : overdue
            ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
            : "border-slate-200/80 bg-white hover:bg-slate-50"
      )}
    >
      <button
        type="button"
        onClick={() => onToggleStatus(task.id)}
        aria-label={completed ? "Đánh dấu chưa làm" : "Đánh dấu đã xong"}
        className="shrink-0"
      >
        <CheckCircle2
          className={cn(
            "size-6 transition-colors duration-200",
            completed ? "fill-emerald-500 text-white" : "text-slate-300 hover:text-emerald-500"
          )}
        />
      </button>

      <TaskFormDialog
        task={task}
        onSubmit={(input) => onEdit(task.id, input)}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        trigger={
          <button type="button" className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
            <span
              className={cn(
                "truncate text-sm font-medium",
                completed ? "text-slate-500 line-through" : overdue ? "font-bold text-destructive" : "text-slate-800"
              )}
            >
              {task.title}
            </span>
            {overdue && task.dueDate ? (
              <span className="text-xs font-medium text-destructive">
                Đến hạn: {format(task.dueDate, "dd/MM")} (Trễ {overdueDays} ngày)
              </span>
            ) : (
              task.subtasks.length > 0 && (
                <span className="text-xs text-slate-400">
                  {doneSubtasks}/{task.subtasks.length} sub-task
                </span>
              )
            )}
          </button>
        }
      />

      <div className="flex shrink-0 items-center gap-2">
        {task.dueDate && !overdue && <span className="text-xs text-slate-400">{format(task.dueDate, "HH:mm")}</span>}
        {overdue && onRescheduleToToday && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-destructive/30 px-2 text-xs text-destructive transition-colors duration-200 hover:bg-destructive/10"
            onClick={() => onRescheduleToToday(task.id)}
          >
            <CalendarArrowUp className="size-3.5" />
            Dời sang hôm nay
          </Button>
        )}
        {overdue && <Badge className="border-none bg-destructive text-white">Trễ hạn</Badge>}
      </div>
    </li>
  );
}
