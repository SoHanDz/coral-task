"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface HabitFormInput {
  title: string;
  description: string | null;
  dueTime: string;
}

interface HabitFormDialogProps {
  trigger: ReactElement;
  onSubmit: (input: HabitFormInput) => void;
}

/** Create-only dialog for a new daily habit, opened from the habit-tracking page's own "+ Thêm thói quen" button. */
export function HabitFormDialog({ trigger, onSubmit }: HabitFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueTime, setDueTime] = useState("23:59");

  function resetForm() {
    setTitle("");
    setDescription("");
    setDueTime("23:59");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      dueTime,
    });
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) resetForm();
        setOpen(next);
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-[480px] w-full p-6 bg-white rounded-2xl border-none shadow-xl">
        <DialogHeader>
          <DialogTitle>Thói quen mới</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="habit-title">Tiêu đề</Label>
            <Input
              id="habit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tên thói quen"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="habit-description">Mô tả</Label>
            <Textarea
              id="habit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú thêm (không bắt buộc)"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="habit-due-time">Hạn chót (giờ)</Label>
            <Input
              id="habit-due-time"
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              required
            />
          </div>
          <Button type="submit">Thêm thói quen</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
