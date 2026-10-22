import { connection } from "next/server";
import { getHabits, getHabitLogs } from "@/app/actions/habits";
import { getHabitQuotes } from "@/app/actions/habitQuotes";
import { HabitsPageContent } from "@/components/habits/HabitsPageContent";
import { TopBar } from "@/components/layout/TopBar";
import { getCurrentUserEmail } from "@/lib/supabase/require-user";

export async function HabitsContent() {
  await connection();
  const [habits, habitLogs, quotes, email] = await Promise.all([
    getHabits(),
    getHabitLogs(),
    getHabitQuotes(),
    getCurrentUserEmail(),
  ]);

  return (
    <div className="min-h-screen bg-slate-100/70">
      <TopBar title="Dựng thói quen" email={email} />
      <HabitsPageContent habits={habits} habitLogs={habitLogs} quotes={quotes} />
    </div>
  );
}
