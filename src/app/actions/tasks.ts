"use server";

import { revalidatePath } from "next/cache";
import { addDays, addMonths, addWeeks, endOfDay, startOfDay } from "date-fns";
import { requireUser } from "@/lib/supabase/require-user";
import { toDateKey } from "@/lib/date/date-key";
import type { Recurrence, Subtask, Task, TaskStatus } from "@/lib/tasks/types";

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  recurrence: Recurrence;
  created_at: string;
  completed_at: string | null;
  subtasks: Subtask[];
}

const TASK_COLUMNS =
  "id, title, description, status, due_date, recurrence, created_at, completed_at, subtasks";

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    recurrence: row.recurrence,
    dueDate: row.due_date ? new Date(row.due_date) : null,
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    subtasks: row.subtasks ?? [],
  };
}

function nextDueDate(current: Date, recurrence: Recurrence): Date | null {
  switch (recurrence) {
    case "daily":
      return addDays(current, 1);
    case "weekly":
      return addWeeks(current, 1);
    case "monthly":
      return addMonths(current, 1);
    case "none":
      return null;
  }
}

function revalidateDashboard() {
  revalidatePath("/");
  revalidatePath("/analytics");
}

export async function getTasks(): Promise<Task[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("user_id", userId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data as TaskRow[]).map(mapTask);
}

export async function getTasksForDate(date: Date): Promise<Task[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("user_id", userId)
    .gte("due_date", startOfDay(date).toISOString())
    .lte("due_date", endOfDay(date).toISOString());

  if (error) throw new Error(error.message);
  return (data as TaskRow[]).map(mapTask);
}

export async function getOverdueTasks(): Promise<Task[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("due_date", toDateKey(new Date()));

  if (error) throw new Error(error.message);
  return (data as TaskRow[]).map(mapTask);
}

export async function createTask(input: {
  title: string;
  description: string | null;
  dueDate: Date | null;
  recurrence: Recurrence;
  subtasks: Subtask[];
}): Promise<Task> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      due_date: input.dueDate ? input.dueDate.toISOString() : null,
      recurrence: input.recurrence,
      status: "pending",
      subtasks: input.subtasks,
    })
    .select(TASK_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidateDashboard();
  return mapTask(data as TaskRow);
}

export async function updateTask(
  id: string,
  input: {
    title: string;
    description: string | null;
    dueDate: Date | null;
    recurrence: Recurrence;
    subtasks: Subtask[];
  }
): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({
      title: input.title,
      description: input.description,
      due_date: input.dueDate ? input.dueDate.toISOString() : null,
      recurrence: input.recurrence,
      subtasks: input.subtasks,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateDashboard();
}

/**
 * Toggles status. When a recurring task transitions pending -> completed,
 * the next instance is created automatically from its own due date (not
 * "today"), so the schedule never drifts even if the user completes it late.
 */
export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const { supabase, userId } = await requireUser();

  const { data: currentRow, error: fetchError } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  const task = mapTask(currentRow as TaskRow);

  const { error: updateError } = await supabase
    .from("tasks")
    .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("user_id", userId);

  if (updateError) throw new Error(updateError.message);

  const justCompleted = task.status === "pending" && status === "completed";
  const next =
    justCompleted && task.dueDate && task.recurrence !== "none"
      ? nextDueDate(task.dueDate, task.recurrence)
      : null;

  if (next) {
    const { error: insertError } = await supabase.from("tasks").insert({
      user_id: userId,
      title: task.title,
      description: task.description,
      due_date: next.toISOString(),
      recurrence: task.recurrence,
      status: "pending",
      subtasks: task.subtasks.map((subtask) => ({ ...subtask, completed: false })),
    });
    if (insertError) throw new Error(insertError.message);
  }

  revalidateDashboard();
}

export async function deleteTask(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateDashboard();
}
