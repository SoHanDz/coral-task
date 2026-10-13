"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RECURRENCE_LABELS, type Recurrence } from "@/lib/tasks/types";

interface TaskFormProps {
  onCreate: (input: { title: string; dueDate: Date | null; recurrence: Recurrence }) => void;
}

const RECURRENCE_OPTIONS = Object.keys(RECURRENCE_LABELS) as Recurrence[];

export function TaskForm({ onCreate }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [recurrence, setRecurrence] = useState<Recurrence>("none");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    onCreate({
      title: title.trim(),
      dueDate,
      recurrence,
    });

    setTitle("");
    setDueDate(null);
    setRecurrence("none");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-4"
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <Label htmlFor="task-title" className="text-sm text-slate-600">
          Tiêu đề
        </Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tên công việc"
          required
          className="bg-white"
        />
      </div>

      <div className="flex w-40 flex-col gap-1.5">
        <Label htmlFor="task-due-date" className="text-sm text-slate-600">
          Hạn chót
        </Label>
        <DatePicker
          id="task-due-date"
          value={dueDate}
          onChange={setDueDate}
          placeholder="dd/mm/yyyy"
          className="bg-white"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-recurrence" className="text-sm text-slate-600">
          Lặp lại
        </Label>
        <Select value={recurrence} onValueChange={(value) => setRecurrence(value as Recurrence)}>
          <SelectTrigger id="task-recurrence" className="bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECURRENCE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {RECURRENCE_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit">Thêm công việc</Button>
    </form>
  );
}
