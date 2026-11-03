"use client";

import { LoaderCircleIcon, PinIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/notes/types";

interface NoteCardProps {
  note: Note;
  onOpen: (note: Note) => void;
  onTogglePinned: (note: Note) => void;
  onTagClick: (tag: string) => void;
}

export function NoteCard({
  note,
  onOpen,
  onTogglePinned,
  onTagClick,
}: NoteCardProps) {
  return (
    <article
      onClick={() => !note.pending && onOpen(note)}
      style={{ backgroundColor: note.color }}
      aria-busy={note.pending || undefined}
      className={cn(
        "group relative mb-4 cursor-pointer break-inside-avoid overflow-hidden rounded-2xl border border-black/5 text-slate-800 shadow-sm transition-[box-shadow,opacity] duration-200 hover:shadow-md",
        note.pending && "pointer-events-none opacity-60",
      )}
    >
      {note.pending && (
        <span className="absolute inset-0 z-20 flex items-center justify-center">
          <LoaderCircleIcon className="size-6 animate-spin text-slate-700" />
        </span>
      )}
      <button
        type="button"
        aria-label={note.isPinned ? "Bỏ ghim" : "Ghim"}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePinned(note);
        }}
        className={cn(
          "absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-white/70 backdrop-blur transition-opacity duration-200 hover:bg-white",
          note.isPinned
            ? "opacity-100"
            : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
        )}
      >
        <PinIcon className={cn("size-4", note.isPinned && "fill-slate-800")} />
      </button>

      {note.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={note.imageUrl}
          alt={note.title || "Ảnh ghi chú"}
          className="w-full object-cover"
        />
      )}

      {(note.title || note.content || note.tags.length > 0) && (
        <div className="flex flex-col gap-2 p-4">
          {note.title && (
            <h3 className="pr-8 text-base font-semibold leading-snug">
              {note.title}
            </h3>
          )}
          {note.content && (
            <p className="line-clamp-8 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {note.content}
            </p>
          )}
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {note.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagClick(tag);
                  }}
                  className="rounded-full bg-black/10 px-2.5 py-0.5 text-xs font-medium text-slate-700 transition-colors duration-200 hover:bg-black/20"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
