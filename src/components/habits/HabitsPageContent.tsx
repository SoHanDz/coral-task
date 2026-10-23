"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHabit, deleteHabit, setHabitLogStatus, updateHabit } from "@/app/actions/habits";
import { Button } from "@/components/ui/button";
import { HabitChecklistItem } from "@/components/habits/HabitChecklistItem";
import { HabitDetailDialog } from "@/components/habits/HabitDetailDialog";
import { HabitFormDialog, type HabitFormInput } from "@/components/habits/HabitFormDialog";
import { HabitFrequencyRow } from "@/components/habits/HabitFrequencyRow";
import { HabitYearGrid } from "@/components/habits/HabitYearGrid";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toDateKey } from "@/lib/date/date-key";
import { getCurrentStreak, rankByFrequency } from "@/lib/habits/stats";
import type { Habit, HabitLog } from "@/lib/habits/types";

interface HabitsPageContentProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  email?: string | null;
}

type HabitLogAction = { habitId: string; logDate: string; completed: boolean };

function applyOptimisticHabitLog(state: HabitLog[], action: HabitLogAction): HabitLog[] {
  const next: HabitLog = {
    habitId: action.habitId,
    logDate: action.logDate,
    completed: action.completed,
    completedAt: action.completed ? new Date() : null,
  };
  const idx = state.findIndex((log) => log.habitId === action.habitId && log.logDate === action.logDate);
  if (idx === -1) return [...state, next];
  return state.map((log, i) => (i === idx ? next : log));
}

export function HabitsPageContent({ habits, habitLogs, email }: HabitsPageContentProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimisticLogs, applyOptimisticLog] = useOptimistic(habitLogs, applyOptimisticHabitLog);
  const [pendingHabitIds, setPendingHabitIds] = useState<Set<string>>(new Set());
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  const todayKey = toDateKey(new Date());
  const todayLogsByHabitId = new Map(
    optimisticLogs.filter((log) => log.logDate === todayKey).map((log) => [log.habitId, log])
  );

  function handleToggle(habitId: string, completed: boolean) {
    setPendingHabitIds((prev) => new Set(prev).add(habitId));
    startTransition(async () => {
      try {
        applyOptimisticLog({ habitId, logDate: todayKey, completed });
        await setHabitLogStatus(habitId, todayKey, completed);
        router.refresh();
      } finally {
        setPendingHabitIds((prev) => {
          const next = new Set(prev);
          next.delete(habitId);
          return next;
        });
      }
    });
  }

  function handleCreate(input: HabitFormInput) {
    startTransition(async () => {
      await createHabit(input);
      router.refresh();
    });
  }

  function handleUpdate(id: string, input: { title: string; description: string | null; dueTime: string }) {
    startTransition(async () => {
      await updateHabit(id, input);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteHabit(id);
      router.refresh();
    });
  }

  const ranked = rankByFrequency(habits, optimisticLogs);
  const topHabit = ranked[0]?.habit;
  const topStreak = topHabit ? getCurrentStreak(topHabit.id, optimisticLogs, new Date()) : 0;
  const selectedHabit = habits.find((h) => h.id === selectedHabitId) ?? null;

  const completedToday = habits.filter((h) => todayLogsByHabitId.get(h.id)?.completed).length;
  const completionPercent = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;

  return (
    <>
      <TopBar title="Dựng thói quen" email={email} />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 p-4 sm:p-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
            <CardHeader className="flex flex-row items-center justify-between px-8 pt-8">
              <CardTitle className="text-lg font-semibold text-slate-700">Thói quen hôm nay</CardTitle>
              <HabitFormDialog trigger={<Button type="button">+ Thêm thói quen</Button>} onSubmit={handleCreate} />
            </CardHeader>
            <CardContent className="flex flex-col gap-5 px-8 pb-8">
              {habits.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có thói quen nào.</p>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between text-xs font-medium text-slate-500">
                      <span>Tiến độ hôm nay</span>
                      <span className="font-mono text-slate-700">
                        {completedToday}/{habits.length} · {completionPercent}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>

                  <ul className="flex flex-col gap-2">
                    {habits.map((habit) => (
                      <HabitChecklistItem
                        key={habit.id}
                        habit={habit}
                        log={todayLogsByHabitId.get(habit.id)}
                        onToggle={handleToggle}
                        pending={pendingHabitIds.has(habit.id)}
                        onRowClick={(h) => setSelectedHabitId(h.id)}
                        streak={getCurrentStreak(habit.id, optimisticLogs, new Date())}
                      />
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          {habits.length > 0 && (
            <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
              <CardHeader className="px-8 pt-8">
                <CardTitle className="text-lg font-semibold text-slate-700">Thống kê thói quen</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5 px-8 pb-8">
                <HabitFrequencyRow habits={habits} habitLogs={optimisticLogs} />

                {topHabit && topStreak >= 1 && (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    🔥 Bạn đã liên tục thực hiện <span className="font-semibold">{topHabit.title}</span> trong{" "}
                    {topStreak} ngày
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          <HabitYearGrid habits={habits} habitLogs={optimisticLogs} />
        </div>
      </div>

      <HabitDetailDialog
        habit={selectedHabit}
        habitLogs={optimisticLogs}
        open={selectedHabitId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedHabitId(null);
        }}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </>
  );
}
