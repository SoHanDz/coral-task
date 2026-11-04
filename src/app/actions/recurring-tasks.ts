"use server";

import { revalidatePath } from "next/cache";
import { parseISO } from "date-fns";
import { requireUser } from "@/lib/supabase/require-user";
import type { OccurrenceCompletions, RecurringTask } from "@/lib/tasks/recurrence";
import type { TaskRecurrence } from "@/lib/tasks/types";

interface RecurringTaskRow {
  id: string;
  title: string;
  description: string | null;
  recurrence: TaskRecurrence;
  created_at: string;
}

interface CompletionRow {
  task_id: string;
  occurrence_date: string;
  completed_at: string;
}

const COLUMNS = "id, title, description, recurrence, created_at";

function revalidate() {
  revalidatePath("/");
}

export async function getRecurringTasks(): Promise<RecurringTask[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("recurring_tasks")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as RecurringTaskRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    recurrence: row.recurrence,
    createdAt: parseISO(row.created_at),
  }));
}

/** Keyed `taskId::yyyy-MM-dd`, matching occurrenceId() in lib/tasks/recurrence. */
export async function getRecurringCompletions(): Promise<OccurrenceCompletions> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("recurring_task_completions")
    .select("task_id, occurrence_date, completed_at")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  const result: OccurrenceCompletions = {};
  for (const row of data as CompletionRow[]) {
    result[`${row.task_id}::${row.occurrence_date}`] = parseISO(row.completed_at);
  }
  return result;
}

export async function createRecurringTask(input: {
  id: string;
  title: string;
  description: string | null;
  recurrence: TaskRecurrence;
}): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("recurring_tasks").insert({
    id: input.id,
    user_id: userId,
    title: input.title,
    description: input.description,
    recurrence: input.recurrence,
  });
  if (error) throw new Error(error.message);
  revalidate();
}

export async function updateRecurringTask(
  id: string,
  input: { title: string; description: string | null; recurrence: TaskRecurrence }
): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("recurring_tasks")
    .update({ title: input.title, description: input.description, recurrence: input.recurrence })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteRecurringTask(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("recurring_tasks").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function setOccurrenceStatus(taskId: string, occurrenceDate: string, completed: boolean): Promise<void> {
  const { supabase, userId } = await requireUser();
  if (completed) {
    const { error } = await supabase.from("recurring_task_completions").upsert(
      {
        task_id: taskId,
        user_id: userId,
        occurrence_date: occurrenceDate,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "task_id,occurrence_date" }
    );
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("recurring_task_completions")
      .delete()
      .eq("task_id", taskId)
      .eq("occurrence_date", occurrenceDate)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  }
  revalidate();
}
