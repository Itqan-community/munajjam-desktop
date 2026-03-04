import { useEffect, useRef } from "react";
import { getElectronBridge } from "../electron";
import type { WorkspaceAction, WorkspaceState } from "../workspace-types";
import {
  buildPersistedWorkspaceState,
  parsePersistedWorkspaceState,
} from "./workspace-serialization";

const SAVE_DEBOUNCE_MS = 500;

export function useWorkspacePersistence(
  state: WorkspaceState,
  dispatch: React.Dispatch<WorkspaceAction>,
): boolean {
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (hasLoadedRef.current) {
      return;
    }

    hasLoadedRef.current = true;
    getElectronBridge()
      .data
      .getWorkspaceState()
      .then((saved) => {
        if (cancelled) {
          return;
        }

        const persistedState = parsePersistedWorkspaceState(saved);
        if (!persistedState) {
          return;
        }

        dispatch({
          type: "HYDRATE_WORKSPACES",
          workspaces: persistedState.workspaces,
          activeWorkspaceId: persistedState.activeWorkspaceId,
          projects: persistedState.projects,
          onboardingCompleted: persistedState.onboardingCompleted,
        });
      })
      .catch((error) => {
        console.error("Failed to hydrate workspace state", error);
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void getElectronBridge().data.saveWorkspaceState(
        buildPersistedWorkspaceState({
          workspaces: state.workspaces,
          activeWorkspaceId: state.activeWorkspaceId,
          projects: state.projects,
          onboardingCompleted: state.onboardingCompleted,
        }),
      );
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [state.workspaces, state.activeWorkspaceId, state.projects, state.onboardingCompleted]);

  return hasLoadedRef.current;
}
