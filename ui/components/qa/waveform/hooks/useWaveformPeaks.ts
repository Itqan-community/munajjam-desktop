"use client";

import { useEffect, useState } from "react";
import { getElectronBridge } from "@/lib/electron";
import type { PeaksData } from "../types";

export function useWaveformPeaks(surahId: number, reciterId: string) {
  const [peaksData, setPeaksData] = useState<PeaksData | null>(null);
  const [peaksLoading, setPeaksLoading] = useState(false);

  useEffect(() => {
    async function fetchPeaks() {
      if (!surahId || !reciterId) {
        setPeaksData(null);
        setPeaksLoading(false);
        return;
      }

      setPeaksLoading(true);
      try {
        const data = await getElectronBridge().peaks.get(reciterId, surahId);
        setPeaksData(data && data.peaks ? data : null);
      } catch {
        setPeaksData(null);
      } finally {
        setPeaksLoading(false);
      }
    }

    void fetchPeaks();
  }, [surahId, reciterId]);

  return { peaksData, peaksLoading };
}
