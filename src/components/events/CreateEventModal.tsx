"use client";

import { Button } from "@/components/ui/button";
import { EventFormDialog } from "@/components/events/EventFormDialog";

interface CreateEventModalProps {
  onCreate: (input: { title: string; eventDate: Date; isRecurring: boolean }) => void;
}

export function CreateEventModal({ onCreate }: CreateEventModalProps) {
  return <EventFormDialog trigger={<Button type="button">Thêm sự kiện</Button>} onSubmit={onCreate} />;
}
