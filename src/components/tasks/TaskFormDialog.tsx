"use client";

import { endOfDay, format, startOfToday } from "date-fns";
import { useState, type FormEvent, type ReactElement } from "react";
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCompletionDelay } from "@/lib/tasks/overdue";
import type { Subtask, Task, TaskStatus } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

export interface TaskFormInput {
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  subtasks: Subtask[];
}

export interface HabitFormInput {
  title: string;
  description: string | null;
  dueTime: string;
}

interface TaskFormDialogProps {
  trigger: ReactElement;
  /** Pass an existing task to edit it (and allow deleting it); omit to create a new one. */
  task?: Task;
  onSubmitTask: (input: TaskFormInput) => void;
  /** Called instead of onSubmitTask when creating a new item with "Hàng ngày" selected. Never needed when `task` is set, since the "Loại" selector only appears on create. */
  onSubmitHabit?: (input: HabitFormInput) => void;
  onDelete?: (id: string) => void;
  /** Called the instant checking/unchecking a subtask flips the parent task's completion. */
  onStatusChange?: (id: string, status: TaskStatus) => void;
}

function defaultStartDate(): Date {
  return new Date();
}

function defaultEndDate(): Date {
  return endOfDay(startOfToday());
}

export function TaskFormDialog({
  trigger,
  task,
  onSubmitTask,
  onSubmitHabit,
  onDelete,
  onStatusChange,
}: TaskFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"once" | "daily">("once");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>(defaultStartDate());
  const [endDate, setEndDate] = useState<Date>(defaultEndDate());
  const [dueTime, setDueTime] = useState("23:59");
  const [dateError, setDateError] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "pending");

  // Editing an existing task always uses the task-shaped fields; creating
  // a new item switches shape based on the "Loại" selector.
  const isTaskShape = Boolean(task) || kind === "once";

  function resetForm() {
    setKind("once");
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setStartDate(task?.startDate ?? defaultStartDate());
    setEndDate(task?.endDate ?? defaultEndDate());
    setDueTime("23:59");
    setDateError(null);
    setSubtasks(task?.subtasks ?? []);
    setSubtaskInput("");
    setStatus(task?.status ?? "pending");
  }

  function handleAddSubtask() {
    if (!subtaskInput.trim()) return;
    setSubtasks((prev) => [...prev, { id: crypto.randomUUID(), title: subtaskInput.trim(), completed: false }]);
    setSubtaskInput("");
  }

  // Finishing the last subtask auto-completes the task; unchecking one on an
  // auto-completed task reopens it, so the checklist and the task status
  // never fall out of sync.
  function handleToggleSubtask(id: string) {
    setSubtasks((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s));
      const allDone = next.length > 0 && next.every((s) => s.completed);
      const nextStatus: TaskStatus = allDone ? "completed" : "pending";

      if (task && nextStatus !== status) {
        setStatus(nextStatus);
        onStatusChange?.(task.id, nextStatus);
      }

      return next;
    });
  }

  function handleRemoveSubtask(id: string) {
    setSubtasks((prev) => prev.filter((subtask) => subtask.id !== id));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    if (!isTaskShape) {
      onSubmitHabit?.({
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        dueTime,
      });
      setOpen(false);
      return;
    }

    if (endDate.getTime() < startDate.getTime()) {
      setDateError("Ngày kết thúc phải sau ngày bắt đầu.");
      return;
    }
    setDateError(null);

    // A subtask typed but never confirmed with "+" shouldn't be silently
    // dropped when the whole task is saved.
    const pendingSubtask = subtaskInput.trim();
    const finalSubtasks = pendingSubtask
      ? [...subtasks, { id: crypto.randomUUID(), title: pendingSubtask, completed: false }]
      : subtasks;

    onSubmitTask({
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      startDate,
      endDate,
      subtasks: finalSubtasks,
    });

    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) resetForm();
        setOpen(next);
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-[520px] w-full p-6 bg-white rounded-2xl border-none shadow-xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{task ? "Sửa công việc" : "Công việc mới"}</DialogTitle>
        </DialogHeader>
        {task && (() => {
          const delay = getCompletionDelay(task);
          if (!delay) return null;
          return (
            <p className={cn("text-xs", delay.onTime ? "text-emerald-600" : "text-destructive")}>
              Hoàn thành lúc {format(delay.completedAt, "HH:mm dd/MM/yyyy")} · {delay.label}
            </p>
          );
        })()}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
            <Label htmlFor="task-title">Tiêu đề</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tên công việc"
              required
            />
          </div>

          <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
            <Label htmlFor="task-description">Mô tả</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú thêm (không bắt buộc)"
            />
          </div>

          {!task && (
            <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
              <Label htmlFor="task-kind">Loại</Label>
              <Select value={kind} onValueChange={(value) => setKind(value as "once" | "daily")}>
                <SelectTrigger id="task-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Chỉ một lần</SelectItem>
                  <SelectItem value="daily">Hàng ngày</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {isTaskShape ? (
            <>
              <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
                <Label htmlFor="task-start-date">Bắt đầu</Label>
                <DateTimePicker
                  id="task-start-date"
                  value={startDate}
                  onChange={(date) => setStartDate(date ?? defaultStartDate())}
                />
              </div>

              <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
                <Label htmlFor="task-end-date">Kết thúc</Label>
                <DateTimePicker
                  id="task-end-date"
                  value={endDate}
                  onChange={(date) => setEndDate(date ?? defaultEndDate())}
                />
                {dateError && <p className="text-xs text-destructive">{dateError}</p>}
              </div>
            </>
          ) : (
            <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
              <Label htmlFor="task-due-time">Hạn chót (giờ)</Label>
              <Input
                id="task-due-time"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          )}

          {isTaskShape && (
            <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
              <Label>Sub-task</Label>
              {subtasks.length > 0 && (
                <ul className="flex w-full min-w-0 flex-col gap-1.5 box-border">
                  {subtasks.map((subtask) => (
                    <li
                      key={subtask.id}
                      className="flex w-full min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-700 box-border"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                        <Checkbox checked={subtask.completed} onCheckedChange={() => handleToggleSubtask(subtask.id)} />
                        <span
                          className={cn(
                            "block min-w-0 flex-1 truncate",
                            subtask.completed && "text-slate-400 line-through"
                          )}
                          title={subtask.title}
                        >
                          {subtask.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(subtask.id)}
                        aria-label="Xóa sub-task"
                        className="shrink-0 text-slate-400 hover:text-destructive"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex w-full min-w-0 flex-1 items-center gap-2 box-border">
                <Input
                  className="min-w-0 flex-1"
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder="Thêm sub-task"
                />
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={handleAddSubtask}>
                  <PlusIcon className="size-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex w-full min-w-0 items-center gap-3 box-border">
            <Button type="submit" className="min-w-0 flex-1">
              {task ? "Lưu thay đổi" : "Thêm công việc"}
            </Button>
            {task && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="shrink-0"
                aria-label="Xóa công việc"
                onClick={() => {
                  onDelete(task.id);
                  setOpen(false);
                }}
              >
                <Trash2Icon className="size-4" />
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
