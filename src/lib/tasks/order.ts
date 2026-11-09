import type { Task } from "@/lib/tasks/types";

/** `yyyy-MM-dd` day key -> task / occurrence ids in the order the user dragged them. */
export type TaskDayOrders = Record<string, string[]>;

const byDeadline = (a: Task, b: Task) => a.endDate.getTime() - b.endDate.getTime();

/**
 * Pending tasks first, then completed ones. Within each group, ids found in
 * `savedOrder` keep that order; the rest (new tasks, never dragged) follow by
 * nearest deadline after the ordered ones.
 */
export function orderDayTasks(tasks: Task[], savedOrder: string[] | undefined): Task[] {
  const position = new Map((savedOrder ?? []).map((id, index) => [id, index]));

  const arrange = (group: Task[]) => {
    const ordered = group.filter((t) => position.has(t.id)).sort((a, b) => position.get(a.id)! - position.get(b.id)!);
    const rest = group.filter((t) => !position.has(t.id)).sort(byDeadline);
    return [...ordered, ...rest];
  };

  return [
    ...arrange(tasks.filter((t) => t.status === "pending")),
    ...arrange(tasks.filter((t) => t.status === "completed")),
  ];
}
