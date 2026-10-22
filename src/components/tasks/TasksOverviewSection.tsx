"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { endOfDay, startOfDay } from "date-fns";
import { createTask, deleteTask, rescheduleTaskToToday, updateTask, updateTaskStatus } from "@/app/actions/tasks";
import { createHabit, setHabitLogStatus } from "@/app/actions/habits";
import { Button } from "@/components/ui/button";
import { TaskDayItem } from "@/components/tasks/TaskDayItem";
import { TaskFormDialog, type HabitFormInput, type TaskFormInput } from "@/components/tasks/TaskFormDialog";
import { HabitChecklistItem } from "@/components/habits/HabitChecklistItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toDateKey } from "@/lib/date/date-key";
import type { Habit, HabitLog } from "@/lib/habits/types";
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
  const [isPending, startTransition] = useTransition();
  // Local state updates immediately on every action; it reconciles with the
  // server-fetched props once router.refresh() lands, so interactions never
  // wait on the Supabase round trip to feel instant.
  const [optimisticTasks, applyOptimistic] = useOptimistic(tasks, applyOptimisticAction);
  const [optimisticHabitLogs, applyOptimisticLog] = useOptimistic(habitLogs, applyOptimisticHabitLog);

  function handleCreate(input: TaskFormInput) {
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
    startTransition(async () => {
      applyOptimistic({ type: "edit", id, input });
      await updateTask(id, input);
      router.refresh();
    });
  }

  function handleToggleStatus(id: string) {
    const task = optimisticTasks.find((t) => t.id === id);
    if (!task) return;
    const nextStatus = task.status === "pending" ? "completed" : "pending";
    startTransition(async () => {
      applyOptimistic({ type: "setStatus", id, status: nextStatus });
      await updateTaskStatus(id, nextStatus);
      router.refresh();
    });
  }

  // Wired to the task-edit dialog's subtask checklist: finishing the last
  // subtask (or unchecking one) flips the parent task's own status.
  function handleStatusChange(id: string, status: TaskStatus) {
    startTransition(async () => {
      applyOptimistic({ type: "setStatus", id, status });
      await updateTaskStatus(id, status);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: "delete", id });
      await deleteTask(id);
      router.refresh();
    });
  }

  function handleRescheduleToToday(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: "reschedule", id });
      await rescheduleTaskToToday(id);
      router.refresh();
    });
  }

  function handleToggleHabitLog(habitId: string, completed: boolean) {
    const logDate = toDateKey(selectedDate);
    startTransition(async () => {
      applyOptimisticLog({ habitId, logDate, completed });
      await setHabitLogStatus(habitId, logDate, completed);
      router.refresh();
    });
  }

  const todayKey = toDateKey(new Date());
  const selectedKey = toDateKey(selectedDate);
  const isTodaySelected = selectedKey === todayKey;

  // "Hôm nay" rolls every unfinished past-due task forward so nothing gets
  // silently skipped: status='pending' AND its whole window already ended.
  const orderedDayTasks = isTodaySelected
    ? [
        ...optimisticTasks
          .filter((task) => task.status === "pending" && toDateKey(task.endDate) < todayKey)
          .sort((a, b) => a.endDate.getTime() - b.endDate.getTime()),
        ...optimisticTasks.filter((task) => task.status === "pending" && isTaskOnDay(task, todayKey)),
        ...optimisticTasks.filter((task) => task.status === "completed" && isTaskOnDay(task, todayKey)),
      ]
    : (() => {
        const dayTasks = optimisticTasks.filter((task) => isTaskOnDay(task, selectedKey));
        return [
          ...dayTasks.filter((task) => task.status === "pending"),
          ...dayTasks.filter((task) => task.status === "completed"),
        ];
      })();

  const habitLogsByHabitId = new Map(
    optimisticHabitLogs.filter((log) => log.logDate === selectedKey).map((log) => [log.habitId, log])
  );

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
        <CardHeader className="flex flex-row items-center justify-between px-8 pt-8">
          <CardTitle className="text-lg font-semibold text-slate-700">Công việc cần làm</CardTitle>
          <TaskFormDialog
            trigger={<Button type="button">+ Thêm công việc</Button>}
            onSubmitTask={handleCreate}
            onSubmitHabit={handleCreateHabit}
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-8 pb-8">
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
                />
              ))}
            </ul>
          )}

          {isPending && <p className="text-xs text-slate-500">Đang cập nhật…</p>}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
        <CardHeader className="px-8 pt-8">
          <CardTitle className="text-lg font-semibold text-slate-700">Thói quen hàng ngày</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-8 pb-8">
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
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
