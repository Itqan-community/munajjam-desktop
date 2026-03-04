import { describe, expect, it } from "vitest";
import type { JobLogEntry } from "@/lib/workspace-types";
import { deriveProcessingState } from "./derive-processing-state";

describe("deriveProcessingState", () => {
  it("tracks per-surah lifecycle and progress fields", () => {
    const logs: JobLogEntry[] = [
      { type: "surah_start", event_version: 1, surah_id: 1 },
      {
        type: "progress",
        event_version: 1,
        surah_id: 1,
        stage: "aligning",
        percent: 55,
        current: 11,
        total: 20,
      },
      {
        type: "surah_done",
        event_version: 1,
        surah_id: 1,
        aligned: 20,
        total: 20,
        avg_similarity: 0.94,
        seconds: 12,
      },
    ];

    const derived = deriveProcessingState(logs);
    expect(derived.surahs).toHaveLength(1);
    expect(derived.surahs[0]).toMatchObject({
      surahId: 1,
      status: "done",
      percent: 100,
      aligned: 20,
      totalAyahs: 20,
      similarity: 0.94,
      seconds: 12,
    });
  });

  it("ignores unknown events and still records errors", () => {
    const logs: JobLogEntry[] = [
      { type: "unknown", event_version: 1, raw_type: "custom", data: {} },
      { type: "surah_error", event_version: 1, surah_id: 5, message: "boom" },
    ];

    const derived = deriveProcessingState(logs);
    expect(derived.surahs).toHaveLength(1);
    expect(derived.surahs[0]).toMatchObject({
      surahId: 5,
      status: "error",
      error: "boom",
    });
  });
});
