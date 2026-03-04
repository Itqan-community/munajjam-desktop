"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Play,
  Pause,
  Loader2,
  FolderOpen,
  FileAudio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import ReciterSelector from "./ReciterSelector";
import { useWorkspace } from "@/lib/workspace-context";
import { useReciters } from "@/lib/reciters-context";
import { getSurahName } from "@/lib/surah-metadata";
import { allSurahs } from "@/lib/surah-metadata";
import { getElectronBridge } from "@/lib/electron";
import { useAudioSelection } from "./setup/hooks/use-audio-selection";
import { useRecitationVersionResolver } from "./setup/hooks/use-recitation-version-resolver";

interface WorkspaceSetupViewProps {
  locale: "en" | "ar";
}

export default function WorkspaceSetupView({ locale }: WorkspaceSetupViewProps) {
  const t = useTranslations("qa.workspace");
  const isRTL = locale === "ar";
  const { activeWorkspace, dispatch } = useWorkspace();
  const { reciters: allReciters } = useReciters();

  const [reciterId, setReciterId] = useState(activeWorkspace?.reciterId ?? "badr_alturki");
  const { versionId, resolveVersionId } = useRecitationVersionResolver(reciterId);

  const [submitting, setSubmitting] = useState(false);
  const {
    audioDir,
    scanning,
    scannedFiles,
    manualAssignments,
    selectionMode,
    recognizedFiles,
    unrecognizedFiles,
    allIdentified,
    allSurahIds,
    canSubmit,
    handleSelectAudioFolder,
    handleSelectAudioFiles,
    handleManualAssign,
  } = useAudioSelection();

  // Audio preview state
  const [playingFile, setPlayingFile] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);


  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayPause = useCallback((fullPath: string) => {
    if (playingFile === fullPath) {
      // Pause current
      audioRef.current?.pause();
      setPlayingFile(null);
      return;
    }
    // Stop previous
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(`file://${fullPath}`);
    audio.onended = () => setPlayingFile(null);
    audio.play();
    audioRef.current = audio;
    setPlayingFile(fullPath);
  }, [playingFile]);

  const handleStart = async () => {
    if (!activeWorkspace || !audioDir || allSurahIds.length === 0) return;
    setSubmitting(true);
    try {
      const bridge = getElectronBridge();

      // Ensure we have a version
      const resolvedVersionId = versionId ?? (await resolveVersionId());
      if (!resolvedVersionId) {
        throw new Error("Failed to resolve recitation version");
      }

      // Upsert audio file records for all detected files
      const audioRows = scannedFiles.map((f) => {
        const surahId = f.surahId ?? manualAssignments[f.filename];
        const ext = f.filename.split(".").pop() || "mp3";
        return {
          reciter_id: reciterId,
          surah_id: surahId,
          audio_path: f.fullPath,
          format: ext,
        };
      });
      await bridge.data.upsertAudioFiles(audioRows);

      // Start the alignment job
      const reciter = allReciters.find((r) => r.id === reciterId);
      const job = await bridge.jobs.start({
        audioDir,
        reciterId,
        recitationId: resolvedVersionId,
        reciterName: reciter?.nameEnglish ?? reciterId,
        surahIds: allSurahIds,
      });

      dispatch({
        type: "START_PROCESSING",
        id: activeWorkspace.id,
        reciterId,
        versionId: resolvedVersionId,
        surahIds: allSurahIds,
        audioDir,
        jobId: job.id,
      });
    } catch (err) {
      console.error("Failed to start processing:", err);
      setSubmitting(false);
    }
  };

  if (!activeWorkspace) return null;

  // Surah IDs already assigned (to prevent duplicates in dropdowns)
  const usedSurahIds = new Set(allSurahIds);

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.3, ease: [0.16, 1, 0.3, 1] },
    }),
  };

  return (
    <div className="flex-1 flex items-center justify-center overflow-hidden py-4 px-6">
      <div className="w-full max-w-xl space-y-4 my-auto">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-4"
        >
          <h2 className="text-3xl font-bold text-white">{t("setupTitle")}</h2>
          <p className="text-base text-white/40 mt-2">{t("setupDescription")}</p>
        </motion.div>

        {/* Section 1: Audio Source */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="p-4 bg-white/[0.1] backdrop-blur-md border border-white/[0.12] rounded-xl"
        >
          <label className="block text-sm uppercase tracking-wider text-white/40 mb-3">
            {t("selectAudioFolder")}
          </label>

          {!audioDir ? (
            /* Large dashed drop zone with dual buttons */
            <div className="w-full flex flex-col items-center justify-center gap-3 px-6 py-6 border-2 border-dashed border-white/20 rounded-xl">
              <FolderOpen className="w-10 h-10 text-white/50" />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAudioFolder}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-base rounded-lg transition-colors app-no-drag"
                >
                  <FolderOpen className="w-4 h-4" />
                  {t("selectFolder")}
                </button>
                <span className="text-sm text-white/30">{t("or")}</span>
                <button
                  onClick={handleSelectAudioFiles}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-base rounded-lg transition-colors app-no-drag"
                >
                  <FileAudio className="w-4 h-4" />
                  {t("selectAudioFiles")}
                </button>
              </div>
              <span className="text-sm text-white/40">{t("audioSourceHint")}</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Selected source + Change button */}
              <div className="flex items-center gap-2">
                {selectionMode === "files" ? (
                  <FileAudio className="w-4 h-4 text-white/40 shrink-0" />
                ) : (
                  <FolderOpen className="w-4 h-4 text-white/40 shrink-0" />
                )}
                <span dir="ltr" className="text-base text-white/70 truncate flex-1">
                  {selectionMode === "files"
                    ? t("filesSelected", { count: scannedFiles.length })
                    : audioDir}
                </span>
                <button
                  onClick={selectionMode === "files" ? handleSelectAudioFiles : handleSelectAudioFolder}
                  className="px-3 py-1 text-sm text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors app-no-drag shrink-0"
                >
                  {t("change")}
                </button>
              </div>

              {/* Scanning indicator */}
              {scanning && (
                <div className="flex items-center gap-2 text-sm text-white/50 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("scanningFolder")}
                </div>
              )}

              {/* No files found */}
              {!scanning && scannedFiles.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-red-400 py-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {t("noAudioFilesFound")}
                </div>
              )}

              {/* File list */}
              {!scanning && scannedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {/* Recognized files */}
                    {recognizedFiles.map((f) => (
                      <div
                        key={f.filename}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        <span dir="ltr" className="text-white/60 shrink-0">{f.filename}</span>
                        <span className="text-white/30 mx-1">&rarr;</span>
                        <span className="text-green-400 truncate">
                          {getSurahName(f.surahId!, locale)}
                        </span>
                      </div>
                    ))}

                    {/* Unrecognized files */}
                    {unrecognizedFiles.map((f) => (
                      <div
                        key={f.filename}
                        className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span dir="ltr" className="text-white/60 shrink-0">{f.filename}</span>
                        <span className="text-white/30 mx-1">&rarr;</span>
                        <select
                          value={manualAssignments[f.filename] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) handleManualAssign(f.filename, Number(val));
                          }}
                          className="flex-1 min-w-0 px-2 py-1 bg-neutral-900 border border-white/10 text-sm text-white rounded app-no-drag"
                        >
                          <option value="" className="bg-neutral-900">
                            {t("selectSurah")}
                          </option>
                          {allSurahs.map((s) => (
                            <option
                              key={s.id}
                              value={s.id}
                              disabled={usedSurahIds.has(s.id) && manualAssignments[f.filename] !== s.id}
                              className="bg-neutral-900"
                            >
                              {s.id}. {locale === "ar" ? s.nameArabic : s.nameTransliteration}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handlePlayPause(f.fullPath)}
                          className="p-1.5 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded transition-colors app-no-drag shrink-0"
                          title={t("playToIdentify")}
                        >
                          {playingFile === f.fullPath ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Summary line */}
                  <div className="text-sm text-white/40 pt-1">
                    {unrecognizedFiles.length > 0
                      ? t("filesNeedId", { total: scannedFiles.length, count: unrecognizedFiles.length })
                      : t("surahsDetected", { count: allSurahIds.length })}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Section 2: Reciter */}
        <motion.div
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="p-4 bg-white/[0.1] backdrop-blur-md border border-white/[0.12] rounded-xl"
        >
          <label className="block text-sm uppercase tracking-wider text-white/40 mb-2">
            {t("selectReciter")}
          </label>
          <ReciterSelector
            selectedReciterId={reciterId}
            onReciterChange={setReciterId}
            locale={locale}
          />
        </motion.div>

        {/* Process button */}
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <button
            onClick={handleStart}
            disabled={!canSubmit || submitting}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-white text-black font-semibold text-base hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors app-no-drag rounded-xl"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {allSurahIds.length > 1
              ? t("processMultipleSurahs", { count: allSurahIds.length })
              : t("processAudio")}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
