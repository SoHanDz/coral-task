import { connection } from "next/server";
import { getHabits, getHabitLogs } from "@/app/actions/habits";
import { HabitsPageContent } from "@/components/habits/HabitsPageContent";
import { getCurrentUserEmail } from "@/lib/supabase/require-user";

export async function HabitsContent() {
  await connection();
  const [habits, habitLogs, email] = await Promise.all([getHabits(), getHabitLogs(), getCurrentUserEmail()]);

  return (
    <div className="min-h-screen bg-slate-100/70">
      <HabitsPageContent habits={habits} habitLogs={habitLogs} email={email} />
    </div>
  );
}
