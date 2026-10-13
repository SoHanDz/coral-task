import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DashboardCalendarCard } from "@/components/dashboard/DashboardCalendarCard";
import { Card, CardContent } from "@/components/ui/card";
import type { Task } from "@/lib/tasks/types";

interface TodayWidgetProps {
  tasks: Task[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export function TodayWidget({ tasks, selectedDate, onSelectDate }: TodayWidgetProps) {
  return (
    <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
      <CardContent className="flex flex-col gap-5 px-8 py-8">
        <DashboardCalendarCard tasks={tasks} selectedDate={selectedDate} onSelectDate={onSelectDate} />

        <Link
          href="/analytics"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100"
        >
          Xem lịch năm & sự kiện
          <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
