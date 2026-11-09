"use client";

import { endOfDay, format, isSameDay, startOfDay } from "date-fns";
import { useState, type FormEvent, type ReactElement } from "react";
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import type { Subtask, Task, TaskRecurrence, TaskStatus } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

export interface TaskFormInput {
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  subtasks: Subtask[];
  /** Set for weekly/monthly tasks; startDate/endDate are then unused. */
  recurrence?: TaskRecurrence;
}

type TaskKind = "once" | "daily" | "weekly" | "monthly";

const KIND_OPTIONS: { value: TaskKind; label: string }[] = [
  { value: "once", label: "Chỉ một lần" },
  { value: "daily", label: "Hàng ngày" },
  { value: "weekly", label: "Hàng tuần" },
  { value: "monthly", label: "Hàng tháng" },
];

/** 0 = Sunday, matching `Date#getDay`; listed Monday-first. */
const WEEKDAY_OPTIONS = [
  { value: 1, short: "T2", label: "Thứ 2" },
  { value: 2, short: "T3", label: "Thứ 3" },
  { value: 3, short: "T4", label: "Thứ 4" },
  { value: 4, short: "T5", label: "Thứ 5" },
  { value: 5, short: "T6", label: "Thứ 6" },
  { value: 6, short: "T7", label: "Thứ 7" },
  { value: 0, short: "CN", label: "Chủ nhật" },
];

const MONTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: `Ngày ${i + 1}`,
}));

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
  /** Day a new task is created for (the day being viewed). Defaults to today. */
  defaultDate?: Date;
}

/** Start of a one-day task: "now" for today (as before), 00:00 for any other day. */
function dayStart(day: Date): Date {
  return isSameDay(day, new Date()) ? new Date() : startOfDay(day);
}

function dayEnd(day: Date): Date {
  return endOfDay(day);
}

/** A task that sits inside one calendar day and runs to its end can be edited with a single date. */
function isSingleDayWindow(start: Date, end: Date): boolean {
  return isSameDay(start, end) && end.getHours() === 23 && end.getMinutes() === 59;
}

export function TaskFormDialog({
  trigger,
  task,
  onSubmitTask,
  onSubmitHabit,
  onDelete,
  onStatusChange,
  defaultDate,
}: TaskFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<TaskKind>("once");
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [monthDay, setMonthDay] = useState("1");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>(() => dayStart(defaultDate ?? new Date()));
  const [endDate, setEndDate] = useState<Date>(() => dayEnd(defaultDate ?? new Date()));
  // Most tasks are "do it on day X": one date picker, with the start/end
  // window (and exact hours) tucked behind a toggle.
  const [detailedDates, setDetailedDates] = useState(false);
  const [dueTime, setDueTime] = useState("23:59");
  const [dateError, setDateError] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "pending");

  // Editing an existing task always uses the task-shaped fields; creating
  // a new item switches shape based on the "Loại" selector. Only "Hàng ngày"
  // creates a habit; weekly/monthly are tasks that carry a recurrence.
  const isTaskShape = Boolean(task) || kind !== "daily";
  const recurringType = task ? task.recurrence?.type : kind === "weekly" || kind === "monthly" ? kind : undefined;

  function resetForm() {
    setKind("once");
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    const baseDay = defaultDate ?? new Date();
    setStartDate(task?.startDate ?? dayStart(baseDay));
    setEndDate(task?.endDate ?? dayEnd(baseDay));
    setDetailedDates(task ? !isSingleDayWindow(task.startDate, task.endDate) : false);
    setWeekdays(task?.recurrence?.type === "weekly" ? task.recurrence.weekdays : [1]);
    setMonthDay(task?.recurrence?.type === "monthly" ? String(task.recurrence.monthDay) : "1");
    setDueTime(task?.recurrence?.time ?? "23:59");
    setDateError(null);
    setSubtasks(task?.subtasks ?? []);
    setSubtaskInput("");
    setStatus(task?.status ?? "pending");
  }

  function handleToggleWeekday(day: number) {
    setDateError(null);
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
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

    if (recurringType) {
      if (recurringType === "weekly" && weekdays.length === 0) {
        setDateError("Chọn ít nhất một ngày trong tuần.");
        return;
      }
      setDateError(null);

      onSubmitTask({
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        startDate,
        endDate,
        subtasks: [],
        recurrence:
          recurringType === "weekly"
            ? { type: "weekly", weekdays, time: dueTime }
            : { type: "monthly", monthDay: Number(monthDay), time: dueTime },
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
              <Select items={KIND_OPTIONS} value={kind} onValueChange={(value) => setKind(value as TaskKind)}>
                <SelectTrigger id="task-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {recurringType ? (
            <>
              {recurringType === "weekly" ? (
                <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
                  <Label id="task-weekdays-label">Lặp vào (chọn một hoặc nhiều ngày)</Label>
                  <div role="group" aria-labelledby="task-weekdays-label" className="flex flex-wrap gap-1.5">
                    {WEEKDAY_OPTIONS.map((option) => {
                      const selected = weekdays.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={selected}
                          aria-label={option.label}
                          title={option.label}
                          onClick={() => handleToggleWeekday(option.value)}
                          className={cn(
                            "h-9 min-w-11 rounded-lg border px-3 text-sm font-medium transition-colors duration-200",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {option.short}
                        </button>
                      );
                    })}
                  </div>
                  {dateError && <p className="text-xs text-destructive">{dateError}</p>}
                </div>
              ) : (
                <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
                  <Label htmlFor="task-month-day">Lặp vào</Label>
                  <Select items={MONTH_DAY_OPTIONS} value={monthDay} onValueChange={(value) => setMonthDay(value ?? "1")}>
                    <SelectTrigger id="task-month-day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_DAY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">Tháng nào không có ngày này thì tính vào ngày cuối tháng.</p>
                </div>
              )}

              <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
                <Label htmlFor="task-recur-time">Hạn chót (giờ)</Label>
                <Input
                  id="task-recur-time"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  required
                />
              </div>
            </>
          ) : isTaskShape ? (
            <>
              {detailedDates ? (
                <>
                  <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
                    <Label htmlFor="task-start-date">Bắt đầu</Label>
                    <DateTimePicker
                      id="task-start-date"
                      value={startDate}
                      onChange={(date) => setStartDate(date ?? dayStart(defaultDate ?? new Date()))}
                    />
                  </div>

                  <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
                    <Label htmlFor="task-end-date">Kết thúc</Label>
                    <DateTimePicker
                      id="task-end-date"
                      value={endDate}
                      onChange={(date) => setEndDate(date ?? dayEnd(defaultDate ?? new Date()))}
                    />
                    {dateError && <p className="text-xs text-destructive">{dateError}</p>}
                  </div>
                </>
              ) : (
                <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
                  <Label htmlFor="task-day">Ngày làm</Label>
                  <DatePicker
                    id="task-day"
                    value={startDate}
                    onChange={(date) => {
                      const day = date ?? defaultDate ?? new Date();
                      setStartDate(dayStart(day));
                      setEndDate(dayEnd(day));
                      setDateError(null);
                    }}
                    placeholder="dd/mm/yyyy"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => setDetailedDates((prev) => !prev)}
                className="-mt-2 self-start text-xs font-medium text-primary hover:underline"
              >
                {detailedDates ? "Chỉ làm trong một ngày" : "Nhiều ngày / đặt giờ cụ thể"}
              </button>
            </>
          ) : (
            <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 box-border">
              <Label htmlFor="task-due-time">Hạn chót (giờ)</Label>
              <Input
                id="task-due-time"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                required
              />
            </div>
          )}

          {isTaskShape && !recurringType && (
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
