import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { parseJobEvent, scanAudioFiles } from "./jobs";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("parseJobEvent", () => {
  it("normalizes known JSON events", () => {
    const entry = parseJobEvent(
      JSON.stringify({ type: "surah_done", surah_id: 2, similarity: 0.97, message: "ok" }),
    );

    expect(entry.type).toBe("surah_done");
    if (entry.type !== "surah_done") {
      throw new Error("Expected surah_done");
    }
    expect(entry.event_version).toBe(1);
    expect(entry.surah_id).toBe(2);
    expect(entry.similarity).toBe(0.97);
    expect(entry.message).toBe("ok");
  });

  it("maps unknown JSON event types to a safe unknown event", () => {
    const raw = JSON.stringify({ type: "other", value: true });
    expect(parseJobEvent(raw)).toEqual({
      type: "unknown",
      event_version: 1,
      raw_type: "other",
      data: { type: "other", value: true },
      message: undefined,
    });
  });

  it("parses structured progress fields", () => {
    const entry = parseJobEvent(
      JSON.stringify({
        type: "progress",
        surah_id: 37,
        stage: "aligning",
        percent: 81.5,
        current: 22,
        total: 27,
        avg_similarity: 0.93,
        seconds: 12.2,
      }),
    );

    expect(entry).toEqual({
      type: "progress",
      event_version: 1,
      surah_id: 37,
      stage: "aligning",
      percent: 81.5,
      current: 22,
      total: 27,
      avg_similarity: 0.93,
      seconds: 12.2,
      message: undefined,
    });
  });
});

describe("scanAudioFiles", () => {
  it("returns sorted unique surah files with deterministic extension preference", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "munajjam-jobs-test-"));
    tempDirs.push(dir);

    fs.writeFileSync(path.join(dir, "001.wav"), "");
    fs.writeFileSync(path.join(dir, "001.mp3"), "");
    fs.writeFileSync(path.join(dir, "002.flac"), "");
    fs.writeFileSync(path.join(dir, "not-a-surah.mp3"), "");

    const files = scanAudioFiles(dir);
    expect(files.map((item) => [item.surahId, item.ext])).toEqual([
      [1, ".mp3"],
      [2, ".flac"],
    ]);
  });
});
