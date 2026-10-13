"use client";

import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  id?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: (date: Date) => boolean;
}

/** Calendar-based date picker. Displays and lets the user pick dd/MM/yyyy instead of typing it. */
export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Chọn ngày",
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start gap-2 text-left font-normal",
              !value && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="size-4 shrink-0" />
            {value ? format(value, "dd/MM/yyyy") : placeholder}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={vi}
          selected={value ?? undefined}
          defaultMonth={value ?? undefined}
          disabled={disabled}
          onSelect={(date) => {
            onChange(date ?? null);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
