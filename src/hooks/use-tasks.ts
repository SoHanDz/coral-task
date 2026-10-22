"use client";

import { useState } from "react";
import type { Task } from "@/lib/tasks/types";

export function useTasks(initialTasks: Task[] = []) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  function addTask(input: { title: string; startDate: Date; endDate: Date }) {
    const task: Task = {
      id: crypto.randomUUID(),
      title: input.title,
      description: null,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "pending",
      createdAt: new Date(),
      completedAt: null,
      subtasks: [],
    };
    setTasks((prev) => [task, ...prev]);
  }

  function toggleStatus(id: string) {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const status = task.status === "pending" ? "completed" : "pending";
        return { ...task, status, completedAt: status === "completed" ? new Date() : null };
      })
    );
  }

  return { tasks, addTask, toggleStatus };
}
