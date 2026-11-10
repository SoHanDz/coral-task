"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createField, moveField, remainingQuickAdds } from "@/lib/journal/fields";
import { FIELD_KINDS } from "@/lib/journal/templates";
import type { FieldType, JournalField } from "@/lib/journal/types";

interface Props {
  name: string;
  onNameChange: (name: string) => void;
  fields: JournalField[];
  onChange: (fields: JournalField[]) => void;
}

export function JournalFieldEditor({
  name,
  onNameChange,
  fields,
  onChange,
}: Props) {
  const [pickedType, setPickedType] = useState<FieldType | null>(null);
  const [label, setLabel] = useState("");
  const [unit, setUnit] = useState("");

  const quickAdds = remainingQuickAdds(fields);

  function patch(id: string, p: Partial<JournalField>) {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...p } : f)));
  }

  function cancelCustom() {
    setPickedType(null);
    setLabel("");
    setUnit("");
  }

  function confirmCustom() {
    if (!pickedType || !label.trim()) return;
    onChange([...fields, createField({ label, type: pickedType, unit })]);
    cancelCustom();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="journal-name" className="text-sm font-medium text-slate-700">
          Tên nhật ký
        </Label>
        <Input
          id="journal-name"
          value={name}
          maxLength={60}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ví dụ: Giảm cân"
        />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-700">
          Mỗi ngày bạn sẽ điền
        </p>
        <ul className="flex flex-col gap-2">
          {fields.map((f, i) => (
            <li
              key={f.id}
              className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Input
                  value={f.label}
                  maxLength={80}
                  onChange={(e) => patch(f.id, { label: e.target.value })}
                  aria-label="Tên mục"
                />
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{FIELD_KINDS[f.type].title}</span>
                  {f.type === "number" && (
                    <span className="flex items-center gap-1">
                      · đo bằng
                      <Input
                        value={f.unit ?? ""}
                        maxLength={20}
                        onChange={(e) => patch(f.id, { unit: e.target.value })}
                        placeholder="phút, km..."
                        aria-label="Đơn vị"
                        className="h-7 w-24 px-2 text-xs"
                      />
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center">
                {fields.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Chuyển lên"
                      disabled={i === 0}
                      onClick={() => onChange(moveField(fields, i, -1))}
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Chuyển xuống"
                      disabled={i === fields.length - 1}
                      onClick={() => onChange(moveField(fields, i, 1))}
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  aria-label={`Xóa mục ${f.label}`}
                  disabled={fields.length <= 1}
                  onClick={() => onChange(fields.filter((x) => x.id !== f.id))}
                  className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                >
                  <X className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {quickAdds.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-slate-700">
            Gợi ý - bấm để thêm
          </p>
          <div className="flex flex-wrap gap-2">
            {quickAdds.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => onChange([...fields, createField(q)])}
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Plus className="size-3.5" /> {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-700">
          Hoặc thêm một mục khác - bạn muốn ghi kiểu nào?
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(FIELD_KINDS) as FieldType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setPickedType(type);
                setLabel("");
                setUnit("");
              }}
              className={`rounded-xl border p-3 text-left transition-colors ${
                pickedType === type
                  ? "border-teal-500 bg-teal-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <p className="text-sm font-medium text-slate-700">
                {FIELD_KINDS[type].title}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {FIELD_KINDS[type].example}
              </p>
            </button>
          ))}
        </div>

        {pickedType && (
          <div className="mt-1 flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50/50 p-3">
            <Input
              autoFocus
              value={label}
              maxLength={80}
              onChange={(e) => setLabel(e.target.value)}
              aria-label="Đặt tên cho mục này"
              placeholder={`Đặt tên cho mục này, ví dụ: ${FIELD_KINDS[pickedType].defaultLabel}`}
            />
            {pickedType === "number" && (
              <div className="flex flex-col gap-1.5">
                <Label>Đo bằng gì? (không bắt buộc)</Label>
                <Input
                  value={unit}
                  maxLength={20}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Ví dụ: phút, km, kg"
                  className="max-w-48"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={confirmCustom}
                disabled={!label.trim()}
              >
                Thêm mục
              </Button>
              <Button type="button" variant="ghost" onClick={cancelCustom}>
                Hủy
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
