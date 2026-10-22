"use server";

import { revalidatePath } from "next/cache";
import { parseISO } from "date-fns";
import { requireUser } from "@/lib/supabase/require-user";
import type { HabitQuote } from "@/lib/habits/types";

interface HabitQuoteRow {
  id: string;
  text: string;
  created_at: string;
}

const HABIT_QUOTE_COLUMNS = "id, text, created_at";

function mapHabitQuote(row: HabitQuoteRow): HabitQuote {
  return {
    id: row.id,
    text: row.text,
    createdAt: parseISO(row.created_at),
  };
}

export async function getHabitQuotes(): Promise<HabitQuote[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("habit_quotes")
    .select(HABIT_QUOTE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as HabitQuoteRow[]).map(mapHabitQuote);
}

export async function createHabitQuote(text: string): Promise<HabitQuote> {
  if (!text.trim()) throw new Error("text is required");

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("habit_quotes")
    .insert({ user_id: userId, text: text.trim() })
    .select(HABIT_QUOTE_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/habits");
  return mapHabitQuote(data as HabitQuoteRow);
}

export async function updateHabitQuote(id: string, text: string): Promise<void> {
  if (!text.trim()) throw new Error("text is required");

  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("habit_quotes")
    .update({ text: text.trim() })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/habits");
}

export async function deleteHabitQuote(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("habit_quotes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/habits");
}
