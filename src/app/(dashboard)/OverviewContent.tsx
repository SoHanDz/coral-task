import { connection } from "next/server";
import { getTasks } from "@/app/actions/tasks";
import { getRecurringCompletions, getRecurringTasks } from "@/app/actions/recurring-tasks";
import { getHabits, getHabitLogs } from "@/app/actions/habits";
import { getTaskDayOrders } from "@/app/actions/task-orders";
import { getEvents } from "@/app/actions/events";
import { getCurrentUserEmail } from "@/lib/supabase/require-user";
import { OverviewBoard } from "@/components/dashboard/OverviewBoard";
import { TopBar } from "@/components/layout/TopBar";

export async function OverviewContent() {
  await connection();
  const [tasks, habits, habitLogs, events, email, recurringTasks, occurrenceCompletions, taskDayOrders] = await Promise.all([
    getTasks(),
    getHabits(),
    getHabitLogs(),
    getEvents(),
    getCurrentUserEmail(),
    getRecurringTasks(),
    getRecurringCompletions(),
    getTaskDayOrders(),
  ]);

  return (
    <div className="min-h-screen bg-slate-100/70">
      <TopBar email={email} />

      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        <OverviewBoard
          tasks={tasks}
          habits={habits}
          habitLogs={habitLogs}
          events={events}
          recurringTasks={recurringTasks}
          occurrenceCompletions={occurrenceCompletions}
          taskDayOrders={taskDayOrders}
        />
      </div>
    </div>
  );
}
