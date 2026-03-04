import fs from "fs";
import path from "path";

export interface QuranAyah {
  ayah_number: number;
  text: string;
}

let quranCache: Map<number, QuranAyah[]> | null = null;

const splitCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
};

function loadQuranText(csvPath: string): Map<number, QuranAyah[]> {
  if (quranCache) return quranCache;

  const resolvedPath = path.resolve(csvPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Quran CSV not found at ${resolvedPath}`);
  }

  const content = fs.readFileSync(resolvedPath, "utf-8");
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = lines.shift();
  if (!header) {
    throw new Error("Quran CSV is empty");
  }

  const map = new Map<number, QuranAyah[]>();

  for (const line of lines) {
    const cols = splitCsvLine(line);
    if (cols.length < 4) continue;
    const surahId = Number(cols[1]);
    const ayahNumber = Number(cols[2]);
    const text = cols[3] ?? "";

    if (!Number.isFinite(surahId) || !Number.isFinite(ayahNumber)) {
      continue;
    }

    if (!map.has(surahId)) {
      map.set(surahId, []);
    }
    map.get(surahId)!.push({ ayah_number: ayahNumber, text });
  }

  quranCache = map;
  return map;
}

export function getSurahText(csvPath: string, surahId: number): QuranAyah[] {
  const map = loadQuranText(csvPath);
  return map.get(surahId) ?? [];
}
