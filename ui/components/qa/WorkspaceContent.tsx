"use client";

import { useCallback, useEffect } from "react";
import WaveformEditor from "./WaveformEditor";
import CurrentAyahStrip from "./CurrentAyahStrip";
import AyahList from "./AyahList";
import { useWorkspace } from "@/lib/workspace-context";
import { allSurahs } from "@/lib/surah-metadata";
import { getCurrentSegmentIndex } from "@/lib/segment-utils";

export default function WorkspaceContent() {
  const { activeWorkspace, dispatch, session, updateWorkspace } = useWorkspace();

  const workspace = activeWorkspace;
  const workspaceId = workspace?.id ?? "";
  const workspaceVersionId = workspace?.versionId ?? null;
  const workspaceSurahId = workspace?.activeSurahId ?? 0;
  const workspaceSegments = workspace?.segments ?? [];
  const workspaceCurrentTime = workspace?.currentTime ?? 0;
  const workspaceCurrentSegmentIndex = workspace?.currentSegmentIndex ?? null;

  useEffect(() => {
    if (!workspaceId) {
      return;
    }
    session.setSegmentsSnapshot(workspaceId, workspaceSegments);
  }, [workspaceId, workspaceSegments, session]);

  useEffect(() => {
    return () => {
      if (!workspaceId) {
        return;
      }
      void session.flushWorkspaceSaves({
        workspaceId,
        versionId: workspaceVersionId,
        surahId: workspaceSurahId,
      });
    };
  }, [workspaceId, workspaceVersionId, workspaceSurahId, session]);

  const handleSegmentUpdate = useCallback(
    (ayahIndex: number, updates: { start?: number; end?: number }) => {
      if (!workspaceId) {
        return;
      }

      session.queueSegmentUpdate({
        workspaceId,
        versionId: workspaceVersionId,
        surahId: workspaceSurahId,
        ayahIndex,
        updates,
        onSegmentsChange: (segments) => {
          updateWorkspace(workspaceId, { segments });
        },
      });
    },
    [workspaceId, workspaceVersionId, workspaceSurahId, session, updateWorkspace],
  );

  const handleTimeUpdate = useCallback(
    (time: number) => {
      if (!workspaceId) {
        return;
      }
      session.setCurrentTime(workspaceId, time);
    },
    [workspaceId, session],
  );

  useEffect(() => {
    if (!workspaceId || workspaceSegments.length === 0) {
      return;
    }

    const nextSegmentIndex = getCurrentSegmentIndex(workspaceCurrentTime, workspaceSegments);
    if (nextSegmentIndex !== workspaceCurrentSegmentIndex) {
      session.setCurrentSegmentIndex(workspaceId, nextSegmentIndex);
    }
  }, [
    workspaceId,
    workspaceCurrentTime,
    workspaceSegments,
    workspaceCurrentSegmentIndex,
    session,
  ]);

  const handleSeekTo = useCallback(
    (time: number, autoPlay = false) => {
      if (!workspaceId) {
        return;
      }
      session.requestSeek(workspaceId, time, autoPlay);
    },
    [workspaceId, session],
  );

  if (!workspace || workspace.status !== "ready") {
    return null;
  }

  const currentSegment =
    workspaceCurrentSegmentIndex !== null
      ? workspace.segments[workspaceCurrentSegmentIndex] ?? null
      : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {workspace.surahIds.length > 1 && (
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-2 overflow-x-auto border-b border-white/[0.08]">
          {workspace.surahIds.map((surahId) => {
            const surah = allSurahs.find((candidate) => candidate.id === surahId);
            const isActive = surahId === workspace.activeSurahId;
            return (
              <button
                key={surahId}
                onClick={() =>
                  dispatch({
                    type: "SET_ACTIVE_SURAH",
                    workspaceId: workspace.id,
                    surahId,
                  })
                }
                className={`shrink-0 px-3 py-1 text-xs rounded-full transition-colors ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white/70"
                }`}
              >
                {surah?.nameArabic ?? `Surah ${surahId}`}
              </button>
            );
          })}
        </div>
      )}

      <div className="shrink-0">
        <WaveformEditor
          key={workspace.id}
          audioUrl={workspace.audioUrl}
          segments={workspace.segments}
          surahId={workspace.activeSurahId}
          reciterId={workspace.reciterId}
          onSegmentUpdate={handleSegmentUpdate}
          onTimeUpdate={handleTimeUpdate}
          currentSegmentIndex={workspaceCurrentSegmentIndex}
          seekRequest={workspace.seekRequest}
          saveStatus={workspace.saveStatus}
        />
      </div>

      <CurrentAyahStrip segment={currentSegment} />

      <div className="flex-1 overflow-hidden p-4">
        <AyahList
          segments={workspace.segments}
          currentSegmentIndex={workspaceCurrentSegmentIndex}
          onSeekTo={handleSeekTo}
        />
      </div>
    </div>
  );
}
