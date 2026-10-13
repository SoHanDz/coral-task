"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEvent, deleteEvent, updateEvent } from "@/app/actions/events";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import { EventList } from "@/components/events/EventList";
import { daysRemaining } from "@/lib/events/countdown";
import type { EventItem } from "@/lib/events/types";

interface EventsListSectionProps {
  events: EventItem[];
  title?: string;
  limit?: number;
  /** Split the list into pages of this size with Prev/Next controls, instead of a hard cap. */
  pageSize?: number;
  /** Only show events whose next occurrence is within this many days (e.g. a compact "upcoming" widget). */
  maxDaysAhead?: number;
}

export function EventsListSection({
  events,
  title = "Sự kiện sắp tới",
  limit,
  pageSize,
  maxDaysAhead,
}: EventsListSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const visibleEvents =
    maxDaysAhead === undefined
      ? events
      : events.filter((event) => {
          const days = daysRemaining(event);
          return days >= 0 && days <= maxDaysAhead;
        });

  function handleCreate(input: { title: string; eventDate: Date; isRecurring: boolean }) {
    startTransition(async () => {
      await createEvent(input);
      router.refresh();
    });
  }

  function handleEdit(id: string, input: { title: string; eventDate: Date; isRecurring: boolean }) {
    startTransition(async () => {
      await updateEvent(id, input);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteEvent(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-700">{title}</h2>
        <CreateEventModal onCreate={handleCreate} />
      </div>
      <EventList
        events={visibleEvents}
        limit={limit}
        pageSize={pageSize}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      {isPending && <p className="text-xs text-slate-500">Đang cập nhật…</p>}
    </div>
  );
}
