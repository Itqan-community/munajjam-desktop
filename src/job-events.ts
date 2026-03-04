import type { JobLogEntry } from "./ipc-types";

const JOB_EVENT_TYPES = new Set([
  "log",
  "error",
  "stderr",
  "surah_start",
  "surah_done",
  "surah_skipped",
  "surah_error",
  "progress",
]);

function isValidSurahId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 114;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeJobEventNumber(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  return isFiniteNumber(value) ? value : undefined;
}

export function parseJobEvent(line: string): JobLogEntry {
  const trimmed = line.trim();
  if (!trimmed) {
    return { type: "log", event_version: 1, message: "" };
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof parsed.type !== "string") {
      return { type: "log", event_version: 1, message: trimmed };
    }

    if (!JOB_EVENT_TYPES.has(parsed.type)) {
      return {
        type: "unknown",
        event_version: 1,
        raw_type: parsed.type,
        data: parsed,
        message: typeof parsed.message === "string" ? parsed.message : undefined,
      };
    }

    if (parsed.type === "log" || parsed.type === "error" || parsed.type === "stderr") {
      return {
        type: parsed.type,
        event_version: 1,
        message: typeof parsed.message === "string" ? parsed.message : trimmed,
      };
    }

    if (parsed.type === "surah_start") {
      if (!isValidSurahId(parsed.surah_id)) {
        return {
          type: "unknown",
          event_version: 1,
          raw_type: parsed.type,
          data: parsed,
          message: "Invalid surah_start event payload",
        };
      }

      return {
        type: "surah_start",
        event_version: 1,
        surah_id: parsed.surah_id,
        total: normalizeJobEventNumber(parsed, "total"),
        message: typeof parsed.message === "string" ? parsed.message : undefined,
      };
    }

    if (parsed.type === "progress") {
      return {
        type: "progress",
        event_version: 1,
        surah_id: isValidSurahId(parsed.surah_id) ? parsed.surah_id : undefined,
        stage: typeof parsed.stage === "string" ? parsed.stage : undefined,
        percent: normalizeJobEventNumber(parsed, "percent"),
        current: normalizeJobEventNumber(parsed, "current"),
        total: normalizeJobEventNumber(parsed, "total"),
        avg_similarity: normalizeJobEventNumber(parsed, "avg_similarity"),
        seconds: normalizeJobEventNumber(parsed, "seconds"),
        message: typeof parsed.message === "string" ? parsed.message : undefined,
      };
    }

    if (!isValidSurahId(parsed.surah_id)) {
      return {
        type: "unknown",
        event_version: 1,
        raw_type: parsed.type,
        data: parsed,
        message: "Invalid surah_id in event payload",
      };
    }

    if (parsed.type === "surah_done") {
      return {
        type: "surah_done",
        event_version: 1,
        surah_id: parsed.surah_id,
        aligned: normalizeJobEventNumber(parsed, "aligned"),
        total: normalizeJobEventNumber(parsed, "total"),
        avg_similarity: normalizeJobEventNumber(parsed, "avg_similarity"),
        similarity: normalizeJobEventNumber(parsed, "similarity"),
        seconds: normalizeJobEventNumber(parsed, "seconds"),
        message: typeof parsed.message === "string" ? parsed.message : undefined,
      };
    }

    if (parsed.type === "surah_skipped") {
      return {
        type: "surah_skipped",
        event_version: 1,
        surah_id: parsed.surah_id,
        message: typeof parsed.message === "string" ? parsed.message : undefined,
      };
    }

    return {
      type: "surah_error",
      event_version: 1,
      surah_id: parsed.surah_id,
      message:
        typeof parsed.message === "string"
          ? parsed.message
          : "Surah processing failed",
    };
  } catch {
    return { type: "log", event_version: 1, message: line };
  }
}
