import { describe, expect, it } from "vitest";
import {
  asIntegerInRange,
  asNonEmptyString,
  asOptionalIntegerArray,
  asStringArray,
  isJsonValue,
} from "./validation";

describe("validation helpers", () => {
  it("validates integer ranges", () => {
    expect(asIntegerInRange(1, "surah", 1, 114)).toBe(1);
    expect(() => asIntegerInRange(115, "surah", 1, 114)).toThrow();
  });

  it("validates non-empty strings", () => {
    expect(asNonEmptyString(" abc ", "name")).toBe("abc");
    expect(() => asNonEmptyString("", "name")).toThrow();
  });

  it("validates optional integer arrays", () => {
    expect(asOptionalIntegerArray([1, 2, 3], "ids", 1, 114)).toEqual([1, 2, 3]);
    expect(() => asOptionalIntegerArray([1, 999], "ids", 1, 114)).toThrow();
  });

  it("validates string arrays", () => {
    expect(asStringArray(["a", "b"], "items")).toEqual(["a", "b"]);
    expect(() => asStringArray(["a", 1], "items")).toThrow();
  });

  it("recognizes JSON-serializable values", () => {
    expect(isJsonValue({ a: 1, b: [true, "ok", null] })).toBe(true);
    expect(isJsonValue({ a: () => "nope" })).toBe(false);
  });
});
