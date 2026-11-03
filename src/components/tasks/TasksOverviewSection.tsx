"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { endOfDay, startOfDay } from "date-fns";
import { createTask, deleteTask, rescheduleTaskToToday, updateTask, updateTaskStatus } from "@/app/actions/tasks";
import { createHabit, deleteHabit, setHabitLogStatus, updateHabit } from "@/app/actions/habits";
import { Button } from "@/components/ui/button";
import { TaskDayItem } from "@/components/tasks/TaskDayItem";
import { TaskFormDialog, type HabitFormInput, type TaskFormInput } from "@/components/tasks/TaskFormDialog";
import { HabitChecklistItem } from "@/components/habits/HabitChecklistItem";
import { HabitDetailDialog } from "@/components/habits/HabitDetailDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toDateKey } from "@/lib/date/date-key";
import type { Habit, HabitLog } from "@/lib/habits/types";
import {
  getVisibleOccurrences,
  isOccurrenceId,
  templateIdOf,
  type OccurrenceCompletions,
  type RecurringTask,
} from "@/lib/tasks/recurrence";
import type { Task, TaskStatus } from "@/lib/tasks/types";

interface TasksOverviewSectionProps {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  selectedDate: Date;
}

type OptimisticAction =
  | { type: "create"; task: Task }
  | { type: "edit"; id: string; input: TaskFormInput }
  | { type: "setStatus"; id: string; status: TaskStatus }
  | { type: "reschedule"; id: string }
  | { type: "delete"; id: string };

function applyOptimisticAction(state: Task[], action: OptimisticAction): Task[] {
  switch (action.type) {
    case "create":
      return [action.task, ...state];
    case "edit":
      return state.map((task) =>
        task.id === action.id
          ? {
              ...task,
              title: action.input.title,
              description: action.input.description,
              startDate: action.input.startDate,
              endDate: action.input.endDate,
              subtasks: action.input.subtasks,
            }
          : task
      );
    case "setStatus":
      return state.map((task) =>
        task.id === action.id
          ? { ...task, status: action.status, completedAt: action.status === "completed" ? new Date() : null }
          : task
      );
    case "reschedule": {
      const now = new Date();
      return state.map((task) =>
        task.id === action.id ? { ...task, startDate: startOfDay(now), endDate: endOfDay(now) } : task
      );
    }
    case "delete":
      return state.filter((task) => task.id !== action.id);
  }
}

type HabitLogAction = { habitId: string; logDate: string; completed: boolean };

function applyOptimisticHabitLog(state: HabitLog[], action: HabitLogAction): HabitLog[] {
  const next: HabitLog = {
    habitId: action.habitId,
    logDate: action.logDate,
    completed: action.completed,
    completedAt: action.completed ? new Date() : null,
  };
  const idx = state.findIndex((log) => log.habitId === action.habitId && log.logDate === action.logDate);
  if (idx === -1) return [...state, next];
  return state.map((log, i) => (i === idx ? next : log));
}

/** True when the task's [startDate, endDate] window includes this calendar day. */
function isTaskOnDay(task: Task, dayKey: string): boolean {
  return toDateKey(task.startDate) <= dayKey && dayKey <= toDateKey(task.endDate);
}

export function TasksOverviewSection({ tasks, habits, habitLogs, selectedDate }: TasksOverviewSectionProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Local state updates immediately on every action; it reconciles with the
  // server-fetched props once router.refresh() lands, so interactions never
  // wait on the Supabase round trip to feel instant.
  const [optimisticTasks, applyOptimistic] = useOptimistic(tasks, applyOptimisticAction);
  const [optimisticHabitLogs, applyOptimisticLog] = useOptimistic(habitLogs, applyOptimisticHabitLog);
  // Tracks which specific task/habit row is mid-mutation, so the loading
  // state renders inline in that row's own checkbox instead of a generic
  // banner — the mutation itself still runs immediately regardless.
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [pendingHabitIds, setPendingHabitIds] = useState<Set<string>>(new Set());
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  // TODO(api): weekly/monthly tasks live only in client state until the backend
  // has a recurrence column + a per-occurrence completion table. Both shapes
  // below map 1:1 onto that (template row + (template_id, date) completion row).
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [occurrenceCompletions, setOccurrenceCompletions] = useState<OccurrenceCompletions>({});

  function withTaskPending(id: string, fn: () => Promise<void>) {
    setPendingTaskIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      try {
        await fn();
      } finally {
        setPendingTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  }

  function withHabitPending(id: string, fn: () => Promise<void>) {
    setPendingHabitIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      try {
        await fn();
      } finally {
        setPendingHabitIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  }

  function handleCreate(input: TaskFormInput) {
    if (input.recurrence) {
      const template: RecurringTask = {
        id: crypto.randomUUID(),
        title: input.title,
        description: input.description,
        recurrence: input.recurrence,
        createdAt: new Date(),
      };
      setRecurringTasks((prev) => [...prev, template]);
      return;
    }

    const optimisticTask: Task = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "pending",
      createdAt: new Date(),
      completedAt: null,
      subtasks: input.subtasks,
    };
    startTransition(async () => {
      applyOptimistic({ type: "create", task: optimisticTask });
      await createTask(input);
      router.refresh();
    });
  }

  function handleCreateHabit(input: HabitFormInput) {
    startTransition(async () => {
      await createHabit(input);
      router.refresh();
    });
  }

  function handleEdit(id: string, input: TaskFormInput) {
    // Editing any occurrence edits the shared weekly/monthly definition.
    if (isOccurrenceId(id)) {
      const templateId = templateIdOf(id);
      setRecurringTasks((prev) =>
        prev.map((template) =>
          template.id === templateId
            ? {
                ...template,
                title: input.title,
                description: input.description,
                recurrence: input.recurrence ?? template.recurrence,
              }
            : template
        )
      );
      return;
    }

    startTransition(async () => {
      applyOptimistic({ type: "edit", id, input });
      await updateTask(id, input);
      router.refresh();
    });
  }

  function handleToggleStatus(id: string) {
    // An occurrence is only ever flagged done/undone under its own
    // `template::date` key - nothing is created, so an overdue one can't duplicate.
    if (isOccurrenceId(id)) {
      setOccurrenceCompletions((prev) => {
        if (prev[id]) return Object.fromEntries(Object.entries(prev).filter(([key]) => key !== id));
        return { ...prev, [id]: new Date() };
      });
      return;
    }

    const task = optimisticTasks.find((t) => t.id === id);
    if (!task) return;
    const nextStatus = task.status === "pending" ? "completed" : "pending";
    withTaskPending(id, async () => {
      applyOptimistic({ type: "setStatus", id, status: nextStatus });
      await updateTaskStatus(id, nextStatus);
      router.refresh();
    });
  }

  // Wired to the task-edit dialog's subtask checklist: finishing the last
  // subtask (or unchecking one) flips the parent task's own status.
  function handleStatusChange(id: string, status: TaskStatus) {
    withTaskPending(id, async () => {
      applyOptimistic({ type: "setStatus", id, status });
      await updateTaskStatus(id, status);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (isOccurrenceId(id)) {
      const templateId = templateIdOf(id);
      setRecurringTasks((prev) => prev.filter((template) => template.id !== templateId));
      setOccurrenceCompletions((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([key]) => templateIdOf(key) !== templateId))
      );
      return;
    }

    startTransition(async () => {
      applyOptimistic({ type: "delete", id });
      await deleteTask(id);
      router.refresh();
    });
  }

  function handleRescheduleToToday(id: string) {
    withTaskPending(id, async () => {
      applyOptimistic({ type: "reschedule", id });
      await rescheduleTaskToToday(id);
      router.refresh();
    });
  }

  function handleToggleHabitLog(habitId: string, completed: boolean) {
    const logDate = toDateKey(selectedDate);
    withHabitPending(habitId, async () => {
      applyOptimisticLog({ habitId, logDate, completed });
      await setHabitLogStatus(habitId, logDate, completed);
      router.refresh();
    });
  }

  function handleUpdateHabit(id: string, input: { title: string; description: string | null; dueTime: string }) {
    startTransition(async () => {
      await updateHabit(id, input);
      router.refresh();
    });
  }

  function handleDeleteHabit(id: string) {
    startTransition(async () => {
      await deleteHabit(id);
      router.refresh();
    });
  }

  const todayKey = toDateKey(new Date());
  const selectedKey = toDateKey(selectedDate);
  const isTodaySelected = selectedKey === todayKey;

  // "Hôm nay" rolls every unfinished past-due task forward so nothing gets
  // silently skipped: status='pending' AND its whole window already ended.
  // Weekly/monthly occurrences follow the same rule (see getVisibleOccurrences).
  const oneTimeTasks = optimisticTasks.filter((task) =>
    isTodaySelected
      ? isTaskOnDay(task, todayKey) || (task.status === "pending" && toDateKey(task.endDate) < todayKey)
      : isTaskOnDay(task, selectedKey)
  );
  const dayTasks = [...oneTimeTasks, ...getVisibleOccurrences(recurringTasks, occurrenceCompletions, selectedDate)];

  // Pending first, nearest deadline on top (overdue ones have the earliest, so
  // they naturally lead); finished tasks sink to the bottom in the same order.
  const byDeadline = (a: Task, b: Task) => a.endDate.getTime() - b.endDate.getTime();
  const orderedDayTasks = [
    ...dayTasks.filter((task) => task.status === "pending").sort(byDeadline),
    ...dayTasks.filter((task) => task.status === "completed").sort(byDeadline),
  ];

  const habitLogsByHabitId = new Map(
    optimisticHabitLogs.filter((log) => log.logDate === selectedKey).map((log) => [log.habitId, log])
  );
  const selectedHabit = habits.find((h) => h.id === selectedHabitId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
        <CardHeader className="flex flex-row items-center justify-between px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-lg font-semibold text-slate-700">Công việc cần làm</CardTitle>
          <TaskFormDialog
            trigger={<Button type="button">+ Thêm công việc</Button>}
            onSubmitTask={handleCreate}
            onSubmitHabit={handleCreateHabit}
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-4 pb-6 sm:px-8 sm:pb-8">
          {orderedDayTasks.length === 0 ? (
            <p className="text-sm text-slate-500">Không có việc nào vào ngày này.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {orderedDayTasks.map((task) => (
                <TaskDayItem
                  key={task.id}
                  task={task}
                  onToggleStatus={handleToggleStatus}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onRescheduleToToday={handleRescheduleToToday}
                  onStatusChange={handleStatusChange}
                  pending={pendingTaskIds.has(task.id)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
        <CardHeader className="flex flex-row items-center justify-between px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-lg font-semibold text-slate-700">Thói quen hàng ngày</CardTitle>
          <Link
            href="/habits"
            className="flex items-center gap-1 text-sm font-medium text-primary transition-colors duration-200 hover:underline"
          >
            Xem chi tiết
            <ArrowRight className="size-4" />
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-4 pb-6 sm:px-8 sm:pb-8">
          {habits.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có thói quen nào.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {habits.map((habit) => (
                <HabitChecklistItem
                  key={habit.id}
                  habit={habit}
                  log={habitLogsByHabitId.get(habit.id)}
                  onToggle={handleToggleHabitLog}
                  pending={pendingHabitIds.has(habit.id)}
                  onRowClick={(h) => setSelectedHabitId(h.id)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <HabitDetailDialog
        habit={selectedHabit}
        habitLogs={optimisticHabitLogs}
        open={selectedHabitId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedHabitId(null);
        }}
        onUpdate={handleUpdateHabit}
        onDelete={handleDeleteHabit}
      />
    </div>
  );
}
