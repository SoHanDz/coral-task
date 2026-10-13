"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTask, deleteTask, updateTask, updateTaskStatus } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { TaskDayItem } from "@/components/tasks/TaskDayItem";
import { TaskFormDialog, type TaskFormInput } from "@/components/tasks/TaskFormDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toDateKey } from "@/lib/date/date-key";
import type { Task } from "@/lib/tasks/types";

interface TasksOverviewSectionProps {
  tasks: Task[];
  selectedDate: Date;
}

export function TasksOverviewSection({ tasks, selectedDate }: TasksOverviewSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleCreate(input: TaskFormInput) {
    startTransition(async () => {
      await createTask(input);
      router.refresh();
    });
  }

  function handleEdit(id: string, input: TaskFormInput) {
    startTransition(async () => {
      await updateTask(id, input);
      router.refresh();
    });
  }

  function handleToggleStatus(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const nextStatus = task.status === "pending" ? "completed" : "pending";
    startTransition(async () => {
      await updateTaskStatus(id, nextStatus);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteTask(id);
      router.refresh();
    });
  }

  const selectedKey = toDateKey(selectedDate);
  const dayTasks = tasks.filter((task) => task.dueDate && toDateKey(task.dueDate) === selectedKey);
  const pendingTasks = dayTasks.filter((task) => task.status === "pending");
  const completedTasks = dayTasks.filter((task) => task.status === "completed");
  const orderedDayTasks = [...pendingTasks, ...completedTasks];

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
              />
            ))}
          </ul>
        )}

        {isPending && <p className="text-xs text-slate-500">Đang cập nhật…</p>}
      </CardContent>
    </Card>
  );
}
