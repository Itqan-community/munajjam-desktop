"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useReciters } from "@/lib/reciters-context";
import type { ReciterInfo } from "@/lib/reciter-metadata";
import { allSurahs } from "@/lib/surah-metadata";
import type { WorkspaceRecord } from "@/lib/workspace-types";

interface WorkspaceItemProps {
  workspace: WorkspaceRecord;
  isActive: boolean;
  isSelected?: boolean;
  locale: "en" | "ar";
  onClick: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  jobProgress?: { processed: number; total: number } | null;
}

function getLabel(
  workspace: WorkspaceRecord,
  locale: "en" | "ar",
  newWorkspaceText: string,
  setupSubtitleText: string,
  reciters: ReciterInfo[],
): string {
  if (workspace.status === "setup") return newWorkspaceText;

  const isRTL = locale === "ar";
  const reciter = reciters.find((r) => r.id === workspace.reciterId);
  const surah = allSurahs.find((s) => s.id === workspace.activeSurahId);

  const reciterName = isRTL
    ? reciter?.nameArabic ?? workspace.reciterId
    : reciter?.nameTransliteration ?? workspace.reciterId;
  const surahName = isRTL
    ? surah?.nameArabic ?? ""
    : surah?.nameTransliteration ?? "";

  const extra = workspace.surahIds.length > 1 ? ` (+${workspace.surahIds.length - 1})` : "";
  return `${reciterName} \u00b7 ${surahName}${extra}`;
}

function useRelativeTime(timestamp: number): string {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function ProcessingSpinner() {
  const r = 7;
  const stroke = 2;
  const size = (r + stroke) * 2;
  const circumference = 2 * Math.PI * r;

  return (
    <svg width={size} height={size} className="shrink-0 animate-spin" style={{ animationDuration: "1.2s" }}>
      <circle
        cx={r + stroke}
        cy={r + stroke}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={stroke}
      />
      <circle
        cx={r + stroke}
        cy={r + stroke}
        r={r}
        fill="none"
        stroke="#fbbf24"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference * 0.3} ${circumference * 0.7}`}
      />
    </svg>
  );
}

export default function WorkspaceItem({
  workspace,
  isActive,
  isSelected = false,
  locale,
  onClick,
  onDelete,
  onContextMenu,
  jobProgress,
}: WorkspaceItemProps) {
  const t = useTranslations("qa.workspace");
  const isRTL = locale === "ar";
  const { reciters } = useReciters();
  const label = getLabel(workspace, locale, t("newWorkspace"), t("setupSubtitle"), reciters);
  const timeAgo = useRelativeTime(workspace.lastAccessedAt);

  return (
    <motion.button
      layout
      draggable
      onDragStart={(e) => {
        const de = e as unknown as React.DragEvent;
        de.dataTransfer.setData("text/x-workspace-id", workspace.id);
        de.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`group w-full text-start px-3 py-1.5 transition-colors relative rounded-lg border-s-2 ${
        isSelected
          ? "bg-blue-500/20 border-blue-400/60"
          : isActive
            ? "bg-white/[0.14] backdrop-blur-sm border-white/60"
            : "hover:bg-white/[0.1] border-transparent"
      }`}
    >
      <div className="flex items-center gap-2">
        {workspace.status === "processing" && (
          <ProcessingSpinner />
        )}
        <span className="text-sm text-white truncate flex-1">{label}</span>
        <span className="text-[10px] text-white/30 shrink-0">{timeAgo}</span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onDelete();
            }
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/10 rounded shrink-0"
          aria-label={t("deleteWorkspace")}
        >
          <X className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
        </span>
      </div>
    </motion.button>
  );
}
