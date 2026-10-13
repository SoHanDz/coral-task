"use client";

import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  id?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
}

function toTimeInput(date: Date): string {
  return format(date, "HH:mm");
}

function combine(day: Date, timeInput: string): Date {
  const [hours, minutes] = timeInput.split(":").map(Number);
  const combined = new Date(day);
  combined.setHours(hours || 0, minutes || 0, 0, 0);
  return combined;
}

/** Date + time picker: a calendar for the day, a native time input for the hour. */
export function DateTimePicker({ id, value, onChange, className }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn("w-full justify-start gap-2 text-left font-normal", !value && "text-muted-foreground", className)}
          >
            <CalendarIcon className="size-4 shrink-0" />
            {value ? format(value, "dd/MM/yyyy HH:mm") : "Chọn ngày giờ"}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={vi}
          selected={value ?? undefined}
          defaultMonth={value ?? undefined}
          onSelect={(date) => {
            if (!date) return onChange(null);
            onChange(combine(date, value ? toTimeInput(value) : "23:59"));
          }}
        />
        <div className="flex items-center gap-2 border-t p-3">
          <Input
            type="time"
            value={value ? toTimeInput(value) : "23:59"}
            onChange={(e) => value && onChange(combine(value, e.target.value))}
            className="w-full"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
