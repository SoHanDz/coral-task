"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createHabitQuote, deleteHabitQuote, updateHabitQuote } from "@/app/actions/habitQuotes";
import type { HabitQuote } from "@/lib/habits/types";

interface QuoteManagerDialogProps {
  quotes: HabitQuote[];
  /** Omit when the dialog is opened externally via `open`/`onOpenChange`. */
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function QuoteManagerDialog({ quotes, trigger, open, onOpenChange }: QuoteManagerDialogProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  function handleAdd() {
    if (!newText.trim()) return;
    const text = newText.trim();
    setNewText("");
    startTransition(async () => {
      await createHabitQuote(text);
      router.refresh();
    });
  }

  function handleSaveEdit(id: string) {
    if (!editingText.trim()) return;
    const text = editingText.trim();
    setEditingId(null);
    startTransition(async () => {
      await updateHabitQuote(id, text);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteHabitQuote(id);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-[480px] w-full p-6 bg-white rounded-2xl border-none shadow-xl">
        <DialogHeader>
          <DialogTitle>Quản lý quote</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {quotes.length > 0 && (
            <ul className="flex flex-col gap-2">
              {quotes.map((quote) => (
                <li key={quote.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  {editingId === quote.id ? (
                    <Input
                      className="min-w-0 flex-1"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(quote.id);
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left text-sm text-slate-700"
                      onClick={() => {
                        setEditingId(quote.id);
                        setEditingText(quote.text);
                      }}
                    >
                      {quote.text}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Xóa quote"
                    className="shrink-0 text-slate-400 hover:text-destructive"
                    onClick={() => handleDelete(quote.id)}
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <Input
              className="min-w-0 flex-1"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Thêm quote mới"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
            <Button type="button" variant="outline" size="icon" onClick={handleAdd}>
              <PlusIcon className="size-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
