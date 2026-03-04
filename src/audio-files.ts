import fs from "fs";
import path from "path";

export interface ScannedAudioFile {
  surahId: number;
  fullPath: string;
  ext: string;
}

const ALLOWED_AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".flac"]);
const EXTENSION_PRIORITY = [".mp3", ".m4a", ".wav", ".flac"];
const EXTENSION_RANK = new Map(
  EXTENSION_PRIORITY.map((extension, index) => [extension, index]),
);

export function scanAudioFiles(audioDir: string, surahIds?: number[]): ScannedAudioFile[] {
  if (!fs.existsSync(audioDir)) {
    return [];
  }

  const files = fs.readdirSync(audioDir);
  const bySurah = new Map<number, ScannedAudioFile>();

  const normalizedIds =
    surahIds && surahIds.length > 0
      ? new Set(surahIds.filter((id) => Number.isInteger(id) && id >= 1 && id <= 114))
      : undefined;

  for (const filename of files) {
    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_AUDIO_EXTENSIONS.has(ext)) continue;

    const stem = path.basename(filename, ext);
    if (!/^\d+$/.test(stem)) continue;

    const surahId = Number(stem);
    if (surahId < 1 || surahId > 114) continue;
    if (normalizedIds && !normalizedIds.has(surahId)) continue;

    const next = { surahId, fullPath: path.join(audioDir, filename), ext };
    const existing = bySurah.get(surahId);
    if (!existing) {
      bySurah.set(surahId, next);
      continue;
    }

    const currentRank = EXTENSION_RANK.get(existing.ext) ?? Number.MAX_SAFE_INTEGER;
    const nextRank = EXTENSION_RANK.get(ext) ?? Number.MAX_SAFE_INTEGER;
    if (nextRank < currentRank) {
      bySurah.set(surahId, next);
    }
  }

  return [...bySurah.values()].sort((left, right) => left.surahId - right.surahId);
}
