"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { allReciters, reciterRowToInfo, type ReciterInfo } from "@/lib/reciter-metadata";
import { listReciters as fetchReciters, createReciter as apiCreateReciter, saveReciterImage as apiSaveReciterImage, updateReciterImage as apiUpdateReciterImage } from "@/lib/qa-data";

interface RecitersContextValue {
  reciters: ReciterInfo[];
  addReciter: (input: { nameArabic: string; nameEnglish: string; nameTransliteration?: string }) => Promise<ReciterInfo>;
  updateReciterImage: (reciterId: string, sourcePath: string) => Promise<ReciterInfo>;
  loading: boolean;
}

const RecitersContext = createContext<RecitersContextValue>({
  reciters: allReciters,
  addReciter: async () => { throw new Error("RecitersProvider not mounted"); },
  updateReciterImage: async () => { throw new Error("RecitersProvider not mounted"); },
  loading: false,
});

export function RecitersProvider({ children }: { children: ReactNode }) {
  const [reciters, setRecitersState] = useState<ReciterInfo[]>(allReciters);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchReciters()
      .then((rows) => {
        if (cancelled) return;
        const list = rows.map(reciterRowToInfo);
        setRecitersState(list);
      })
      .catch(() => {
        // keep hardcoded fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const addReciter = useCallback(async (input: { nameArabic: string; nameEnglish: string; nameTransliteration?: string }): Promise<ReciterInfo> => {
    const row = await apiCreateReciter(input);
    const info = reciterRowToInfo(row);
    setRecitersState((prev) => [...prev, info]);
    return info;
  }, []);

  const updateReciterImage = useCallback(async (reciterId: string, sourcePath: string): Promise<ReciterInfo> => {
    const { imagePath } = await apiSaveReciterImage(sourcePath, reciterId);
    const row = await apiUpdateReciterImage(reciterId, imagePath);
    const info = reciterRowToInfo(row);
    setRecitersState((prev) => prev.map((r) => (r.id === reciterId ? info : r)));
    return info;
  }, []);

  return (
    <RecitersContext.Provider value={{ reciters, addReciter, updateReciterImage, loading }}>
      {children}
    </RecitersContext.Provider>
  );
}

export function useReciters() {
  return useContext(RecitersContext);
}
