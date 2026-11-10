import { describe, expect, it } from "vitest";
import { formatEntryForCopy } from "./export";
import type { Journal } from "./types";

const journal: Journal = {
  id: "j1",
  templateKey: "custom",
  name: "Giảm cân",
  emoji: "🏃",
  fields: [
    { id: "workout", label: "Hôm nay tập gì?", type: "longtext" },
    { id: "foods", label: "Đã ăn", type: "tags" },
    { id: "weight", label: "Cân nặng", type: "number", unit: "kg" },
    { id: "mood", label: "Cảm giác", type: "mood" },
    { id: "note", label: "Ghi chú", type: "longtext" },
  ],
};

describe("formatEntryForCopy", () => {
  it("uses the journal's own name and field labels, in order", () => {
    const text = formatEntryForCopy(journal, "2026-11-09", {
      workout: "Chạy 5km\nHít đất 3 hiệp",
      foods: ["cơm gạo lứt", "ức gà"],
      weight: 68.5,
      mood: 4,
      note: "Mệt nhưng vui",
    });
    expect(text).toBe(
      [
        "NHẬT KÝ 🏃 Giảm cân — Thứ Hai, 09/11/2026",
        "",
        "■ Hôm nay tập gì?",
        "Chạy 5km\nHít đất 3 hiệp",
        "",
        "■ Đã ăn",
        "- cơm gạo lứt",
        "- ức gà",
        "",
        "■ Cân nặng: 68.5 kg",
        "",
        "■ Cảm giác: 🙂 (4/5)",
        "",
        "■ Ghi chú",
        "Mệt nhưng vui",
      ].join("\n"),
    );
  });

  it("marks empty fields as not written", () => {
    const text = formatEntryForCopy(journal, "2026-11-09", {
      workout: "   ",
      foods: [],
      mood: 0,
    });
    expect(text).toContain("■ Hôm nay tập gì?\n(không ghi)");
    expect(text).toContain("■ Đã ăn\n(không ghi)");
    expect(text).toContain("■ Cân nặng: (không ghi)");
    expect(text).toContain("■ Cảm giác: (không ghi)");
  });

  it("handles a number without a unit and a zero value", () => {
    const j: Journal = {
      ...journal,
      fields: [{ id: "n", label: "Số bài", type: "number" }],
    };
    expect(formatEntryForCopy(j, "2026-11-09", { n: 0 })).toContain(
      "■ Số bài: 0",
    );
  });
});
