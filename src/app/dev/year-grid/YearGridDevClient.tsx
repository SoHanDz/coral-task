"use client";

import { addDays } from "date-fns";
import { useEvents } from "@/hooks/use-events";
import { YearGrid } from "@/components/year-grid/YearGrid";
import { MonthPreviewCard } from "@/components/year-grid/MonthPreviewCard";
import { EventList } from "@/components/events/EventList";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import type { EventItem } from "@/lib/events/types";

const today = new Date();

const seedEvents: EventItem[] = [
  { id: "seed-1", title: "Sinh nhật Lan", eventDate: addDays(today, 15), isRecurring: true },
  { id: "seed-2", title: "Kỷ niệm công ty", eventDate: addDays(today, 60), isRecurring: false },
];

export function YearGridDevClient() {
  const { events, addEvent } = useEvents(seedEvents);

  return (
    <div className="flex min-h-screen flex-col items-center gap-10 bg-background p-4 sm:p-10">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Sự kiện đặc biệt</h2>
          <CreateEventModal onCreate={addEvent} />
        </div>
        <EventList events={events} />
      </div>

      <MonthPreviewCard events={events} />
      <YearGrid className="w-full max-w-4xl" events={events} />
    </div>
  );
}
