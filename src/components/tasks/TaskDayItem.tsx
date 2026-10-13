"use client";

import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TaskFormDialog, type TaskFormInput } from "@/components/tasks/TaskFormDialog";
import { isOverdue } from "@/lib/tasks/overdue";
import type { Task } from "@/lib/tasks/types";

interface TaskDayItemProps {
  task: Task;
  onToggleStatus: (id: string) => void;
  onEdit: (id: string, input: TaskFormInput) => void;
  onDelete: (id: string) => void;
}

export function TaskDayItem({ task, onToggleStatus, onEdit, onDelete }: TaskDayItemProps) {
  const completed = task.status === "completed";
  const overdue = isOverdue(task);
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
            {task.subtasks.length > 0 && (
              <span className="text-xs text-slate-400">
                {doneSubtasks}/{task.subtasks.length} sub-task
              </span>
            )}
          </button>
        }
      />

      <div className="flex shrink-0 items-center gap-2">
        {task.dueDate && <span className="text-xs text-slate-400">{format(task.dueDate, "HH:mm")}</span>}
        {overdue && <Badge className="border-none bg-destructive text-white">Trễ hạn</Badge>}
      </div>
    </li>
  );
}
