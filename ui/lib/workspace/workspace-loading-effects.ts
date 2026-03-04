import { useEffect, useRef } from "react";
import { listAlignments, type AlignmentRow } from "../qa-data";
import { getAudioUrl } from "../audio/audio-helpers";
import { fetchQuranText, mergeQuranTextIntoSegments } from "../quran-text";
import type { Segment, WorkspaceRecord } from "./workspace-domain-types";

interface UseWorkspaceLoadingEffectsInput {
  workspaces: WorkspaceRecord[];
  updateWorkspace: (workspaceId: string, updates: Partial<WorkspaceRecord>) => void;
}

export function useWorkspaceLoadingEffects({
  workspaces,
  updateWorkspace,
}: UseWorkspaceLoadingEffectsInput): void {
  const loadingTriggered = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const workspace of workspaces) {
      if (workspace.status !== "loading" || loadingTriggered.current.has(workspace.id)) {
        continue;
      }
      loadingTriggered.current.add(workspace.id);

      (async () => {
        try {
          if (!workspace.versionId) {
            updateWorkspace(workspace.id, {
              error: "No version selected.",
              loading: false,
              status: "error",
            });
            return;
          }

          const [alignments, audioUrl] = await Promise.all([
            listAlignments(workspace.versionId, workspace.activeSurahId),
            getAudioUrl(workspace.activeSurahId, workspace.reciterId),
          ]);

          if (!alignments || alignments.length === 0) {
            updateWorkspace(workspace.id, {
              error: "No alignments found for this surah. Upload timestamps first.",
              loading: false,
              status: "error",
              audioUrl,
            });
            return;
          }

          const convertedSegments: Segment[] = (alignments as AlignmentRow[]).map((alignment) => ({
            ayah_number: alignment.ayah_number,
            start: alignment.start_time,
            end: alignment.end_time,
            text: "",
            similarity: alignment.similarity_score || 0,
          }));

          const quranText = await fetchQuranText(workspace.activeSurahId);
          const segments = mergeQuranTextIntoSegments(convertedSegments, quranText);

          updateWorkspace(workspace.id, {
            segments,
            audioUrl,
            loading: false,
            status: "ready",
            error: null,
          });
        } catch (error) {
          updateWorkspace(workspace.id, {
            error: error instanceof Error ? error.message : "Failed to load data",
            loading: false,
            status: "error",
          });
        } finally {
          loadingTriggered.current.delete(workspace.id);
        }
      })();
    }
  }, [workspaces, updateWorkspace]);
}
