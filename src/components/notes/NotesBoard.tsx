"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, SearchIcon, StickyNoteIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteCard } from "@/components/notes/NoteCard";
import {
  NoteEditorDialog,
  type NoteDraft,
} from "@/components/notes/NoteEditorDialog";
import {
  createNote,
  deleteNote,
  toggleNotePinned,
  updateNote,
} from "@/app/actions/notes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  NOTE_IMAGES_BUCKET,
  type Note,
  type NoteInput,
} from "@/lib/notes/types";

function matches(note: Note, query: string, tag: string | null) {
  if (tag && !note.tags.includes(tag)) return false;
  if (!query) return true;
  return [note.title, note.content, ...note.tags].some((s) =>
    s.toLowerCase().includes(query),
  );
}

interface NotesBoardProps {
  notes: Note[];
  userId: string;
}

type OptimisticAction =
  { type: "upsert"; note: Note } | { type: "delete"; id: string };

function applyOptimistic(notes: Note[], action: OptimisticAction): Note[] {
  if (action.type === "delete") return notes.filter((n) => n.id !== action.id);
  const exists = notes.some((n) => n.id === action.note.id);
  return exists
    ? notes.map((n) => (n.id === action.note.id ? action.note : n))
    : [action.note, ...notes];
}

function imageExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return file.type.split("/")[1] ?? "jpg";
}

export function NotesBoard({ notes: serverNotes, userId }: NotesBoardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Shows the change instantly (dimmed + spinner on the card) and falls back to
  // server data once the transition settles, so a failed save simply reverts.
  const [notes, setOptimistic] = useOptimistic(serverNotes, applyOptimistic);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Note | undefined>();

  const normalizedQuery = query.trim().toLowerCase();
  const allTags = useMemo(
    () => [...new Set(notes.flatMap((n) => n.tags))].sort(),
    [notes],
  );
  const visible = useMemo(
    () => notes.filter((n) => matches(n, normalizedQuery, activeTag)),
    [notes, normalizedQuery, activeTag],
  );
  const pinned = visible.filter((n) => n.isPinned);
  const others = visible.filter((n) => !n.isPinned);

  function openEditor(note?: Note) {
    setEditing(note);
    setEditorOpen(true);
  }

  /** Runs a mutation, then refreshes server data; surfaces failures instead of swallowing them. */
  function run(optimistic: OptimisticAction, task: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      setOptimistic(optimistic);
      try {
        await task();
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Có lỗi xảy ra, thử lại nhé.",
        );
      }
    });
  }

  function handleSave(draft: NoteDraft) {
    const target = editing;
    const previewUrl = draft.imageFile
      ? URL.createObjectURL(draft.imageFile)
      : draft.imageRemoved
        ? null
        : (target?.imageUrl ?? null);
    const optimisticNote: Note = {
      id: target?.id ?? crypto.randomUUID(),
      title: draft.title,
      content: draft.content,
      imagePath: target?.imagePath ?? null,
      imageUrl: previewUrl,
      color: draft.color,
      tags: draft.tags,
      isPinned: draft.isPinned,
      createdAt: target?.createdAt ?? new Date().toISOString(),
      pending: true,
    };
    run({ type: "upsert", note: optimisticNote }, async () => {
      let imagePath = draft.imageRemoved ? null : (target?.imagePath ?? null);

      if (draft.imageFile) {
        // Upload straight from the browser (RLS scopes it to this user's folder);
        // avoids routing the file through a server action's body size limit.
        const path = `${userId}/${crypto.randomUUID()}.${imageExtension(draft.imageFile)}`;
        const { error: uploadError } = await createClient()
          .storage.from(NOTE_IMAGES_BUCKET)
          .upload(path, draft.imageFile, { contentType: draft.imageFile.type });
        if (uploadError)
          throw new Error(`Không tải được ảnh: ${uploadError.message}`);
        imagePath = path;
      }

      const input: NoteInput = {
        title: draft.title,
        content: draft.content,
        color: draft.color,
        tags: draft.tags,
        isPinned: draft.isPinned,
        imagePath,
      };
      try {
        if (target) await updateNote(target.id, input);
        else await createNote(input);
      } catch (e) {
        // Don't leave a freshly uploaded image orphaned if the save failed.
        if (draft.imageFile && imagePath) {
          await createClient()
            .storage.from(NOTE_IMAGES_BUCKET)
            .remove([imagePath]);
        }
        throw e;
      }
    });
  }

  function togglePinned(note: Note) {
    run(
      {
        type: "upsert",
        note: { ...note, isPinned: !note.isPinned, pending: true },
      },
      () => toggleNotePinned(note.id, !note.isPinned),
    );
  }

  function renderGrid(list: Note[]) {
    return (
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {list.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onOpen={openEditor}
            onTogglePinned={togglePinned}
            onTagClick={setActiveTag}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tiêu đề, nội dung hoặc tag..."
              className="pl-9"
            />
          </div>
          <Button type="button" onClick={() => openEditor()}>
            <PlusIcon className="size-4" />
            Ghi chú mới
          </Button>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                aria-pressed={activeTag === tag}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200",
                  activeTag === tag
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                #{tag}
                {activeTag === tag && <XIcon className="size-3" />}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          <StickyNoteIcon className="size-8" />
          {notes.length === 0
            ? "Chưa có ghi chú nào. Bấm “Ghi chú mới” để bắt đầu."
            : "Không tìm thấy ghi chú phù hợp."}
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Đã ghim
              </h2>
              {renderGrid(pinned)}
            </section>
          )}
          {others.length > 0 && (
            <section className="flex flex-col gap-3">
              {pinned.length > 0 && (
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Khác
                </h2>
              )}
              {renderGrid(others)}
            </section>
          )}
        </>
      )}

      <NoteEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        note={editing}
        onSave={handleSave}
        onDelete={(id) => run({ type: "delete", id }, () => deleteNote(id))}
      />
    </div>
  );
}
