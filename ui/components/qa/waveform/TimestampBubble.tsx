"use client";

import { useEffect, useRef } from "react";
import { Clock, X } from "lucide-react";
import { TimeInput } from "./TimeInput";
import type { EditingState } from "./types";

interface TimestampBubbleProps {
  editingState: EditingState;
  onClose: () => void;
  onUpdateStart: (newValue: number) => void;
  onUpdateEnd: (newValue: number) => void;
  t: (key: string) => string;
}

export function TimestampBubble({
  editingState,
  onClose,
  onUpdateStart,
  onUpdateEnd,
  t,
}: TimestampBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={bubbleRef}
      className="fixed z-[100]"
      style={{
        left: `${editingState.position.x}px`,
        top: `${editingState.position.y}px`,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="bg-gradient-to-b from-[var(--bubble-bg-from)] to-[var(--bubble-bg-to)] border border-white/15 rounded-xl shadow-2xl shadow-black/90 p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/50" />
            <span className="text-xs font-semibold text-white/90">
              {t("ayah")} {editingState.ayahNumber}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-start gap-2">
          <TimeInput label={t("start")} value={editingState.startValue} onChange={onUpdateStart} />
          <div className="flex items-center h-full pt-6">
            <span className="text-white/30 text-xs">→</span>
          </div>
          <TimeInput label={t("end")} value={editingState.endValue} onChange={onUpdateEnd} />
        </div>

        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
            {t("waveform.duration")}
          </span>
          <span className="text-xs font-mono text-white/70 font-semibold">
            {(editingState.endValue - editingState.startValue).toFixed(2)}s
          </span>
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-[#0f0f0f]" />
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-[9px] w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[9px] border-t-white/15" />
    </div>
  );
}
