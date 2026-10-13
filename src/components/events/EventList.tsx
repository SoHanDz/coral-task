"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventFormDialog } from "@/components/events/EventFormDialog";
import { daysRemaining, formatCountdown } from "@/lib/events/countdown";
import { nextOccurrence } from "@/lib/events/occurrence";
import type { EventItem } from "@/lib/events/types";

interface EventListProps {
  events: EventItem[];
  referenceDate?: Date;
  /** Cap the number of upcoming events shown (e.g. for a compact widget). Ignored if pageSize is set. */
  limit?: number;
  /** Split the list into pages of this size with Prev/Next controls, instead of a hard cap. */
  pageSize?: number;
  onEdit?: (id: string, input: { title: string; eventDate: Date; isRecurring: boolean }) => void;
  onDelete?: (id: string) => void;
}

export function EventList({ events, referenceDate, limit, pageSize, onEdit, onDelete }: EventListProps) {
  const [page, setPage] = useState(1);

  if (events.length === 0) {
    return <p className="text-sm text-slate-500">Chưa có sự kiện nào.</p>;
  }

  const sorted = [...events].sort(
    (a, b) => nextOccurrence(a, referenceDate).getTime() - nextOccurrence(b, referenceDate).getTime()
  );

  const totalPages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const visible = pageSize
    ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : limit
      ? sorted.slice(0, limit)
      : sorted;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {visible.map((event) => {
          const row = (
            <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-medium text-slate-800">
                  <span className="min-w-0 truncate">{event.title}</span>
                  {event.isRecurring && (
                    <Repeat className="size-3.5 shrink-0 text-slate-400" aria-label="Lặp lại hàng năm" />
                  )}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {format(nextOccurrence(event, referenceDate), "dd/MM/yyyy")}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {formatCountdown(daysRemaining(event, referenceDate))}
              </Badge>
            </div>
          );

          return (
            <li
              key={event.id}
              className="overflow-hidden rounded-lg bg-slate-50 text-slate-700 transition-colors duration-200 hover:bg-slate-100"
            >
              {onEdit ? (
                <EventFormDialog
                  event={event}
                  onSubmit={(input) => onEdit(event.id, input)}
                  onDelete={onDelete}
                  trigger={<button type="button" className="w-full p-4">{row}</button>}
                />
              ) : (
                <div className="p-4">{row}</div>
              )}
            </li>
          );
        })}
      </ul>

      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Trang trước"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-slate-500">
            Trang {currentPage}/{totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Trang sau"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
