"use server";

import { revalidatePath } from "next/cache";
import { parseISO } from "date-fns";
import { requireUser } from "@/lib/supabase/require-user";
import { toDateKey } from "@/lib/date/date-key";
import type { EventItem } from "@/lib/events/types";

interface EventRow {
  id: string;
  title: string;
  event_date: string;
  is_recurring: boolean;
  created_at: string;
}

const EVENT_COLUMNS = "id, title, event_date, is_recurring, created_at";

function mapEvent(row: EventRow): EventItem {
  return {
    id: row.id,
    title: row.title,
    // event_date is a date-only string ("yyyy-MM-dd"). parseISO reads it as
    // local midnight — unlike `new Date("yyyy-MM-dd")`, which the spec
    // mandates be parsed as UTC midnight and shifts a day back once
    // formatted in GMT+7. It also tolerates a row that already carries a
    // time/offset (a timestamptz column) instead of double-appending one.
    eventDate: parseISO(row.event_date),
    isRecurring: row.is_recurring,
  };
}

export async function getEvents(): Promise<EventItem[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("user_id", userId)
    .order("event_date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as EventRow[]).map(mapEvent);
}

function revalidateDashboard() {
  revalidatePath("/");
  revalidatePath("/analytics");
}

export async function createEvent(input: {
  title: string;
  eventDate: Date;
  isRecurring?: boolean;
}): Promise<EventItem> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: userId,
      title: input.title,
      event_date: toDateKey(input.eventDate),
      is_recurring: input.isRecurring ?? false,
    })
    .select(EVENT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidateDashboard();
  return mapEvent(data as EventRow);
}

export async function updateEvent(
  id: string,
  input: { title: string; eventDate: Date; isRecurring: boolean }
): Promise<EventItem> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("events")
    .update({
      title: input.title,
      event_date: toDateKey(input.eventDate),
      is_recurring: input.isRecurring,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select(EVENT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidateDashboard();
  return mapEvent(data as EventRow);
}

export async function deleteEvent(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("events").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateDashboard();
}
