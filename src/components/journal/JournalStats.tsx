"use client";

import { format, subDays } from "date-fns";
import { Flame } from "lucide-react";
import { toDateKey } from "@/lib/date/date-key";
import {
  currentStreak,
  gridLevel,
  isEntryFilled,
  maxPrimaryValue,
  primaryNumberField,
} from "@/lib/journal/stats";
import type { JournalEntries, JournalField } from "@/lib/journal/types";

const LEVEL_CLASS = [
  "bg-slate-100",
  "bg-teal-200",
  "bg-teal-400",
  "bg-teal-600",
] as const;

interface Props {
  fields: JournalField[];
  entries: JournalEntries;
  selectedKey: string;
  onSelect: (key: string) => void;
}

export function JournalStats({ fields, entries, selectedKey, onSelect }: Props) {
  const today = new Date();
  const primary = primaryNumberField(fields);
  const max = maxPrimaryValue(entries, primary);
  const days = Array.from({ length: 28 }, (_, i) => subDays(today, 27 - i));

  const writtenCount = Object.values(entries).filter((v) =>
    isEntryFilled(v, fields),
  ).length;

  const lastWeek = days.slice(-7);
  const weekTotal = primary
    ? lastWeek.reduce((sum, d) => {
        const v = entries[toDateKey(d)]?.[primary.id];
        return sum + (typeof v === "number" ? v : 0);
      }, 0)
    : lastWeek.filter((d) => isEntryFilled(entries[toDateKey(d)], fields))
        .length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Chuỗi ngày"
          value={`${currentStreak(entries, fields, today)} ngày`}
          icon
        />
        <Stat
          label={primary ? `${primary.label} · 7 ngày` : "Số ngày đã ghi · 7 ngày"}
          value={primary ? `${weekTotal} ${primary.unit ?? ""}`.trim() : `${weekTotal}`}
        />
        <Stat label="Tổng số ngày đã ghi" value={String(writtenCount)} />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-slate-500">
          28 ngày gần nhất
        </p>
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
        >
          {days.map((d) => {
            const key = toDateKey(d);
            const level = gridLevel(entries[key], fields, max);
            return (
              <button
                key={key}
                type="button"
                title={format(d, "dd/MM")}
                aria-label={format(d, "dd/MM")}
                onClick={() => onSelect(key)}
                className={`aspect-square rounded-md ${LEVEL_CLASS[level]} ${
                  key === selectedKey
                    ? "ring-2 ring-slate-700 ring-offset-1"
                    : ""
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <p className="truncate text-xs text-slate-500">{label}</p>
      <p className="mt-1 flex items-center gap-1 text-lg font-semibold text-slate-700">
        {icon && <Flame className="size-4 text-orange-500" />}
        {value}
      </p>
    </div>
  );
}
