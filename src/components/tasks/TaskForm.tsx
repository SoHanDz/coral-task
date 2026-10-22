"use client";

import { useState, type FormEvent } from "react";
import { endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TaskFormProps {
  onCreate: (input: { title: string; startDate: Date; endDate: Date }) => void;
}

export function TaskForm({ onCreate }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(endOfDay(new Date()));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    onCreate({ title: title.trim(), startDate, endDate });

    setTitle("");
    setStartDate(new Date());
    setEndDate(endOfDay(new Date()));
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
        <Label htmlFor="task-start-date" className="text-sm text-slate-600">
          Bắt đầu
        </Label>
        <DatePicker
          id="task-start-date"
          value={startDate}
          onChange={(date) => setStartDate(date ?? new Date())}
          placeholder="dd/mm/yyyy"
          className="bg-white"
        />
      </div>

      <div className="flex w-40 flex-col gap-1.5">
        <Label htmlFor="task-end-date" className="text-sm text-slate-600">
          Kết thúc
        </Label>
        <DatePicker
          id="task-end-date"
          value={endDate}
          onChange={(date) => setEndDate(date ?? endOfDay(new Date()))}
          placeholder="dd/mm/yyyy"
          className="bg-white"
        />
      </div>

      <Button type="submit">Thêm công việc</Button>
    </form>
  );
}
