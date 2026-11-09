"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { saveJournalEntry, updateJournalFields } from "@/app/actions/journal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAutosave, type AutosaveStatus } from "@/hooks/use-autosave";
import { toDateKey } from "@/lib/date/date-key";
import type {
  EntryValue,
  EntryValues,
  Journal,
  JournalEntries,
  JournalField,
} from "@/lib/journal/types";
import { JournalEntryForm } from "./JournalEntryForm";
import { JournalFieldEditor } from "./JournalFieldEditor";
import { JournalChartLoader } from "./JournalChartLoader";
import { JournalStats } from "./JournalStats";
import { JournalTimeline } from "./JournalTimeline";

interface Props {
  journal: Journal;
  entries: JournalEntries;
}

export function JournalView({ journal, entries: initialEntries }: Props) {
  const todayKey = toDateKey(new Date());
  const [entries, setEntries] = useState<JournalEntries>(initialEntries);
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [fields, setFields] = useState<JournalField[]>(journal.fields);
  const [editingFields, setEditingFields] = useState(false);

  const { schedule, flush, status, error } = useAutosave<{
    date: string;
    values: EntryValues;
  }>(({ date, values }) => saveJournalEntry(journal.id, date, values));

  const fieldSave = useAutosave<JournalField[]>((next) =>
    updateJournalFields(journal.id, next),
  );

  function handleFieldsChange(next: JournalField[]) {
    setFields(next);
    // A blank name can't be saved yet; keep it local until the user types one.
    if (next.length > 0 && next.every((f) => f.label.trim())) {
      fieldSave.schedule(next.map((f) => ({ ...f, label: f.label.trim() })));
    }
  }

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
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-base font-semibold text-slate-700">
            {journal.emoji} {journal.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
          <JournalStats
            fields={fields}
            entries={entries}
            selectedKey={selectedKey}
            onSelect={selectDay}
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
        <CardHeader className="px-4 pt-6 sm:px-8 sm:pt-8">
          <CardTitle className="text-base font-semibold text-slate-700">
            Biểu đồ
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
          <JournalChartLoader fields={fields} entries={entries} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0 lg:col-span-3">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 px-4 pt-6 sm:px-8 sm:pt-8">
            <CardTitle className="text-base font-semibold text-slate-700">
              {selectedKey === todayKey
                ? "Hôm nay"
                : format(parseISO(selectedKey), "dd/MM/yyyy")}
            </CardTitle>
            <div className="flex items-center gap-3">
              <SaveStatus
                status={combineStatus(status, fieldSave.status)}
                error={error ?? fieldSave.error}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingFields((v) => !v)}
              >
                {editingFields ? "Xong" : "Sửa các mục ghi"}
              </Button>
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
            {editingFields ? (
              <JournalFieldEditor
                fields={fields}
                onChange={handleFieldsChange}
              />
            ) : (
              <JournalEntryForm
                key={selectedKey}
                fields={fields}
                values={entries[selectedKey] ?? {}}
                onChange={handleChange}
              />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0 lg:col-span-2">
          <CardHeader className="px-4 pt-6 sm:px-6 sm:pt-8">
            <CardTitle className="text-base font-semibold text-slate-700">
              Dòng thời gian
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-6 sm:px-6 sm:pb-8">
            <JournalTimeline
              fields={fields}
              entries={entries}
              selectedKey={selectedKey}
              onSelect={selectDay}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function combineStatus(a: AutosaveStatus, b: AutosaveStatus): AutosaveStatus {
  for (const s of ["error", "saving", "saved"] as const) {
    if (a === s || b === s) return s;
  }
  return "idle";
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
