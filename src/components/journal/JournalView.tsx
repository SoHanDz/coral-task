"use client";

import { useState } from "react";
import { saveJournalEntry } from "@/app/actions/journal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAutosave } from "@/hooks/use-autosave";
import { toDateKey } from "@/lib/date/date-key";
import type {
  EntryValue,
  EntryValues,
  Journal,
  JournalEntries,
} from "@/lib/journal/types";
import { JournalEntryForm } from "./JournalEntryForm";

interface Props {
  journal: Journal;
  entries: JournalEntries;
}

export function JournalView({ journal, entries: initialEntries }: Props) {
  const todayKey = toDateKey(new Date());
  const [entries, setEntries] = useState<JournalEntries>(initialEntries);
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const { schedule, flush, status, error } = useAutosave<{
    date: string;
    values: EntryValues;
  }>(({ date, values }) => saveJournalEntry(journal.id, date, values));

  function handleChange(fieldId: string, value: EntryValue) {
    const next = { ...(entries[selectedKey] ?? {}), [fieldId]: value };
    setEntries((prev) => ({ ...prev, [selectedKey]: next }));
    schedule({ date: selectedKey, values: next });
  }

  function selectDay(key: string) {
    if (!key || key > todayKey) return;
    flush();
    setSelectedKey(key);
  }

  return (
    <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 px-4 pt-6 sm:px-8 sm:pt-8">
        <CardTitle className="text-base font-semibold text-slate-700">
          {journal.emoji} {journal.name}
        </CardTitle>
        <div className="flex items-center gap-3">
          <SaveStatus status={status} error={error} />
          <Input
            type="date"
            value={selectedKey}
            max={todayKey}
            onChange={(e) => selectDay(e.target.value)}
            aria-label="Chọn ngày"
            className="h-9 w-auto"
          />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
        <JournalEntryForm
          key={selectedKey}
          fields={journal.fields}
          values={entries[selectedKey] ?? {}}
          onChange={handleChange}
        />
      </CardContent>
    </Card>
  );
}

function SaveStatus({
  status,
  error,
}: {
  status: "idle" | "saving" | "saved" | "error";
  error: string | null;
}) {
  if (status === "idle") return null;
  if (status === "error") {
    return (
      <span role="alert" className="text-xs text-red-600">
        {error ?? "Lưu không thành công"}
      </span>
    );
  }
  return (
    <span aria-live="polite" className="text-xs text-slate-500">
      {status === "saving" ? "Đang lưu…" : "Đã lưu"}
    </span>
  );
}
