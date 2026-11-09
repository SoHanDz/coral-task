"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/require-user";
import { ENGLISH_TEMPLATE } from "@/lib/journal/templates";
import type {
  EntryValues,
  FieldType,
  Journal,
  JournalEntries,
  JournalField,
} from "@/lib/journal/types";

interface JournalRow {
  id: string;
  template_key: string;
  name: string;
  emoji: string;
  fields: JournalField[];
}

const JOURNAL_COLUMNS = "id, template_key, name, emoji, fields";
const FIELD_TYPES: FieldType[] = ["longtext", "number", "tags", "mood"];
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function revalidate() {
  revalidatePath("/notes");
}

function toJournal(row: JournalRow): Journal {
  return {
    id: row.id,
    templateKey: row.template_key,
    name: row.name,
    emoji: row.emoji,
    fields: row.fields,
  };
}

function assertEntryDate(entryDate: string) {
  const parsed = new Date(`${entryDate}T00:00:00Z`);
  const valid =
    DATE_KEY.test(entryDate) &&
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === entryDate;
  if (!valid) throw new Error("Ngày không hợp lệ");
  // Client enforces the strict local-day rule; this only blocks far-future dates.
  const tomorrowUtc = new Date();
  tomorrowUtc.setUTCDate(tomorrowUtc.getUTCDate() + 1);
  if (entryDate > tomorrowUtc.toISOString().slice(0, 10)) {
    throw new Error("Không thể ghi cho ngày trong tương lai");
  }
}

function assertValues(values: EntryValues) {
  for (const value of Object.values(values)) {
    if (typeof value === "string") {
      if (value.length > 10_000) throw new Error("Nội dung quá dài");
    } else if (typeof value === "number") {
      if (!Number.isFinite(value) || value < 0 || value > 1_000_000) {
        throw new Error("Số không hợp lệ");
      }
    } else if (Array.isArray(value)) {
      if (
        value.length > 50 ||
        value.some((t) => typeof t !== "string" || t.length > 80)
      ) {
        throw new Error("Danh sách không hợp lệ");
      }
    } else {
      throw new Error("Giá trị không hợp lệ");
    }
  }
}

function assertFields(fields: JournalField[]) {
  if (fields.length < 1 || fields.length > 30) {
    throw new Error("Cần từ 1 đến 30 mục ghi");
  }
  for (const f of fields) {
    const label = typeof f.label === "string" ? f.label.trim() : "";
    if (label.length < 1 || label.length > 80) {
      throw new Error("Tên mục ghi cần từ 1 đến 80 ký tự");
    }
    if (!FIELD_TYPES.includes(f.type)) throw new Error("Loại mục ghi không hợp lệ");
  }
}

export async function getJournal(): Promise<Journal> {
  const { supabase, userId } = await requireUser();

  const { error: upsertError } = await supabase.from("journals").upsert(
    {
      user_id: userId,
      template_key: ENGLISH_TEMPLATE.templateKey,
      name: ENGLISH_TEMPLATE.name,
      emoji: ENGLISH_TEMPLATE.emoji,
      fields: ENGLISH_TEMPLATE.fields,
    },
    { onConflict: "user_id,template_key", ignoreDuplicates: true },
  );
  if (upsertError) throw new Error(upsertError.message);

  const { data, error } = await supabase
    .from("journals")
    .select(JOURNAL_COLUMNS)
    .eq("user_id", userId)
    .eq("template_key", ENGLISH_TEMPLATE.templateKey)
    .single();
  if (error) throw new Error(error.message);
  return toJournal(data as JournalRow);
}

export async function getJournalEntries(
  journalId: string,
): Promise<JournalEntries> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("entry_date, values")
    .eq("user_id", userId)
    .eq("journal_id", journalId);
  if (error) throw new Error(error.message);

  const entries: JournalEntries = {};
  for (const row of data as { entry_date: string; values: EntryValues }[]) {
    entries[row.entry_date] = row.values;
  }
  return entries;
}

export async function saveJournalEntry(
  journalId: string,
  entryDate: string,
  values: EntryValues,
): Promise<void> {
  assertEntryDate(entryDate);
  assertValues(values);
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("journal_entries").upsert(
    {
      journal_id: journalId,
      user_id: userId,
      entry_date: entryDate,
      values,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "journal_id,entry_date" },
  );
  if (error) throw new Error(error.message);
  revalidate();
}

export async function updateJournalFields(
  journalId: string,
  fields: JournalField[],
): Promise<void> {
  assertFields(fields);
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("journals")
    .update({ fields })
    .eq("id", journalId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidate();
}
