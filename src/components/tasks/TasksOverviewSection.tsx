"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTask, deleteTask, rescheduleTaskToToday, updateTask, updateTaskStatus } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { TaskDayItem } from "@/components/tasks/TaskDayItem";
import { TaskFormDialog, type TaskFormInput } from "@/components/tasks/TaskFormDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toDateKey } from "@/lib/date/date-key";
import type { Task, TaskStatus } from "@/lib/tasks/types";

interface TasksOverviewSectionProps {
  tasks: Task[];
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
              dueDate: action.input.dueDate,
              recurrence: action.input.recurrence,
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
    case "reschedule":
      return state.map((task) => (task.id === action.id ? { ...task, dueDate: new Date() } : task));
    case "delete":
      return state.filter((task) => task.id !== action.id);
  }
}

export function TasksOverviewSection({ tasks, selectedDate }: TasksOverviewSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Local state updates immediately on every action; it reconciles with the
  // server-fetched `tasks` prop once router.refresh() lands, so interactions
  // never wait on the Supabase round trip to feel instant.
  const [optimisticTasks, applyOptimistic] = useOptimistic(tasks, applyOptimisticAction);

  function handleCreate(input: TaskFormInput) {
    const optimisticTask: Task = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      recurrence: input.recurrence,
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

  const todayKey = toDateKey(new Date());
  const selectedKey = toDateKey(selectedDate);
  const isTodaySelected = selectedKey === todayKey;

  // "Hôm nay" rolls every unfinished past-due task forward so nothing gets
  // silently skipped: status='pending' AND due_date <= today, overdue first.
  const orderedDayTasks = isTodaySelected
    ? [
        ...optimisticTasks
          .filter((task) => task.status === "pending" && task.dueDate && toDateKey(task.dueDate) < todayKey)
          .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime()),
        ...optimisticTasks.filter(
          (task) => task.status === "pending" && task.dueDate && toDateKey(task.dueDate) === todayKey
        ),
        ...optimisticTasks.filter(
          (task) => task.status === "completed" && task.dueDate && toDateKey(task.dueDate) === todayKey
        ),
      ]
    : (() => {
        const dayTasks = optimisticTasks.filter((task) => task.dueDate && toDateKey(task.dueDate) === selectedKey);
        return [
          ...dayTasks.filter((task) => task.status === "pending"),
          ...dayTasks.filter((task) => task.status === "completed"),
        ];
      })();

  return (
    <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
      <CardHeader className="flex flex-row items-center justify-between px-8 pt-8">
        <CardTitle className="text-lg font-semibold text-slate-700">Công việc cần làm</CardTitle>
        <TaskFormDialog trigger={<Button type="button">+ Thêm công việc</Button>} onSubmit={handleCreate} />
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
  );
}
