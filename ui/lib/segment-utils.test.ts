import { describe, expect, it } from "vitest";
import { getCurrentSegmentIndex, formatDuration, formatSegmentTime } from "./segment-utils";

const segments = [
  { ayah_number: 1, start: 0, end: 5, text: "a", similarity: 1 },
  { ayah_number: 2, start: 5, end: 10, text: "b", similarity: 1 },
];

describe("segment utils", () => {
  it("detects current segment index", () => {
    expect(getCurrentSegmentIndex(2.5, segments)).toBe(0);
    expect(getCurrentSegmentIndex(7.5, segments)).toBe(1);
    expect(getCurrentSegmentIndex(100, segments)).toBe(1);
  });

  it("formats timestamps", () => {
    expect(formatSegmentTime(65.34)).toBe("1:05.34");
    expect(formatDuration(65.34)).toBe("1:05");
  });
});
