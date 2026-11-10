import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { MOODS } from "./templates";
import type { EntryValues, Journal, JournalField } from "./types";

const EMPTY = "(không ghi)";

function formatField(field: JournalField, values: EntryValues): string {
  const value = values[field.id];
  const label = field.label.trim();

  switch (field.type) {
    case "number": {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return `■ ${label}: ${EMPTY}`;
      }
      return `■ ${label}: ${value}${field.unit ? ` ${field.unit}` : ""}`;
    }
    case "mood": {
      const score = typeof value === "number" ? value : 0;
      const emoji = MOODS[score - 1];
      if (!emoji) return `■ ${label}: ${EMPTY}`;
      return `■ ${label}: ${emoji} (${score}/${MOODS.length})`;
    }
    case "tags": {
      const tags = Array.isArray(value) ? value.filter((t) => t.trim()) : [];
      if (tags.length === 0) return `■ ${label}\n${EMPTY}`;
      return `■ ${label}\n${tags.map((t) => `- ${t.trim()}`).join("\n")}`;
    }
    case "longtext": {
      const text = typeof value === "string" ? value.trim() : "";
      return `■ ${label}\n${text || EMPTY}`;
    }
  }
}

/**
 * Plain-text copy of one day's entry, meant to be pasted into a chat with an
 * AI. Everything (title, field names, order) comes from the journal itself, so
 * it adapts to any user's setup.
 */
export function formatEntryForCopy(
  journal: Journal,
  dateKey: string,
  values: EntryValues,
): string {
  const date = format(parseISO(dateKey), "EEEE, dd/MM/yyyy", { locale: vi });
  const header = `NHẬT KÝ ${journal.emoji} ${journal.name} — ${capitalize(date)}`;
  const blocks = journal.fields.map((f) => formatField(f, values));
  return [header, ...blocks].join("\n\n");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
