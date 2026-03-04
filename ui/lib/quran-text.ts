// Quran text fetching utility
// Uses the quran.com API to fetch ayah text

import { getElectronBridge } from "./electron";

interface QuranAyah {
  ayah_number: number;
  text: string;
}

// Cache for fetched surah texts
const quranTextCache = new Map<number, QuranAyah[]>();

/**
 * Fetches Quran text for a specific surah via local IPC.
 */
export async function fetchQuranText(surahId: number): Promise<QuranAyah[]> {
  if (quranTextCache.has(surahId)) {
    return quranTextCache.get(surahId)!;
  }

  try {
    const ayahs = await getElectronBridge().quran.getSurahText(surahId);
    quranTextCache.set(surahId, ayahs);
    return ayahs;
  } catch (error) {
    console.error(`Error fetching Quran text for surah ${surahId}:`, error);
    return [];
  }
}

/**
 * Merges Quran text into segments based on ayah number
 */
export function mergeQuranTextIntoSegments<T extends { ayah_number: number; text: string }>(
  segments: T[],
  quranText: QuranAyah[]
): T[] {
  const textMap = new Map(quranText.map((a) => [a.ayah_number, a.text]));

  return segments.map((segment) => ({
    ...segment,
    text: textMap.get(segment.ayah_number) || segment.text || "",
  }));
}
