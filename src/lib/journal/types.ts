export type FieldType = "longtext" | "number" | "tags" | "mood";

export interface JournalField {
  id: string;
  label: string;
  type: FieldType;
  unit?: string;
}

export type EntryValue = string | number | string[];
export type EntryValues = Record<string, EntryValue>;
/** Key is a `yyyy-MM-dd` date key. */
export type JournalEntries = Record<string, EntryValues>;

export interface Journal {
  id: string;
  templateKey: string;
  name: string;
  emoji: string;
  fields: JournalField[];
}
