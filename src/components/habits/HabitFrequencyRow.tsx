"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { rankByFrequency } from "@/lib/habits/stats";
import type { Habit, HabitLog } from "@/lib/habits/types";

interface HabitFrequencyRowProps {
  habits: Habit[];
  habitLogs: HabitLog[];
}

export function HabitFrequencyRow({ habits, habitLogs }: HabitFrequencyRowProps) {
  const [open, setOpen] = useState(false);
  const ranked = rankByFrequency(habits, habitLogs);
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const restTotal = rest.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {top3.map(({ habit, count }) => (
        <div key={habit.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="truncate text-sm font-medium text-slate-700" title={habit.title}>
            {habit.title}
          </p>
          <p className="mt-1 font-mono text-xl font-semibold text-primary">{count}</p>
          <p className="text-xs text-slate-400">ngày hoàn thành</p>
        </div>
      ))}

      {rest.length > 0 && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <button
                type="button"
                className="rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition-colors duration-200 hover:bg-slate-50"
              >
                <p className="text-sm font-medium text-slate-700">Khác</p>
                <p className="mt-1 font-mono text-xl font-semibold text-primary">{restTotal}</p>
                <p className="text-xs text-slate-400">{rest.length} thói quen khác</p>
              </button>
            }
          />
          <DialogContent className="sm:max-w-[420px] w-full p-6 bg-white rounded-2xl border-none shadow-xl">
            <DialogHeader>
              <DialogTitle>Thói quen khác</DialogTitle>
            </DialogHeader>
            <ul className="flex flex-col gap-2">
              {rest.map(({ habit, count }) => (
                <li key={habit.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="truncate text-slate-700">{habit.title}</span>
                  <span className="shrink-0 font-mono text-slate-500">{count}</span>
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
