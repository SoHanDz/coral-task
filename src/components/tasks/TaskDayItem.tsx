"use client";

import { CheckCircle2, CalendarArrowUp, Loader2, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskFormDialog, type TaskFormInput } from "@/components/tasks/TaskFormDialog";
import { DEADLINE_TONE_CLASS, getDeadlineInfo } from "@/lib/tasks/deadline";
import { isOverdue } from "@/lib/tasks/overdue";
import { describeRecurrence } from "@/lib/tasks/recurrence";
import type { Task, TaskStatus } from "@/lib/tasks/types";

interface TaskDayItemProps {
  task: Task;
  onToggleStatus: (id: string) => void;
  onEdit: (id: string, input: TaskFormInput) => void;
  onDelete: (id: string) => void;
  onRescheduleToToday?: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
  /** True while a status/reschedule mutation for this task is in flight. */
  pending?: boolean;
}

export function TaskDayItem({
  task,
  onToggleStatus,
  onEdit,
  onDelete,
  onRescheduleToToday,
  onStatusChange,
  pending = false,
}: TaskDayItemProps) {
  const completed = task.status === "completed";
  const overdue = isOverdue(task);
  const deadline = getDeadlineInfo(task);
  const isRecurring = Boolean(task.recurrence);
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
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="size-6 animate-spin text-slate-400" />
        ) : (
          <CheckCircle2
            className={cn(
              "size-6 transition-colors duration-200",
              completed ? "fill-primary text-white" : "text-slate-300 hover:text-primary"
            )}
          />
        )}
      </button>

      <TaskFormDialog
        task={task}
        onSubmitTask={(input) => onEdit(task.id, input)}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        trigger={
          <button type="button" className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
            <span
              className={cn(
                "max-w-full break-words text-sm font-medium line-clamp-2",
                completed ? "text-slate-500 line-through" : overdue ? "font-bold text-destructive" : "text-slate-800"
              )}
            >
              {task.title}
            </span>
            <span className={cn("flex max-w-full items-center gap-1.5 text-xs", DEADLINE_TONE_CLASS[deadline.tone])}>
              {task.recurrence && (
                <span className="flex shrink-0 items-center gap-1 text-slate-400">
                  <Repeat className="size-3" />
                  {describeRecurrence(task.recurrence)} ·
                </span>
              )}
              <span className="truncate">{deadline.label}</span>
              {task.subtasks.length > 0 && (
                <span className="shrink-0 text-slate-400">
                  · {doneSubtasks}/{task.subtasks.length} sub-task
                </span>
              )}
            </span>
          </button>
        }
      />

      <div className="flex shrink-0 items-center gap-2">
        {/* A recurring occurrence is pinned to its own day, so "move to today" doesn't apply. */}
        {overdue && !isRecurring && onRescheduleToToday && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Dời sang hôm nay"
            title="Dời sang hôm nay"
            className="size-8 border-destructive/30 p-0 text-xs text-destructive transition-colors duration-200 hover:bg-destructive/10 sm:h-7 sm:w-auto sm:gap-1 sm:px-2"
            onClick={() => onRescheduleToToday(task.id)}
            disabled={pending}
          >
            <CalendarArrowUp className="size-4 sm:size-3.5" />
            <span className="hidden sm:inline">Dời sang hôm nay</span>
          </Button>
        )}
        {/* On mobile the red "Trễ N ngày" subtitle already says this. */}
        {overdue && <Badge className="hidden border-none bg-destructive text-white sm:inline-flex">Trễ hạn</Badge>}
      </div>
    </li>
  );
}
