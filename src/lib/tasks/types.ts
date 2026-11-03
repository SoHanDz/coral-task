export type TaskStatus = "pending" | "completed";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

/** `weekdays` hold 0 (Sunday) – 6 (Saturday), at least one; `time` is "HH:mm". */
export type TaskRecurrence =
  | { type: "weekly"; weekdays: number[]; time: string }
  | { type: "monthly"; monthDay: number; time: string };

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
  /** Only set on a single occurrence of a weekly/monthly task; its id is `templateId::yyyy-MM-dd`. */
  recurrence?: TaskRecurrence;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Chưa làm",
  completed: "Đã xong",
};
