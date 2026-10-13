"use client";

import { useState } from "react";
import { TasksOverviewSection } from "@/components/tasks/TasksOverviewSection";
import { TodayWidget } from "@/components/dashboard/TodayWidget";
import { EventsListSection } from "@/components/events/EventsListSection";
import { Card, CardContent } from "@/components/ui/card";
import type { EventItem } from "@/lib/events/types";
import type { Task } from "@/lib/tasks/types";

interface OverviewBoardProps {
  tasks: Task[];
  events: EventItem[];
}

export function OverviewBoard({ tasks, events }: OverviewBoardProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start">
      <div className="flex flex-col gap-8 lg:col-span-2">
        <TasksOverviewSection tasks={tasks} selectedDate={selectedDate} />
      </div>

      <div className="flex flex-col gap-8 lg:sticky lg:top-8">
        <TodayWidget tasks={tasks} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
          <CardContent className="px-8 py-8">
            <EventsListSection events={events} maxDaysAhead={7} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
