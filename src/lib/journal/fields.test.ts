import { describe, expect, it } from "vitest";
import { createField, moveField, remainingQuickAdds } from "./fields";
import { ENGLISH_TEMPLATE } from "./templates";
import type { JournalField } from "./types";

const f = (id: string): JournalField => ({ id, label: id, type: "longtext" });

describe("moveField", () => {
  it("swaps neighbours and ignores out-of-range moves", () => {
    const list = [f("a"), f("b"), f("c")];
    expect(moveField(list, 1, -1).map((x) => x.id)).toEqual(["b", "a", "c"]);
    expect(moveField(list, 1, 1).map((x) => x.id)).toEqual(["a", "c", "b"]);
    expect(moveField(list, 0, -1).map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(moveField(list, 2, 1).map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(list.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("createField", () => {
  it("trims the label and drops unit for non-number kinds", () => {
    const text = createField({ label: "  Ghi  ", type: "longtext", unit: "km" });
    expect(text.label).toBe("Ghi");
    expect(text).not.toHaveProperty("unit");
    expect(text.id).toBeTruthy();
    const num = createField({ label: "Km", type: "number", unit: "km" });
    expect(num.unit).toBe("km");
    expect(createField({ label: "N", type: "number", unit: "" })).not.toHaveProperty("unit");
  });
});

describe("remainingQuickAdds", () => {
  it('hides "Số km" after a field labelled "số km" exists', () => {
    const before = remainingQuickAdds([]).map((q) => q.label);
    expect(before).toContain("Số km");
    const after = remainingQuickAdds([{ id: "x", label: "số km", type: "number" }]).map((q) => q.label);
    expect(after).not.toContain("Số km");
    expect(after).toHaveLength(before.length - 1);
  });
});

describe("ENGLISH_TEMPLATE", () => {
  it('field ids are unique and its first number field is "minutes"', () => {
    const ids = ENGLISH_TEMPLATE.fields.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ENGLISH_TEMPLATE.fields.find((x) => x.type === "number")?.id).toBe("minutes");
  });
});
