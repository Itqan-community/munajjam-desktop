"use client";

import { useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "framer-motion";
import { formatSegmentTime, getSegmentLabel, getSegmentDuration } from "@/lib/segment-utils";

interface Segment {
  ayah_number: number;
  start: number;
  end: number;
  text: string;
  similarity: number;
}

interface AyahListProps {
  segments: Segment[];
  currentSegmentIndex: number | null;
  onSeekTo: (time: number, autoPlay?: boolean) => void;
}

export default function AyahList({
  segments,
  currentSegmentIndex,
  onSeekTo,
}: AyahListProps) {
  const t = useTranslations("qa");
  const listRef = useRef<HTMLUListElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const scrollToItem = useCallback((index: number) => {
    if (!listRef.current) return;

    const clickedItem = listRef.current.querySelector(
      `[data-ayah-index="${index}"]`
    ) as HTMLLIElement | null;

    if (!clickedItem) return;

    // Use scrollIntoView for more reliable scrolling
    clickedItem.scrollIntoView({
      behavior: shouldReduceMotion ? "instant" : "smooth",
      block: "start",
    });
  }, [shouldReduceMotion]);

  const handleAyahClick = useCallback((index: number, startTime: number) => {
    scrollToItem(index);
    onSeekTo(startTime, true); // Auto-play on click
  }, [scrollToItem, onSeekTo]);

  // Arrow key navigation when list is focused
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLUListElement>) => {
      const currentIndex = currentSegmentIndex ?? -1;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, segments.length - 1);
        if (nextIndex !== currentIndex && nextIndex >= 0) {
          scrollToItem(nextIndex);
          onSeekTo(segments[nextIndex].start, true);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        if (prevIndex !== currentIndex) {
          scrollToItem(prevIndex);
          onSeekTo(segments[prevIndex].start, true);
        }
      }
      // Don't handle Space here - let it bubble to global handler
    },
    [currentSegmentIndex, segments, scrollToItem, onSeekTo]
  );

  // Auto-scroll when segment changes (e.g., from global j/k navigation)
  useEffect(() => {
    if (currentSegmentIndex !== null) {
      scrollToItem(currentSegmentIndex);
    }
  }, [currentSegmentIndex, scrollToItem]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          {t("segments")}
        </h3>
        <div className="px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/10">
          <span className="text-xs font-mono text-white/70 font-semibold tabular-nums">{segments.length}</span>
        </div>
      </div>

      {/* Segment List */}
      <ul
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-1 pr-2 -mr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-inset rounded-lg"
        role="list"
        aria-label={t("segments")}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {segments.map((segment, index) => {
          const isCurrentSegment = currentSegmentIndex === index;
          const label = getSegmentLabel(segment, t);

          return (
            <li
              key={`ayah-${segment.ayah_number}-${index}`}
              data-ayah-index={index}
              onClick={() => handleAyahClick(index, segment.start)}
              className={`relative group rounded-lg border transition-colors cursor-pointer ${
                isCurrentSegment
                  ? "bg-white/10 border-white/30"
                  : "bg-transparent border-transparent hover:bg-white/[0.06] hover:border-white/10"
              }`}
              role="listitem"
              aria-current={isCurrentSegment ? "true" : "false"}
            >
              <div className="p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {label}
                  </span>
                  {isCurrentSegment && (
                    <span className="text-[10px] text-green-400 bg-green-400/15 px-2 py-1 rounded-md border border-green-400/30 flex items-center gap-1.5 font-medium">
                      <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                      </span>
                      {t("playing")}
                    </span>
                  )}
                </div>

                <p
                  className="text-sm text-white leading-relaxed truncate"
                  dir="rtl"
                  style={{ fontFamily: "var(--font-serif)" }}
                  title={segment.text}
                >
                  {segment.text}
                </p>

                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-tertiary)]">
                  <span>
                    {formatSegmentTime(segment.start)} → {formatSegmentTime(segment.end)}
                  </span>
                  <span>{getSegmentDuration(segment)}s</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Hint */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-[var(--text-tertiary)] text-center">
          <span className="inline-flex items-center gap-2">
            <span>{t("clickToPlay")}</span>
            <span className="text-white/30">•</span>
            <span className="text-white/50">↑↓</span>
            <span>{t("toNavigate")}</span>
            <span className="text-white/30">•</span>
            <span className="font-mono text-white/50">space</span>
            <span>{t("toPause")}</span>
          </span>
        </p>
      </div>
    </div>
  );
}
