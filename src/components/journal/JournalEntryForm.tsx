"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MOODS } from "@/lib/journal/templates";
import type {
  EntryValue,
  EntryValues,
  JournalField,
} from "@/lib/journal/types";

interface Props {
  fields: JournalField[];
  values: EntryValues;
  onChange: (fieldId: string, value: EntryValue) => void;
}

const isCompact = (field: JournalField) =>
  field.type === "number" || field.type === "mood";

/**
 * Fields keep the order the user set, but a run of short ones (numbers, mood)
 * shares one wrapping row so the long-text boxes get the space.
 */
function groupFields(fields: JournalField[]): JournalField[][] {
  const groups: JournalField[][] = [];
  for (const field of fields) {
    const last = groups[groups.length - 1];
    if (isCompact(field) && last && isCompact(last[0])) last.push(field);
    else groups.push([field]);
  }
  return groups;
}

export function JournalEntryForm({ fields, values, onChange }: Props) {
  return (
    <div className="flex flex-col gap-7">
      {groupFields(fields).map((group) => {
        const inputs = group.map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={(v) => onChange(field.id, v)}
          />
        ));
        return isCompact(group[0]) ? (
          <div key={group[0].id} className="flex flex-wrap items-end gap-x-8 gap-y-5">
            {inputs}
          </div>
        ) : (
          inputs
        );
      })}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: JournalField;
  value: EntryValue | undefined;
  onChange: (v: EntryValue) => void;
}) {
  const [tagInput, setTagInput] = useState("");

  if (field.type === "longtext") {
    return (
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium text-slate-700">{field.label}</Label>
        <Textarea
          rows={6}
          className="field-sizing-content max-h-[60vh] min-h-40 resize-y px-3.5 py-3 text-base leading-relaxed md:text-base"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="flex flex-col gap-2">
        <Label>
          {field.label}
          {field.unit ? ` (${field.unit})` : ""}
        </Label>
        <Input
          type="number"
          min={0}
          className="w-32"
          value={typeof value === "number" && value > 0 ? value : ""}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        />
      </div>
    );
  }

  if (field.type === "mood") {
    return (
      <div className="flex flex-col gap-2">
        <Label>{field.label}</Label>
        <div className="flex max-w-xs gap-1">
          {MOODS.map((m, i) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange(value === i + 1 ? 0 : i + 1)}
              aria-pressed={value === i + 1}
              className={`flex-1 rounded-lg py-1.5 text-xl transition-colors ${
                value === i + 1 ? "bg-teal-100" : "hover:bg-slate-100"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const tags = Array.isArray(value) ? value : [];
  function addTag() {
    const tag = tagInput.trim();
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
    setTagInput("");
  }
  return (
    <div className="flex flex-col gap-2">
      <Label>{field.label}</Label>
      <div className="flex gap-2">
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Gõ rồi nhấn Enter"
        />
        <Button
          type="button"
          variant="outline"
          onClick={addTag}
          aria-label="Thêm"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1">
            {t}
            <button
              type="button"
              aria-label={`Xóa ${t}`}
              onClick={() => onChange(tags.filter((x) => x !== t))}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
