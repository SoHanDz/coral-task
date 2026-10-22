"use server";

import { revalidatePath } from "next/cache";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import { requireUser } from "@/lib/supabase/require-user";
import type { Subtask, Task, TaskStatus } from "@/lib/tasks/types";

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  start_date: string;
  end_date: string;
  created_at: string;
  completed_at: string | null;
  subtasks: Subtask[];
}

const TASK_COLUMNS =
  "id, title, description, status, start_date, end_date, created_at, completed_at, subtasks";

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    // parseISO (not `new Date(string)`) so a date-only value is read as
    // local midnight instead of UTC midnight, which is what shifts a day
    // back once formatted in GMT+7.
    startDate: parseISO(row.start_date),
    endDate: parseISO(row.end_date),
    createdAt: parseISO(row.created_at),
    completedAt: row.completed_at ? parseISO(row.completed_at) : null,
    subtasks: row.subtasks ?? [],
  };
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
    .order("start_date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as TaskRow[]).map(mapTask);
}

/** Tasks whose [start_date, end_date] window overlaps the given day. */
export async function getTasksForDate(date: Date): Promise<Task[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("user_id", userId)
    .lte("start_date", endOfDay(date).toISOString())
    .gte("end_date", startOfDay(date).toISOString());

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
    .lt("end_date", startOfDay(new Date()).toISOString());

  if (error) throw new Error(error.message);
  return (data as TaskRow[]).map(mapTask);
}

export async function createTask(input: {
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  subtasks: Subtask[];
}): Promise<Task> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      start_date: input.startDate.toISOString(),
      end_date: input.endDate.toISOString(),
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
    startDate: Date;
    endDate: Date;
    subtasks: Subtask[];
  }
): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({
      title: input.title,
      description: input.description,
      start_date: input.startDate.toISOString(),
      end_date: input.endDate.toISOString(),
      subtasks: input.subtasks,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateDashboard();
}

/**
 * Tasks are one-time only now — toggling status never creates another row,
 * so there is nothing left to duplicate (the old bug cloned a "next day"
 * row here on every pending->completed transition of a recurring task).
 */
export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateDashboard();
}

export async function rescheduleTaskToToday(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({
      start_date: startOfDay(new Date()).toISOString(),
      end_date: endOfDay(new Date()).toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateDashboard();
}

export async function deleteTask(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateDashboard();
}
