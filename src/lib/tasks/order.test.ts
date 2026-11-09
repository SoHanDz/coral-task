import { describe, expect, it } from "vitest";
import { orderDayTasks } from "@/lib/tasks/order";
import type { Task } from "@/lib/tasks/types";

function task(id: string, day: number, status: Task["status"] = "pending"): Task {
  const end = new Date(2026, 10, day);
  return { id, title: id, description: null, startDate: end, endDate: end, status, createdAt: end, completedAt: null, subtasks: [] };
}

const ids = (tasks: Task[]) => tasks.map((t) => t.id);

describe("orderDayTasks", () => {
  it("falls back to deadline order without a saved order", () => {
    expect(ids(orderDayTasks([task("b", 5), task("a", 3)], undefined))).toEqual(["a", "b"]);
  });

  it("follows the saved order, then puts unsaved tasks after by deadline", () => {
    const result = orderDayTasks([task("a", 1), task("b", 2), task("c", 3), task("d", 2)], ["c", "a"]);
    expect(ids(result)).toEqual(["c", "a", "b", "d"]);
  });

  it("keeps completed tasks below pending ones regardless of saved order", () => {
    const result = orderDayTasks([task("a", 1, "completed"), task("b", 2)], ["a", "b"]);
    expect(ids(result)).toEqual(["b", "a"]);
  });

  it("ignores saved ids that no longer exist", () => {
    expect(ids(orderDayTasks([task("a", 1)], ["gone", "a"]))).toEqual(["a"]);
  });
});
