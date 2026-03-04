import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { updateAlignment } from "../qa-data";
import type { Segment, WorkspaceRecord } from "./workspace-domain-types";
import {
  DEFAULT_WORKSPACE_SESSION,
  type SaveStatus,
  type WorkspaceSessionMap,
  type WorkspaceSessionState,
} from "./workspace-session-types";

interface QueueSegmentUpdateInput {
  workspaceId: string;
  versionId: string | null;
  surahId: number;
  ayahIndex: number;
  updates: { start?: number; end?: number };
  onSegmentsChange: (segments: Segment[]) => void;
}

interface FlushWorkspaceInput {
  workspaceId: string;
  versionId: string | null;
  surahId: number;
}

interface WorkspaceSessionController {
  sessions: WorkspaceSessionMap;
  getSession: (workspaceId: string) => WorkspaceSessionState;
  setCurrentTime: (workspaceId: string, currentTime: number) => void;
  setCurrentSegmentIndex: (workspaceId: string, index: number | null) => void;
  requestSeek: (workspaceId: string, time: number, autoPlay?: boolean) => void;
  setSaveStatus: (workspaceId: string, status: SaveStatus) => void;
  resetSession: (workspaceId: string) => void;
  setSegmentsSnapshot: (workspaceId: string, segments: Segment[]) => void;
  queueSegmentUpdate: (input: QueueSegmentUpdateInput) => void;
  flushWorkspaceSaves: (input: FlushWorkspaceInput) => Promise<void>;
  pruneSessions: (workspaces: WorkspaceRecord[]) => void;
  removeWorkspaceSession: (workspaceId: string) => void;
}

const SEGMENT_SAVE_DEBOUNCE_MS = 500;
const SEGMENT_SAVE_RESET_MS = 2000;

function getDefaultSession(): WorkspaceSessionState {
  return { ...DEFAULT_WORKSPACE_SESSION };
}

export function useWorkspaceSession(): WorkspaceSessionController {
  const [sessions, setSessions] = useState<WorkspaceSessionMap>({});

  const segmentsByWorkspaceRef = useRef<Map<string, Segment[]>>(new Map());
  const pendingUpdatesRef = useRef<Map<string, Map<number, { start?: number; end?: number }>>>(new Map());
  const saveDebounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const saveResetTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const getSession = useCallback(
    (workspaceId: string): WorkspaceSessionState => sessions[workspaceId] ?? getDefaultSession(),
    [sessions],
  );

  const updateSession = useCallback(
    (workspaceId: string, patch: Partial<WorkspaceSessionState>) => {
      setSessions((previous) => ({
        ...previous,
        [workspaceId]: {
          ...(previous[workspaceId] ?? getDefaultSession()),
          ...patch,
        },
      }));
    },
    [],
  );

  const setCurrentTime = useCallback(
    (workspaceId: string, currentTime: number) => {
      updateSession(workspaceId, { currentTime });
    },
    [updateSession],
  );

  const setCurrentSegmentIndex = useCallback(
    (workspaceId: string, currentSegmentIndex: number | null) => {
      updateSession(workspaceId, { currentSegmentIndex });
    },
    [updateSession],
  );

  const requestSeek = useCallback(
    (workspaceId: string, time: number, autoPlay = false) => {
      updateSession(workspaceId, {
        seekRequest: {
          time,
          id: Date.now(),
          autoPlay,
        },
      });
    },
    [updateSession],
  );

  const setSaveStatus = useCallback(
    (workspaceId: string, saveStatus: SaveStatus) => {
      updateSession(workspaceId, { saveStatus });
    },
    [updateSession],
  );

  const resetSession = useCallback((workspaceId: string) => {
    setSessions((previous) => ({
      ...previous,
      [workspaceId]: getDefaultSession(),
    }));
  }, []);

  const setSegmentsSnapshot = useCallback((workspaceId: string, segments: Segment[]) => {
    segmentsByWorkspaceRef.current.set(workspaceId, segments);
  }, []);

  const flushWorkspaceSaves = useCallback(
    async ({ workspaceId, versionId, surahId }: FlushWorkspaceInput) => {
      const pending = pendingUpdatesRef.current.get(workspaceId);
      if (!pending || pending.size === 0 || !versionId) {
        return;
      }

      setSaveStatus(workspaceId, "saving");

      const updates = new Map(pending);
      pending.clear();

      let hasError = false;

      for (const [ayahIndex, changeSet] of updates) {
        const segment = segmentsByWorkspaceRef.current.get(workspaceId)?.[ayahIndex];
        if (!segment) {
          continue;
        }

        try {
          await updateAlignment({
            recitation_id: versionId,
            surah_id: surahId,
            ayah_number: segment.ayah_number,
            start_time: changeSet.start ?? segment.start,
            end_time: changeSet.end ?? segment.end,
          });
        } catch (error) {
          hasError = true;
          console.error("Failed to persist alignment update", error);
        }
      }

      setSaveStatus(workspaceId, hasError ? "error" : "saved");

      const existingResetTimer = saveResetTimersRef.current.get(workspaceId);
      if (existingResetTimer) {
        clearTimeout(existingResetTimer);
      }

      const resetTimer = setTimeout(() => {
        setSaveStatus(workspaceId, "idle");
      }, SEGMENT_SAVE_RESET_MS);
      saveResetTimersRef.current.set(workspaceId, resetTimer);
    },
    [setSaveStatus],
  );

  const queueSegmentUpdate = useCallback(
    ({ workspaceId, versionId, surahId, ayahIndex, updates, onSegmentsChange }: QueueSegmentUpdateInput) => {
      const currentSegments = segmentsByWorkspaceRef.current.get(workspaceId) ?? [];
      if (!currentSegments[ayahIndex]) {
        return;
      }

      const nextSegments = [...currentSegments];
      nextSegments[ayahIndex] = { ...nextSegments[ayahIndex], ...updates };
      setSegmentsSnapshot(workspaceId, nextSegments);
      onSegmentsChange(nextSegments);

      const workspacePending = pendingUpdatesRef.current.get(workspaceId) ?? new Map();
      const existing = workspacePending.get(ayahIndex) ?? {};
      workspacePending.set(ayahIndex, { ...existing, ...updates });
      pendingUpdatesRef.current.set(workspaceId, workspacePending);

      setSaveStatus(workspaceId, "saving");

      const existingTimer = saveDebounceTimersRef.current.get(workspaceId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const debounceTimer = setTimeout(() => {
        void flushWorkspaceSaves({ workspaceId, versionId, surahId });
      }, SEGMENT_SAVE_DEBOUNCE_MS);

      saveDebounceTimersRef.current.set(workspaceId, debounceTimer);
    },
    [flushWorkspaceSaves, setSaveStatus, setSegmentsSnapshot],
  );

  const clearWorkspaceTimers = useCallback((workspaceId: string) => {
    const debounce = saveDebounceTimersRef.current.get(workspaceId);
    if (debounce) {
      clearTimeout(debounce);
      saveDebounceTimersRef.current.delete(workspaceId);
    }

    const reset = saveResetTimersRef.current.get(workspaceId);
    if (reset) {
      clearTimeout(reset);
      saveResetTimersRef.current.delete(workspaceId);
    }
  }, []);

  const removeWorkspaceSession = useCallback(
    (workspaceId: string) => {
      clearWorkspaceTimers(workspaceId);
      pendingUpdatesRef.current.delete(workspaceId);
      segmentsByWorkspaceRef.current.delete(workspaceId);

      setSessions((previous) => {
        if (!(workspaceId in previous)) {
          return previous;
        }

        const next = { ...previous };
        delete next[workspaceId];
        return next;
      });
    },
    [clearWorkspaceTimers],
  );

  const pruneSessions = useCallback(
    (workspaces: WorkspaceRecord[]) => {
      const validWorkspaceIds = new Set(workspaces.map((workspace) => workspace.id));
      for (const workspaceId of Array.from(segmentsByWorkspaceRef.current.keys())) {
        if (!validWorkspaceIds.has(workspaceId)) {
          removeWorkspaceSession(workspaceId);
        }
      }
    },
    [removeWorkspaceSession],
  );

  useEffect(() => {
    return () => {
      for (const timer of saveDebounceTimersRef.current.values()) {
        clearTimeout(timer);
      }
      for (const timer of saveResetTimersRef.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  return useMemo(
    () => ({
      sessions,
      getSession,
      setCurrentTime,
      setCurrentSegmentIndex,
      requestSeek,
      setSaveStatus,
      resetSession,
      setSegmentsSnapshot,
      queueSegmentUpdate,
      flushWorkspaceSaves,
      pruneSessions,
      removeWorkspaceSession,
    }),
    [
      sessions,
      getSession,
      setCurrentTime,
      setCurrentSegmentIndex,
      requestSeek,
      setSaveStatus,
      resetSession,
      setSegmentsSnapshot,
      queueSegmentUpdate,
      flushWorkspaceSaves,
      pruneSessions,
      removeWorkspaceSession,
    ],
  );
}
