"use client";

import { useState } from "react";
import type { EventItem } from "@/lib/events/types";

export function useEvents(initialEvents: EventItem[] = []) {
  const [events, setEvents] = useState<EventItem[]>(initialEvents);

  function addEvent(input: { title: string; eventDate: Date; isRecurring?: boolean }) {
    const event: EventItem = {
      id: crypto.randomUUID(),
      title: input.title,
      eventDate: input.eventDate,
      isRecurring: input.isRecurring ?? false,
    };
    setEvents((prev) => [...prev, event]);
  }

  return { events, addEvent };
}
