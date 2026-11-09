import { QUICK_ADDS } from "./templates";
import type { FieldType, JournalField } from "./types";

export function moveField(
  fields: JournalField[],
  index: number,
  direction: -1 | 1,
): JournalField[] {
  const target = index + direction;
  if (index < 0 || index >= fields.length) return fields;
  if (target < 0 || target >= fields.length) return fields;
  const next = [...fields];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function createField(input: {
  label: string;
  type: FieldType;
  unit?: string;
}): JournalField {
  const field: JournalField = {
    id: crypto.randomUUID(),
    label: input.label.trim(),
    type: input.type,
  };
  const unit = input.unit?.trim();
  if (input.type === "number" && unit) field.unit = unit;
  return field;
}

export function remainingQuickAdds(
  fields: JournalField[],
): typeof QUICK_ADDS {
  const existing = new Set(fields.map((f) => f.label.trim().toLowerCase()));
  return QUICK_ADDS.filter((q) => !existing.has(q.label.toLowerCase()));
}
