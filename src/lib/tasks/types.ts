export type TaskStatus = "pending" | "completed";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  status: TaskStatus;
  createdAt: Date;
  completedAt: Date | null;
  subtasks: Subtask[];
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Chưa làm",
  completed: "Đã xong",
};
