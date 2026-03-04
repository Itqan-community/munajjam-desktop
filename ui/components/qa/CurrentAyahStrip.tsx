"use client";

import { useTranslations } from "next-intl";
import { formatSegmentTime } from "@/lib/segment-utils";

interface Segment {
  ayah_number: number;
  start: number;
  end: number;
  text: string;
  similarity: number;
}

interface CurrentAyahStripProps {
  segment: Segment | null;
}

export default function CurrentAyahStrip({ segment }: CurrentAyahStripProps) {
  const t = useTranslations("qa");

  if (!segment) {
    return (
      <div className="h-12 shrink-0 bg-white/[0.03] border-y border-white/[0.06] flex items-center justify-center px-4">
        <span className="text-sm text-white/30">{t("noAyahPlaying")}</span>
      </div>
    );
  }

  const similarityPct = segment.similarity * 100;
  const similarityColor =
    segment.similarity >= 0.95
      ? "bg-green-400"
      : segment.similarity >= 0.9
        ? "bg-yellow-400"
        : "bg-red-400";
  const similarityTextColor =
    segment.similarity >= 0.95
      ? "text-green-400"
      : segment.similarity >= 0.9
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="h-12 shrink-0 bg-white/[0.03] border-y border-white/[0.06] flex items-center gap-3 px-4">
      {/* Ayah badge */}
      <span className="shrink-0 px-2 py-0.5 rounded-md bg-white/10 text-xs font-semibold text-white/80 font-mono">
        {t("ayah")} {segment.ayah_number}
      </span>

      {/* Arabic text */}
      <p
        className="text-base text-white truncate flex-1"
        dir="rtl"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {segment.text}
      </p>

      {/* Timestamps */}
      <span className="shrink-0 text-xs font-mono text-white/50">
        {formatSegmentTime(segment.start)} → {formatSegmentTime(segment.end)}
      </span>

      {/* Similarity */}
      <span className="shrink-0 flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${similarityColor}`} />
        <span className={`text-xs font-medium ${similarityTextColor}`}>
          {similarityPct.toFixed(1)}%
        </span>
      </span>
    </div>
  );
}
