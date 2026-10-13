import { toDateKey } from "@/lib/date/date-key";
import type { Task } from "@/lib/tasks/types";

/** Groups tasks by their due date, counting completed vs. total per day (for the year grid tooltip). */
export function getDailyTaskStats(tasks: Task[]): Map<string, { completed: number; total: number }> {
  const stats = new Map<string, { completed: number; total: number }>();

  for (const task of tasks) {
    if (!task.dueDate) continue;
    const key = toDateKey(task.dueDate);
    const entry = stats.get(key) ?? { completed: 0, total: 0 };
    entry.total += 1;
    if (task.status === "completed") entry.completed += 1;
    stats.set(key, entry);
  }

  return stats;
}
