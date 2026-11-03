"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/require-user";
import {
  NOTE_IMAGES_BUCKET,
  type Note,
  type NoteInput,
} from "@/lib/notes/types";

interface NoteRow {
  id: string;
  title: string;
  content: string;
  image_path: string | null;
  color: string;
  tags: string[];
  is_pinned: boolean;
  created_at: string;
}

const NOTE_COLUMNS =
  "id, title, content, image_path, color, tags, is_pinned, created_at";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function revalidateNotes() {
  revalidatePath("/notes");
}

/** Paths must live under the caller's own folder; RLS enforces it too, this fails fast. */
function assertOwnPath(path: string | null, userId: string) {
  if (path && !path.startsWith(`${userId}/`)) {
    throw new Error("Đường dẫn ảnh không hợp lệ.");
  }
}

function sanitizeTags(tags: string[]): string[] {
  return [
    ...new Set(
      tags.map((t) => t.trim().replace(/^#/, "").toLowerCase()).filter(Boolean),
    ),
  ];
}

export async function getNotes(): Promise<Note[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("notes")
    .select(NOTE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = data as NoteRow[];

  const paths = rows.map((r) => r.image_path).filter((p): p is string => !!p);
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from(NOTE_IMAGES_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (signError) throw new Error(signError.message);
    for (const item of signed) {
      if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    imagePath: row.image_path,
    imageUrl: row.image_path ? (urlByPath.get(row.image_path) ?? null) : null,
    color: row.color,
    tags: row.tags,
    isPinned: row.is_pinned,
    createdAt: row.created_at,
  }));
}

export async function createNote(input: NoteInput): Promise<void> {
  const { supabase, userId } = await requireUser();
  assertOwnPath(input.imagePath, userId);

  const { error } = await supabase.from("notes").insert({
    user_id: userId,
    title: input.title,
    content: input.content,
    image_path: input.imagePath,
    color: input.color,
    tags: sanitizeTags(input.tags),
    is_pinned: input.isPinned,
  });

  if (error) throw new Error(error.message);
  revalidateNotes();
}

export async function updateNote(id: string, input: NoteInput): Promise<void> {
  const { supabase, userId } = await requireUser();
  assertOwnPath(input.imagePath, userId);

  const { data: existing, error: fetchError } = await supabase
    .from("notes")
    .select("image_path")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("notes")
    .update({
      title: input.title,
      content: input.content,
      image_path: input.imagePath,
      color: input.color,
      tags: sanitizeTags(input.tags),
      is_pinned: input.isPinned,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  // The image was replaced or removed: drop the orphaned object.
  const oldPath = existing.image_path as string | null;
  if (oldPath && oldPath !== input.imagePath) {
    await supabase.storage.from(NOTE_IMAGES_BUCKET).remove([oldPath]);
  }
  revalidateNotes();
}

export async function deleteNote(id: string): Promise<void> {
  const { supabase, userId } = await requireUser();

  const { data: existing } = await supabase
    .from("notes")
    .select("image_path")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  const path = existing?.image_path as string | null | undefined;
  if (path) await supabase.storage.from(NOTE_IMAGES_BUCKET).remove([path]);
  revalidateNotes();
}

export async function toggleNotePinned(
  id: string,
  isPinned: boolean,
): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("notes")
    .update({ is_pinned: isPinned })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidateNotes();
}
