"use client";

import { useRef, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Settings2,
} from "lucide-react";
import {
  renameJournal,
  saveJournalEntry,
  updateJournalFields,
} from "@/app/actions/journal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAutosave, type AutosaveStatus } from "@/hooks/use-autosave";
import { toDateKey } from "@/lib/date/date-key";
import { formatEntryForCopy } from "@/lib/journal/export";
import type {
  EntryValue,
  EntryValues,
  Journal,
  JournalEntries,
  JournalField,
} from "@/lib/journal/types";
import { cn } from "@/lib/utils";
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
  const [name, setName] = useState(journal.name);
  const [editingFields, setEditingFields] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const writeCardRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const { schedule, flush, status, error } = useAutosave<{
    date: string;
    values: EntryValues;
  }>(({ date, values }) => saveJournalEntry(journal.id, date, values));

  const fieldSave = useAutosave<JournalField[]>((next) =>
    updateJournalFields(journal.id, next),
  );

  const nameSave = useAutosave<string>((next) =>
    renameJournal(journal.id, next),
  );

  function handleNameChange(next: string) {
    setName(next);
    // A blank name can't be saved; keep it local until the user types one.
    if (next.trim()) nameSave.schedule(next.trim());
  }

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

  function selectDay(key: string, scrollToWriting = false) {
    if (!key || key > todayKey) return;
    flush();
    setSelectedKey(key);
    if (scrollToWriting) {
      writeCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function shiftDay(delta: number) {
    selectDay(toDateKey(addDays(parseISO(selectedKey), delta)));
  }

  async function copyEntry() {
    const text = formatEntryForCopy(
      { ...journal, name: name.trim() || journal.name, fields },
      selectedKey,
      entries[selectedKey] ?? {},
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState("idle"), 2000);
  }

  function openDatePicker() {
    try {
      dateInputRef.current?.showPicker();
    } catch {
      dateInputRef.current?.focus();
    }
  }

  const isToday = selectedKey === todayKey;
  const selectedDate = parseISO(selectedKey);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <Card
          ref={writeCardRef}
          className="scroll-mt-4 rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0 lg:col-span-2"
        >
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 px-4 pt-5 sm:px-8 sm:pt-6">
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => shiftDay(-1)}
                  aria-label="Ngày trước"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={openDatePicker}
                    aria-label="Chọn ngày khác"
                    className="rounded-md px-2 py-1 text-left text-lg font-semibold text-slate-800 transition-colors hover:bg-slate-100"
                  >
                    {isToday ? "Hôm nay · " : ""}
                    <span className={cn(isToday && "font-normal text-slate-500")}>
                      {format(selectedDate, "EEEE, dd/MM", { locale: vi })}
                    </span>
                  </button>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={selectedKey}
                    max={todayKey}
                    onChange={(e) => selectDay(e.target.value)}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-0"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => shiftDay(1)}
                  disabled={isToday}
                  aria-label="Ngày sau"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <p className="flex items-center gap-2 pl-10 text-xs text-slate-400">
                <span>
                  {journal.emoji} {name.trim() || journal.name}
                </span>
                <SaveStatus
                  status={combineStatus(
                    combineStatus(status, fieldSave.status),
                    nameSave.status,
                  )}
                  error={error ?? fieldSave.error ?? nameSave.error}
                />
              </p>
            </div>
            <div className="flex items-center gap-1">
              {!editingFields && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-slate-500"
                  onClick={copyEntry}
                  aria-label="Sao chép nhật ký ngày này"
                  title="Sao chép nhật ký ngày này để gửi cho AI"
                >
                  {copyState === "copied" ? (
                    <Check className="size-4 text-teal-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  <span aria-live="polite">
                    {copyState === "copied"
                      ? "Đã sao chép"
                      : copyState === "error"
                        ? "Không copy được"
                        : "Sao chép"}
                  </span>
                </Button>
              )}
              <Button
                type="button"
                variant={editingFields ? "default" : "ghost"}
                size={editingFields ? "sm" : "icon"}
                className={editingFields ? undefined : "size-8 text-slate-500"}
                onClick={() => setEditingFields((v) => !v)}
                aria-label={editingFields ? "Xong" : "Sửa các mục ghi"}
                title={editingFields ? "Xong" : "Sửa các mục ghi"}
              >
                {editingFields ? "Xong" : <Settings2 className="size-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-6 sm:px-8 sm:pb-8">
            {editingFields ? (
              <JournalFieldEditor
                name={name}
                onNameChange={handleNameChange}
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

        <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0 lg:sticky lg:top-4">
          <CardHeader className="px-4 pt-5 sm:px-6 sm:pt-6">
            <CardTitle className="text-sm font-semibold text-slate-600">
              Dòng thời gian
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[70vh] overflow-y-auto px-4 pb-5 sm:px-6 sm:pb-6">
            <JournalTimeline
              fields={fields}
              entries={entries}
              selectedKey={selectedKey}
              onSelect={(key) => selectDay(key)}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm ring-0">
        <CardHeader className="px-4 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => setOverviewOpen((v) => !v)}
            aria-expanded={overviewOpen}
            className="flex w-full items-center justify-between text-left"
          >
            <CardTitle className="text-sm font-semibold text-slate-600">
              Tổng quan · thống kê và biểu đồ
            </CardTitle>
            <ChevronDown
              className={cn(
                "size-4 text-slate-400 transition-transform duration-200",
                overviewOpen && "rotate-180",
              )}
            />
          </button>
        </CardHeader>
        {overviewOpen && (
          <CardContent className="flex flex-col gap-8 px-4 pb-6 sm:px-8 sm:pb-8">
            <JournalStats
              fields={fields}
              entries={entries}
              selectedKey={selectedKey}
              onSelect={(key) => selectDay(key, true)}
            />
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-slate-600">Biểu đồ</h3>
              <JournalChartLoader fields={fields} entries={entries} />
            </div>
          </CardContent>
        )}
      </Card>
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
      <span role="alert" className="text-red-600">
        {error ?? "Lưu không thành công"}
      </span>
    );
  }
  return (
    <span aria-live="polite">
      · {status === "saving" ? "Đang lưu…" : "Đã lưu"}
    </span>
  );
}
