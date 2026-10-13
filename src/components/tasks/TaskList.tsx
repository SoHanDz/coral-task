"use client";

import { TaskItem } from "@/components/tasks/TaskItem";
import type { Task } from "@/lib/tasks/types";

interface TaskListProps {
  tasks: Task[];
  onToggleStatus: (id: string) => void;
  onDelete?: (id: string) => void;
  referenceDate?: Date;
}

export function TaskList({ tasks, onToggleStatus, onDelete, referenceDate }: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có công việc nào.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          referenceDate={referenceDate}
        />
      ))}
    </ul>
  );
}
