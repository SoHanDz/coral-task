import type { FieldType, JournalField } from "./types";

export const ENGLISH_TEMPLATE: {
  templateKey: "english";
  name: "Tiếng Anh";
  emoji: "📚";
  fields: JournalField[];
} = {
  templateKey: "english",
  name: "Tiếng Anh",
  emoji: "📚",
  fields: [
    { id: "learned", label: "Hôm nay mình học được gì?", type: "longtext" },
    { id: "words", label: "Từ / cụm từ mới", type: "tags" },
    { id: "minutes", label: "Số phút học", type: "number", unit: "phút" },
    { id: "mood", label: "Cảm giác hôm nay", type: "mood" },
    { id: "tomorrow", label: "Ngày mai học gì?", type: "longtext" },
    { id: "summary", label: "Tổng kết hôm nay", type: "longtext" },
  ],
};

export const MOODS = ["😫", "😕", "😐", "🙂", "🤩"];

// Plain-language kinds; the example line does the explaining so nobody has to
// know what a "field type" is.
export const FIELD_KINDS: Record<
  FieldType,
  { title: string; example: string; defaultLabel: string }
> = {
  longtext: {
    title: "Viết vài dòng",
    example: "cảm nghĩ, điều đã học, ghi chú",
    defaultLabel: "Ghi chú",
  },
  number: {
    title: "Một con số",
    example: "số phút, số km, cân nặng",
    defaultLabel: "Số lượng",
  },
  tags: {
    title: "Danh sách",
    example: "từ mới, món đã ăn, việc đã làm",
    defaultLabel: "Danh sách",
  },
  mood: {
    title: "Chọn cảm giác",
    example: "😫 😕 😐 🙂 🤩",
    defaultLabel: "Cảm giác hôm nay",
  },
};

export const QUICK_ADDS: { label: string; type: FieldType; unit?: string }[] = [
  { label: "Số km", type: "number", unit: "km" },
  { label: "Số giờ ngủ", type: "number", unit: "giờ" },
  { label: "Cân nặng", type: "number", unit: "kg" },
  { label: "Số trang đã đọc", type: "number", unit: "trang" },
  { label: "Cảm giác hôm nay", type: "mood" },
  { label: "Việc đã làm", type: "tags" },
  { label: "Điều biết ơn hôm nay", type: "longtext" },
];
