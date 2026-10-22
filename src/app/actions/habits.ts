"use server";

import { revalidatePath } from "next/cache";
import { parseISO } from "date-fns";
import { requireUser } from "@/lib/supabase/require-user";
import type { Habit, HabitLog } from "@/lib/habits/types";

interface HabitRow {
  id: string;
  title: string;
  description: string | null;
  due_time: string;
  created_at: string;
}

interface HabitLogRow {
  habit_id: string;
  log_date: string;
  completed_at: string | null;
}

const HABIT_COLUMNS = "id, title, description, due_time, created_at";
const HABIT_LOG_COLUMNS = "habit_id, log_date, completed_at";

function mapHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueTime: row.due_time.slice(0, 5),
    createdAt: parseISO(row.created_at),
  };
}

function mapHabitLog(row: HabitLogRow): HabitLog {
  return {
    habitId: row.habit_id,
    logDate: row.log_date,
    completed: row.completed_at !== null,
    completedAt: row.completed_at ? parseISO(row.completed_at) : null,
  };
}

function revalidateHabits() {
  revalidatePath("/");
  revalidatePath("/habits");
}

export async function getHabits(): Promise<Habit[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("habits")
    .select(HABIT_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as HabitRow[]).map(mapHabit);
}

/** All completion logs for the user, across every habit and day. */
export async function getHabitLogs(): Promise<HabitLog[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("habit_logs")
    .select(HABIT_LOG_COLUMNS)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return (data as HabitLogRow[]).map(mapHabitLog);
}

export async function createHabit(input: {
  title: string;
  description: string | null;
  dueTime: string;
}): Promise<Habit> {
  if (!input.dueTime) throw new Error("dueTime is required");

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      due_time: input.dueTime,
    })
    .select(HABIT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidateHabits();
  return mapHabit(data as HabitRow);
}

export async function updateHabit(
  id: string,
  input: { title: string; description: string | null; dueTime: string }
): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("habits")
    .update({
      title: input.title,
      description: input.description,
      due_time: input.dueTime,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateHabits();
}

export async function deleteHabit(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("habits").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateHabits();
}

/**
 * Upserts a single day's completion for a habit — never inserts a second
 * row for the same (habit, day), so ticking, unticking, and re-ticking the
 * same day stays exactly one row. Relies on the unique (habit_id, log_date)
 * constraint from the 0007 migration.
 */
export async function setHabitLogStatus(
  habitId: string,
  logDate: string,
  completed: boolean
): Promise<void> {
  const { supabase, userId } = await requireUser();

  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("id")
    .eq("id", habitId)
    .eq("user_id", userId)
    .maybeSingle();

  if (habitError) throw new Error(habitError.message);
  if (!habit) throw new Error("Habit not found");

  const { error } = await supabase.from("habit_logs").upsert(
    {
      habit_id: habitId,
      user_id: userId,
      log_date: logDate,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "habit_id,log_date" }
  );

  if (error) throw new Error(error.message);
  revalidateHabits();
}
