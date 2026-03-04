"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/lib/workspace-context";
import { useReciters } from "@/lib/reciters-context";
import { allSurahs } from "@/lib/surah-metadata";
import { getElectronBridge } from "@/lib/electron";

interface TitleBarProps {
  locale: string;
}

export default function TitleBar({ locale }: TitleBarProps) {
  const t = useTranslations("qa.workspace");
  const tQa = useTranslations("qa");
  const isRTL = locale === "ar";
  const { activeWorkspace } = useWorkspace();
  const { reciters: allReciters } = useReciters();

  // Build active workspace label
  let centerLabel = "";
  if (activeWorkspace) {
    if (activeWorkspace.status === "setup") {
      centerLabel = t("newWorkspace");
    } else {
      const reciter = allReciters.find(
        (r) => r.id === activeWorkspace.reciterId
      );
      const surah = allSurahs.find((s) => s.id === activeWorkspace.activeSurahId);
      const reciterName = reciter
        ? isRTL
          ? reciter.nameArabic
          : reciter.nameTransliteration
        : "";
      const surahName = surah
        ? isRTL
          ? surah.nameArabic
          : surah.nameTransliteration
        : "";
      if (reciterName && surahName) {
        centerLabel = `${reciterName} — ${surahName}`;
      } else if (reciterName) {
        centerLabel = reciterName;
      }
    }
  }

  const [exporting, setExporting] = useState(false);

  const handleExportCurrentSurah = async () => {
    if (
      !activeWorkspace ||
      activeWorkspace.status !== "ready" ||
      activeWorkspace.segments.length === 0
    )
      return;

    setExporting(true);
    try {
      const surah = allSurahs.find((s) => s.id === activeWorkspace.activeSurahId);
      const reciter = allReciters.find(
        (r) => r.id === activeWorkspace.reciterId
      );

      const exportData = {
        surah_id: activeWorkspace.activeSurahId,
        surah_name: surah?.nameArabic || "",
        reciter: activeWorkspace.reciterId,
        total_ayahs: surah?.ayahCount || 0,
        aligned_ayahs: activeWorkspace.segments.length,
        avg_similarity:
          activeWorkspace.segments.reduce((sum, s) => sum + s.similarity, 0) /
          activeWorkspace.segments.length,
        ayahs: activeWorkspace.segments.map((s) => ({
          ayah_number: s.ayah_number,
          start: s.start,
          end: s.end,
          text: s.text,
          similarity: s.similarity,
        })),
      };

      const padded = String(activeWorkspace.activeSurahId).padStart(3, "0");
      const defaultName = `${activeWorkspace.reciterId}_surah_${padded}.json`;

      const bridge = getElectronBridge();
      const saveTarget = await bridge.dialog.saveFile({
        defaultPath: defaultName,
      });
      if (saveTarget) {
        await bridge.export.writeJson(saveTarget.token, exportData);
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className={`h-11 app-drag flex items-center shrink-0 px-4 ${isRTL ? "pl-[76px]" : ""}`}
    >
      {/* Center zone: active workspace info + stats */}
      <div className="flex-1 flex items-center justify-center min-w-0 gap-2">
        {activeWorkspace && (
          <>
            <span className="text-sm text-white/70 truncate">
              {centerLabel}
            </span>
            {activeWorkspace.status === "ready" && activeWorkspace.segments.length > 0 && (() => {
              const segs = activeWorkspace.segments;
              const avgSim = segs.reduce((sum, s) => sum + s.similarity, 0) / segs.length;
              const avgColor = avgSim >= 0.95 ? "text-green-400" : avgSim >= 0.9 ? "text-yellow-400" : "text-red-400";
              return (
                <span className="text-xs text-white/40 shrink-0 flex items-center gap-1.5">
                  <span className="text-white/20">&middot;</span>
                  <span>{segs.length} {tQa("segments")}</span>
                  <span className="text-white/20">&middot;</span>
                  <span className={avgColor}>{(avgSim * 100).toFixed(1)}%</span>
                </span>
              );
            })()}
          </>
        )}
      </div>

      {/* Export button */}
      {activeWorkspace?.status === "ready" &&
        activeWorkspace.segments.length > 0 && (
          <button
            onClick={handleExportCurrentSurah}
            disabled={exporting}
            className="flex items-center gap-1.5 px-2 py-1 hover:bg-white/10 transition-colors text-white/60 disabled:opacity-40 app-no-drag rounded-lg shrink-0"
            aria-label="Export timestamps"
          >
            <Download className={`w-3.5 h-3.5 ${exporting ? "animate-pulse" : ""}`} />
          </button>
        )}
    </div>
  );
}
