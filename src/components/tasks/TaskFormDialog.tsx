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
import { RECURRENCE_LABELS, type Recurrence, type Subtask, type Task } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

export interface TaskFormInput {
  title: string;
  description: string | null;
  dueDate: Date | null;
  recurrence: Recurrence;
  subtasks: Subtask[];
}

interface TaskFormDialogProps {
  trigger: ReactElement;
  /** Pass an existing task to edit it (and allow deleting it); omit to create a new one. */
  task?: Task;
  onSubmit: (input: TaskFormInput) => void;
  onDelete?: (id: string) => void;
}

const RECURRENCE_OPTIONS = Object.keys(RECURRENCE_LABELS) as Recurrence[];

function defaultDueDate(): Date {
  return endOfDay(startOfToday());
}

export function TaskFormDialog({ trigger, task, onSubmit, onDelete }: TaskFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(defaultDueDate());
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");

  function resetForm() {
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDueDate(task?.dueDate ?? defaultDueDate());
    setRecurrence(task?.recurrence ?? "none");
    setSubtasks(task?.subtasks ?? []);
    setSubtaskInput("");
  }

  function handleAddSubtask() {
    if (!subtaskInput.trim()) return;
    setSubtasks((prev) => [...prev, { id: crypto.randomUUID(), title: subtaskInput.trim(), completed: false }]);
    setSubtaskInput("");
  }

  function handleToggleSubtask(id: string) {
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)));
  }

  function handleRemoveSubtask(id: string) {
    setSubtasks((prev) => prev.filter((subtask) => subtask.id !== id));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    // A subtask typed but never confirmed with "+" shouldn't be silently
    // dropped when the whole task is saved.
    const pendingSubtask = subtaskInput.trim();
    const finalSubtasks = pendingSubtask
      ? [...subtasks, { id: crypto.randomUUID(), title: pendingSubtask, completed: false }]
      : subtasks;

    onSubmit({
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      dueDate,
      recurrence,
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
      <DialogContent className="sm:max-w-md">
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Tiêu đề</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tên công việc"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-description">Mô tả</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú thêm (không bắt buộc)"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-due-date">Hạn chót</Label>
            <DateTimePicker id="task-due-date" value={dueDate} onChange={setDueDate} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-recurrence">Lặp lại</Label>
            <Select value={recurrence} onValueChange={(value) => setRecurrence(value as Recurrence)}>
              <SelectTrigger id="task-recurrence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {RECURRENCE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Sub-task</Label>
            {subtasks.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {subtasks.map((subtask) => (
                  <li
                    key={subtask.id}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
                  >
                    <Checkbox checked={subtask.completed} onCheckedChange={() => handleToggleSubtask(subtask.id)} />
                    <span className={cn("flex-1 truncate", subtask.completed && "text-slate-400 line-through")}>
                      {subtask.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(subtask.id)}
                      aria-label="Xóa sub-task"
                      className="text-slate-400 hover:text-destructive"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Input
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
              <Button type="button" variant="outline" size="icon" onClick={handleAddSubtask}>
                <PlusIcon className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" className="flex-1">
              {task ? "Lưu thay đổi" : "Thêm công việc"}
            </Button>
            {task && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
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
