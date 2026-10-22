"use client";

import { addDays, endOfDay, subDays } from "date-fns";
import { useTasks } from "@/hooks/use-tasks";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskList } from "@/components/tasks/TaskList";
import type { Task } from "@/lib/tasks/types";

const today = new Date();

const seedTasks: Task[] = [
  {
    id: "seed-overdue",
    title: "[Expect RED] Quá hạn 3 ngày, chưa làm",
    description: null,
    startDate: subDays(today, 3),
    endDate: endOfDay(subDays(today, 3)),
    status: "pending",
    createdAt: today,
    completedAt: null,
    subtasks: [],
  },
  {
    id: "seed-overdue-completed",
    title: "[Expect normal] Quá hạn nhưng đã xong",
    description: null,
    startDate: subDays(today, 3),
    endDate: endOfDay(subDays(today, 3)),
    status: "completed",
    createdAt: today,
    completedAt: today,
    subtasks: [],
  },
  {
    id: "seed-today",
    title: "[Expect normal] Hạn đúng hôm nay",
    description: null,
    startDate: today,
    endDate: endOfDay(today),
    status: "pending",
    createdAt: today,
    completedAt: null,
    subtasks: [],
  },
  {
    id: "seed-future",
    title: "[Expect normal] Hạn còn 5 ngày nữa",
    description: null,
    startDate: addDays(today, 5),
    endDate: endOfDay(addDays(today, 5)),
    status: "pending",
    createdAt: today,
    completedAt: null,
    subtasks: [],
  },
  {
    id: "seed-range",
    title: "[Expect normal] Kéo dài 3 ngày",
    description: null,
    startDate: today,
    endDate: endOfDay(addDays(today, 2)),
    status: "pending",
    createdAt: today,
    completedAt: null,
    subtasks: [],
  },
];

export function TasksDevClient() {
  const { tasks, addTask, toggleStatus } = useTasks(seedTasks);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-10">
      <h1 className="text-xl font-semibold">Quản lý công việc</h1>
      <TaskForm onCreate={addTask} />
      <TaskList tasks={tasks} onToggleStatus={toggleStatus} />
    </div>
  );
}
