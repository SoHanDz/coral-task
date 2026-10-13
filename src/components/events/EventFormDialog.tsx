"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EventItem } from "@/lib/events/types";

interface EventFormDialogProps {
  trigger: ReactElement;
  /** Pass an existing event to edit it (and allow deleting it); omit to create a new one. */
  event?: EventItem;
  onSubmit: (input: { title: string; eventDate: Date; isRecurring: boolean }) => void;
  onDelete?: (id: string) => void;
}

export function EventFormDialog({ trigger, event, onSubmit, onDelete }: EventFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(event?.title ?? "");
  const [eventDate, setEventDate] = useState<Date | null>(event?.eventDate ?? null);
  const [isRecurring, setIsRecurring] = useState(event?.isRecurring ?? false);

  // Reset the form to the current event's values (or blank) each time the dialog opens.
  function handleOpenChange(next: boolean) {
    if (next) {
      setTitle(event?.title ?? "");
      setEventDate(event?.eventDate ?? null);
      setIsRecurring(event?.isRecurring ?? false);
    }
    setOpen(next);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;

    onSubmit({ title: title.trim(), eventDate, isRecurring });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{event ? "Sửa sự kiện" : "Sự kiện đặc biệt mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-title">Tên sự kiện</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sinh nhật, kỷ niệm,..."
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-date">Ngày diễn ra</Label>
            <DatePicker
              id="event-date"
              value={eventDate}
              onChange={setEventDate}
              placeholder="dd/mm/yyyy"
            />
          </div>
          <Label htmlFor="event-recurring" className="flex items-center gap-2 font-normal">
            <Checkbox
              id="event-recurring"
              checked={isRecurring}
              onCheckedChange={(checked) => setIsRecurring(checked === true)}
            />
            Lặp lại hàng năm
          </Label>
          <div className="flex items-center gap-2">
            <Button type="submit" className="flex-1">
              {event ? "Lưu thay đổi" : "Lưu sự kiện"}
            </Button>
            {event && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label="Xóa sự kiện"
                onClick={() => {
                  onDelete(event.id);
                  setOpen(false);
                }}
              >
                <Trash2Icon className="size-4" />
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
