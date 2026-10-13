export type TaskStatus = "pending" | "completed";

export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  recurrence: Recurrence;
  status: TaskStatus;
  createdAt: Date;
  completedAt: Date | null;
  subtasks: Subtask[];
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Chưa làm",
  completed: "Đã xong",
};

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "Chỉ một lần",
  daily: "Hàng ngày",
  weekly: "Hàng tuần",
  monthly: "Hàng tháng",
};
