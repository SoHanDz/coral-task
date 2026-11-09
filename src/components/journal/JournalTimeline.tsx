"use client";

import { format, parseISO } from "date-fns";
import { toDateKey } from "@/lib/date/date-key";
import { isEntryFilled, primaryNumberField } from "@/lib/journal/stats";
import { MOODS } from "@/lib/journal/templates";
import type { JournalEntries, JournalField } from "@/lib/journal/types";

interface Props {
  fields: JournalField[];
  entries: JournalEntries;
  selectedKey: string;
  onSelect: (key: string) => void;
}

export function JournalTimeline({
  fields,
  entries,
  selectedKey,
  onSelect,
}: Props) {
  const todayKey = toDateKey(new Date());
  const primary = primaryNumberField(fields);
  const moodField = fields.find((f) => f.type === "mood");
  const textField = fields.find((f) => f.type === "longtext");

  const keys = Object.keys(entries)
    .filter((k) => isEntryFilled(entries[k], fields))
    .sort()
    .reverse();

  if (keys.length === 0) {
    return <p className="text-sm text-slate-500">Chưa có mục nào.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {keys.map((key) => {
        const e = entries[key];
        const moodValue = moodField ? e[moodField.id] : undefined;
        const mood =
          typeof moodValue === "number" ? (MOODS[moodValue - 1] ?? "") : "";
        const numberValue = primary ? e[primary.id] : undefined;
        const number =
          typeof numberValue === "number" && numberValue > 0
            ? `${numberValue} ${primary?.unit ?? ""}`.trim()
            : "";
        const summary =
          textField && typeof e[textField.id] === "string"
            ? (e[textField.id] as string).trim()
            : "";
        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => onSelect(key)}
              className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                key === selectedKey ? "bg-slate-100" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {key === todayKey ? "Hôm nay" : format(parseISO(key), "dd/MM")}
                </span>
                <span>{[mood, number].filter(Boolean).join(" ")}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-700">
                {summary || "(chưa viết gì)"}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
