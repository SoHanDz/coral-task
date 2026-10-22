import { connection } from "next/server";
import { getHabits, getHabitLogs } from "@/app/actions/habits";
import { getHabitQuotes } from "@/app/actions/habitQuotes";
import { HabitsPageContent } from "@/components/habits/HabitsPageContent";
import { TopBar } from "@/components/layout/TopBar";

export async function HabitsContent() {
  await connection();
  const [habits, habitLogs, quotes] = await Promise.all([getHabits(), getHabitLogs(), getHabitQuotes()]);

  return (
    <div className="min-h-screen bg-slate-100/70">
      <TopBar title="Dựng thói quen" />
      <HabitsPageContent habits={habits} habitLogs={habitLogs} quotes={quotes} />
    </div>
  );
}
