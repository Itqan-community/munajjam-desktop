import type { JobLogEntry } from "@/lib/workspace-types";

export interface SurahState {
  surahId: number;
  status: "running" | "done" | "error" | "skipped";
  stage: string | null;
  percent: number;
  stageCurrent: number | null;
  stageTotal: number | null;
  aligned?: number;
  totalAyahs?: number;
  similarity?: number;
  seconds?: number;
  error?: string;
}

export interface DerivedState {
  surahs: SurahState[];
  surahMap: Map<number, SurahState>;
}

export function deriveProcessingState(logs: JobLogEntry[]): DerivedState {
  const surahMap = new Map<number, SurahState>();
  const surahOrder: number[] = [];

  const ensureSurah = (surahId: number): SurahState => {
    const existing = surahMap.get(surahId);
    if (existing) {
      return existing;
    }

    const initial: SurahState = {
      surahId,
      status: "running",
      stage: null,
      percent: 0,
      stageCurrent: null,
      stageTotal: null,
    };
    surahMap.set(surahId, initial);
    surahOrder.push(surahId);
    return initial;
  };

  for (const entry of logs) {
    switch (entry.type) {
      case "surah_start": {
        const state = ensureSurah(entry.surah_id);
        state.status = "running";
        state.stage = null;
        state.percent = 0;
        state.stageCurrent = null;
        state.stageTotal = null;
        break;
      }
      case "progress": {
        if (typeof entry.surah_id !== "number") {
          break;
        }
        const state = ensureSurah(entry.surah_id);
        if (state.status !== "running") {
          break;
        }

        const previousStage = state.stage;
        state.stage = entry.stage ?? state.stage;
        state.percent = typeof entry.percent === "number" ? entry.percent : state.percent;

        if (typeof entry.current === "number" && typeof entry.total === "number") {
          state.stageCurrent = entry.current;
          state.stageTotal = entry.total;
        } else if (state.stage !== previousStage) {
          state.stageCurrent = null;
          state.stageTotal = null;
        }
        break;
      }
      case "surah_done": {
        const state = ensureSurah(entry.surah_id);
        state.status = "done";
        state.percent = 100;
        state.aligned = typeof entry.aligned === "number" ? entry.aligned : undefined;
        state.totalAyahs = typeof entry.total === "number" ? entry.total : undefined;
        state.similarity =
          typeof entry.avg_similarity === "number" ? entry.avg_similarity : undefined;
        state.seconds = typeof entry.seconds === "number" ? entry.seconds : undefined;
        break;
      }
      case "surah_skipped": {
        surahMap.set(entry.surah_id, {
          surahId: entry.surah_id,
          status: "skipped",
          stage: null,
          percent: 100,
          stageCurrent: null,
          stageTotal: null,
        });
        if (!surahOrder.includes(entry.surah_id)) {
          surahOrder.push(entry.surah_id);
        }
        break;
      }
      case "surah_error": {
        const current = surahMap.get(entry.surah_id);
        const next: SurahState = current ?? {
          surahId: entry.surah_id,
          status: "error",
          stage: null,
          percent: 0,
          stageCurrent: null,
          stageTotal: null,
        };
        next.status = "error";
        next.error = entry.message;
        surahMap.set(entry.surah_id, next);
        if (!surahOrder.includes(entry.surah_id)) {
          surahOrder.push(entry.surah_id);
        }
        break;
      }
      default:
        break;
    }
  }

  return {
    surahs: surahOrder.map((id) => surahMap.get(id)!),
    surahMap,
  };
}
