"use client";

import { useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Loader2, SkipForward, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { allSurahs } from "@/lib/surah-metadata";
import type { JobRecord } from "@/lib/workspace-types";
import { getElectronBridge } from "@/lib/electron";
import { deriveProcessingState, type SurahState } from "./processing/derive-processing-state";

interface ProcessingViewProps {
  job: JobRecord | null;
  jobId: string | null;
  locale: string;
}

// ── Stage labels ──────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, { en: string; ar: string }> = {
  silence:      { en: "Detecting silences",   ar: "كشف فترات الصمت" },
  transcribing: { en: "Transcribing audio",   ar: "نسخ الصوت" },
  aligning:     { en: "Aligning ayahs",       ar: "محاذاة الآيات" },
  saving:       { en: "Saving results",       ar: "حفظ النتائج" },
};

const STAGE_ORDER = ["silence", "transcribing", "aligning", "saving"];

// ── Sub-components ────────────────────────────────────────────────────────────

function SurahCard({ state, locale }: { state: SurahState; locale: string }) {
  const isRTL = locale === "ar";
  const surah = allSurahs.find((s) => s.id === state.surahId);
  const name = surah
    ? isRTL ? surah.nameArabic : surah.nameTransliteration
    : `Surah ${state.surahId}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`px-4 py-3 ${isRTL ? "text-right" : ""}`}
    >
      {/* Row 1: icon + surah name + badge */}
      <div className={`flex items-center gap-2.5 ${isRTL ? "flex-row-reverse" : ""}`}>
        {state.status === "done" && (
          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
        )}
        {state.status === "error" && (
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
        )}
        {state.status === "skipped" && (
          <SkipForward className="w-4 h-4 text-white/30 shrink-0" />
        )}

        <span className="text-sm font-medium text-white truncate flex-1">{name}</span>

        {state.status === "done" && state.similarity != null && (
          <span className={`text-xs font-medium shrink-0 ${
            state.similarity >= 0.95 ? "text-green-400" :
            state.similarity >= 0.85 ? "text-yellow-400" : "text-red-400"
          }`}>
            {(state.similarity * 100).toFixed(1)}%
          </span>
        )}
        {state.status === "done" && state.seconds != null && (
          <span className="text-[11px] text-white/30 shrink-0">
            {state.seconds.toFixed(1)}s
          </span>
        )}
        {state.status === "skipped" && (
          <span className="text-[11px] text-white/30 shrink-0">skipped</span>
        )}
      </div>

      {/* Row 2: live stage + progress for running surahs */}
      {state.status === "running" && (
        <div className={`mt-2 space-y-1.5 ${isRTL ? "mr-6.5" : "ml-6.5"}`}>
          {/* Stage pills */}
          <div className={`flex items-center gap-1.5 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
            {STAGE_ORDER.map((stage) => {
              const isCurrent = state.stage === stage;
              const currentIdx = state.stage ? STAGE_ORDER.indexOf(state.stage) : -1;
              const stageIdx = STAGE_ORDER.indexOf(stage);
              const isPast = currentIdx > stageIdx;
              const showCounter = isCurrent && state.stageCurrent != null && state.stageTotal != null;

              return (
                <span
                  key={stage}
                  className={`text-[10px] px-1.5 py-0.5 rounded-md transition-colors ${
                    isCurrent
                      ? "bg-amber-400/20 text-amber-400 font-medium"
                      : isPast
                        ? "bg-white/5 text-white/40"
                        : "bg-white/5 text-white/20"
                  }`}
                >
                  {isRTL
                    ? STAGE_LABELS[stage]?.ar ?? stage
                    : STAGE_LABELS[stage]?.en ?? stage}
                  {showCounter && (
                    <span className="text-amber-400/70 ml-1">
                      {state.stageCurrent}/{state.stageTotal}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Row 2 alt: ayah count for done surahs */}
      {state.status === "done" && state.aligned != null && state.totalAyahs != null && (
        <p className={`text-[11px] text-white/30 mt-0.5 ${isRTL ? "mr-6.5" : "ml-6.5"}`}>
          {state.aligned}/{state.totalAyahs} ayahs aligned
        </p>
      )}

      {/* Row 2 alt: error message */}
      {state.status === "error" && state.error && (
        <p className={`text-[11px] text-red-400/70 mt-0.5 truncate ${isRTL ? "mr-6.5" : "ml-6.5"}`}>
          {state.error}
        </p>
      )}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProcessingView({ job, jobId, locale }: ProcessingViewProps) {
  const t = useTranslations("qa.workspace");
  const isRTL = locale === "ar";
  const scrollRef = useRef<HTMLDivElement>(null);

  const processed = job?.processed ?? 0;
  const total = job?.total_surahs ?? 0;
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const jobStatus = job?.status ?? "queued";

  const derived = useMemo(() => deriveProcessingState(job?.logs ?? []), [job?.logs]);
  const surahCount = derived.surahs.length;

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [surahCount, derived.surahs[surahCount - 1]?.percent]);

  return (
    <div className="flex items-start justify-center min-h-[60vh] py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h3 className="text-lg font-semibold text-white">{t("processing")}</h3>
          <p className="text-sm text-white/40">{t("processingDescription")}</p>
        </div>

        {/* Status line */}
        <div className={`flex items-center justify-center gap-2 text-xs text-white/50 ${isRTL ? "flex-row-reverse" : ""}`}>
          <span>
            {jobStatus === "queued" && t("jobQueued")}
            {jobStatus === "running" && total > 0 && `${processed}/${total} (${pct}%)`}
          </span>
        </div>

        {/* Steps feed card */}
        <div className="bg-white/[0.1] backdrop-blur-md border border-white/[0.12] rounded-lg overflow-hidden">
          {/* Feed header */}
          <div className={`px-4 py-2.5 border-b border-white/10 flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            {jobStatus === "running" && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            )}
            <span className="text-xs font-medium text-white/60">{t("processingSteps")}</span>
          </div>

          {/* Scrollable content */}
          <div ref={scrollRef} className="max-h-96 overflow-y-auto">
            {/* Waiting state */}
            {derived.surahs.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto mb-2" />
                <p className="text-xs text-white/30">{t("processingWaiting")}</p>
              </div>
            )}

            {/* Surah cards */}
            {derived.surahs.length > 0 && (
              <div className="divide-y divide-white/5">
                <AnimatePresence initial={false}>
                  {derived.surahs.map((s) => (
                    <SurahCard key={s.surahId} state={s} locale={locale} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Cancel */}
        {jobId && (
          <div className="text-center">
            <button
              onClick={() => getElectronBridge().jobs.cancel(jobId)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/60 hover:text-white transition-colors app-no-drag rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
              {t("cancelProcessing")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
