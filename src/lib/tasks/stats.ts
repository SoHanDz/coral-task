import { eachDayOfInterval } from "date-fns";
import { toDateKey } from "@/lib/date/date-key";
import type { Task } from "@/lib/tasks/types";

/** Groups tasks by every day their [startDate, endDate] window touches, counting completed vs. total per day (for the year grid tooltip). */
export function getDailyTaskStats(tasks: Task[]): Map<string, { completed: number; total: number }> {
  const stats = new Map<string, { completed: number; total: number }>();

  for (const task of tasks) {
    for (const day of eachDayOfInterval({ start: task.startDate, end: task.endDate })) {
      const key = toDateKey(day);
      const entry = stats.get(key) ?? { completed: 0, total: 0 };
      entry.total += 1;
      if (task.status === "completed") entry.completed += 1;
      stats.set(key, entry);
    }
  }

  return stats;
}
