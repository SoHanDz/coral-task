"use server";

import { requireUser } from "@/lib/supabase/require-user";
import type { TaskDayOrders } from "@/lib/tasks/order";

export async function getTaskDayOrders(): Promise<TaskDayOrders> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("task_day_orders")
    .select("day, item_ids")
    .eq("user_id", userId);

  // The table ships with migration 0015; before it is applied, fall back to
  // deadline order instead of breaking the whole dashboard.
  if (error) return {};
  return Object.fromEntries((data as { day: string; item_ids: string[] }[]).map((row) => [row.day, row.item_ids]));
}

export async function saveTaskDayOrder(day: string, itemIds: string[]): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("task_day_orders")
    .upsert({ user_id: userId, day, item_ids: itemIds, updated_at: new Date().toISOString() });

  if (error) throw new Error(error.message);
}
