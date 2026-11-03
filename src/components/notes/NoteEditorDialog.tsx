"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { CheckIcon, ImageIcon, PinIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  NOTE_COLORS,
  NOTE_IMAGE_MAX_BYTES,
  type Note,
} from "@/lib/notes/types";

export interface NoteDraft {
  title: string;
  content: string;
  color: string;
  tags: string[];
  isPinned: boolean;
  /** A newly picked image to upload, if any. */
  imageFile: File | null;
  /** True when the note's existing image should be dropped (and no new one picked). */
  imageRemoved: boolean;
}

interface NoteEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Undefined = creating a new note. */
  note?: Note;
  onSave: (draft: NoteDraft) => void;
  onDelete?: (id: string) => void;
}

export function NoteEditorDialog(props: NoteEditorDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-lg"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {props.note ? "Sửa ghi chú" : "Ghi chú mới"}
        </DialogTitle>
        {/* Remount the form each time the dialog opens so state resets from `note`. */}
        {props.open && <EditorForm key={props.note?.id ?? "new"} {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function normalizeTag(raw: string) {
  return raw.trim().replace(/^#/, "").toLowerCase();
}

function EditorForm({
  note,
  onOpenChange,
  onSave,
  onDelete,
}: NoteEditorDialogProps) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [image, setImage] = useState<string | null>(note?.imageUrl ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [color, setColor] = useState<string>(
    note?.color ?? NOTE_COLORS[0].value,
  );
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [isPinned, setIsPinned] = useState(note?.isPinned ?? false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addTag() {
    const tag = normalizeTag(tagInput);
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setTagInput("");
  }

  function handleTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags(tags.slice(0, -1));
    }
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > NOTE_IMAGE_MAX_BYTES) {
      setImageError("Ảnh tối đa 5MB.");
      return;
    }
    setImageError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImage(null);
    setImageFile(null);
    setImageError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const pending = normalizeTag(tagInput);
    const finalTags =
      pending && !tags.includes(pending) ? [...tags, pending] : tags;
    if (!title.trim() && !content.trim() && !image) {
      onOpenChange(false);
      return;
    }
    onSave({
      title: title.trim(),
      content: content.trim(),
      color,
      tags: finalTags,
      isPinned,
      imageFile,
      imageRemoved: !image && !!note?.imagePath,
    });
    onOpenChange(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ backgroundColor: color }}
      className="flex flex-col text-slate-800"
    >
      {image && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Ảnh ghi chú"
            className="max-h-72 w-full object-cover"
          />
          <button
            type="button"
            aria-label="Xoá ảnh"
            onClick={removeImage}
            className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-white/80 hover:bg-white"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề (tuỳ chọn)"
            className="flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-slate-500/70"
          />
          <button
            type="button"
            aria-label={isPinned ? "Bỏ ghim" : "Ghim"}
            onClick={() => setIsPinned(!isPinned)}
            className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-black/10"
          >
            <PinIcon className={cn("size-4", isPinned && "fill-slate-800")} />
          </button>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ghi chú..."
          rows={6}
          autoFocus
          className="resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-slate-500/70"
        />

        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-black/10 py-0.5 pl-2.5 pr-1 text-xs font-medium"
            >
              #{tag}
              <button
                type="button"
                aria-label={`Xoá tag ${tag}`}
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                className="flex size-4 items-center justify-center rounded-full hover:bg-black/15"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKey}
            onBlur={addTag}
            placeholder="Thêm tag..."
            className="min-w-24 flex-1 bg-transparent text-xs outline-none placeholder:text-slate-500/70"
          />
        </div>
      </div>

      {imageError && (
        <p className="px-4 pb-2 text-xs font-medium text-red-700">
          {imageError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 px-3 py-2">
        <div className="flex items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            aria-label="Thêm ảnh"
            onClick={() => fileRef.current?.click()}
            className="flex size-8 items-center justify-center rounded-full hover:bg-black/10"
          >
            <ImageIcon className="size-4" />
          </button>
          <div
            className="mx-1 flex items-center gap-1"
            role="radiogroup"
            aria-label="Màu nền"
          >
            {NOTE_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={color === c.value}
                aria-label={c.name}
                title={c.name}
                onClick={() => setColor(c.value)}
                style={{ backgroundColor: c.value }}
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border border-black/15 transition-transform hover:scale-110",
                  color === c.value && "ring-2 ring-slate-700 ring-offset-1",
                )}
              >
                {color === c.value && <CheckIcon className="size-3" />}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {note && onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Xoá ghi chú"
              onClick={() => {
                onDelete(note.id);
                onOpenChange(false);
              }}
            >
              <Trash2Icon className="size-4" />
            </Button>
          )}
          <Button type="submit" size="sm">
            Xong
          </Button>
        </div>
      </div>
    </form>
  );
}
