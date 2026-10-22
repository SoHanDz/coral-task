"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteHabit, setHabitLogStatus, updateHabit } from "@/app/actions/habits";
import { HabitChecklistItem } from "@/components/habits/HabitChecklistItem";
import { HabitDetailDialog } from "@/components/habits/HabitDetailDialog";
import { HabitFrequencyRow } from "@/components/habits/HabitFrequencyRow";
import { HabitYearGrid } from "@/components/habits/HabitYearGrid";
import { QuoteWidget } from "@/components/habits/QuoteWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toDateKey } from "@/lib/date/date-key";
import { getCurrentStreak, rankByFrequency } from "@/lib/habits/stats";
import type { Habit, HabitLog, HabitQuote } from "@/lib/habits/types";

interface HabitsPageContentProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  quotes: HabitQuote[];
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

export function HabitsPageContent({ habits, habitLogs, quotes }: HabitsPageContentProps) {
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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <HabitYearGrid habits={habits} habitLogs={optimisticLogs} />

      {habits.length > 0 && <HabitFrequencyRow habits={habits} habitLogs={optimisticLogs} />}

      {topHabit && topStreak >= 1 && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Bạn đã liên tục thực hiện {topHabit.title} liên tục {topStreak} ngày
        </p>
      )}

      <QuoteWidget quotes={quotes} />

      <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
        <CardHeader className="px-8 pt-8">
          <CardTitle className="text-lg font-semibold text-slate-700">Hôm nay</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-8 pb-8">
          {habits.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có thói quen nào.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {habits.map((habit) => (
                <HabitChecklistItem
                  key={habit.id}
                  habit={habit}
                  log={todayLogsByHabitId.get(habit.id)}
                  onToggle={handleToggle}
                  pending={pendingHabitIds.has(habit.id)}
                  onRowClick={(h) => setSelectedHabitId(h.id)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
