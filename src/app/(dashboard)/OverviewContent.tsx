import { connection } from "next/server";
import { getTasks } from "@/app/actions/tasks";
import { getEvents } from "@/app/actions/events";
import { getCurrentUserEmail } from "@/lib/supabase/require-user";
import { isOverdue } from "@/lib/tasks/overdue";
import { OverviewBoard } from "@/components/dashboard/OverviewBoard";
import { TopBar } from "@/components/layout/TopBar";

export async function OverviewContent() {
  await connection();
  const [tasks, events, email] = await Promise.all([getTasks(), getEvents(), getCurrentUserEmail()]);
  const overdueCount = tasks.filter((task) => task.status === "pending" && isOverdue(task)).length;

  return (
    <div className="min-h-screen bg-slate-100/70">
      <TopBar email={email} overdueCount={overdueCount} />

      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        <OverviewBoard tasks={tasks} events={events} />
      </div>
    </div>
  );
}
