import { getTasks } from "@/app/actions/tasks";
import { getEvents } from "@/app/actions/events";
import { EventsListSection } from "@/components/events/EventsListSection";
import { TopBar } from "@/components/layout/TopBar";
import { YearGrid } from "@/components/year-grid/YearGrid";
import { isOverdue } from "@/lib/tasks/overdue";

export async function AnalyticsContent() {
  const [tasks, events] = await Promise.all([getTasks(), getEvents()]);
  const overdueCount = tasks.filter((task) => isOverdue(task)).length;

  return (
    <div className="min-h-screen bg-slate-100/70">
      <TopBar title="Lịch & Sự kiện" overdueCount={overdueCount} />

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-3 lg:items-start">
        <YearGrid events={events} tasks={tasks} className="w-full lg:col-span-2" />

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:sticky lg:top-6">
          <EventsListSection events={events} title="Sự kiện đặc biệt" pageSize={5} />
        </div>
      </div>
    </div>
  );
}
