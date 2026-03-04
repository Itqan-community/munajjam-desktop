"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type { Workspace, WorkspaceAction, WorkspaceState, JobRecord } from "../workspace-types";
import type { WorkspaceRecord } from "./workspace-domain-types";
import { workspaceReducer } from "./workspace-reducer";
import { useWorkspacePersistence } from "./workspace-persistence";
import { useWorkspaceLoadingEffects } from "./workspace-loading-effects";
import { useWorkspaceJobEffects } from "./workspace-job-effects";
import { useWorkspaceJobs } from "./use-workspace-jobs";
import { useWorkspaceSession } from "./use-workspace-session";

interface WorkspaceContextValue {
  state: WorkspaceState;
  dispatch: React.Dispatch<WorkspaceAction>;
  activeWorkspace: Workspace | undefined;
  jobs: JobRecord[];
  session: ReturnType<typeof useWorkspaceSession>;
  updateWorkspace: (workspaceId: string, updates: Partial<WorkspaceRecord>) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return context;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, {
    workspaces: [],
    activeWorkspaceId: null,
    projects: [],
    onboardingCompleted: false,
  });

  const jobs = useWorkspaceJobs();
  const session = useWorkspaceSession();

  useWorkspacePersistence(state, dispatch);

  const updateWorkspace = useCallback(
    (workspaceId: string, updates: Partial<WorkspaceRecord>) => {
      dispatch({ type: "UPDATE_WORKSPACE", id: workspaceId, updates });
    },
    [dispatch],
  );

  useWorkspaceLoadingEffects({ workspaces: state.workspaces, updateWorkspace });
  useWorkspaceJobEffects({ workspaces: state.workspaces, jobs, updateWorkspace });

  useEffect(() => {
    session.pruneSessions(state.workspaces);

    for (const workspace of state.workspaces) {
      session.setSegmentsSnapshot(workspace.id, workspace.segments);
      const currentSession = session.getSession(workspace.id);

      if (
        workspace.status !== "ready" &&
        (currentSession.currentTime !== 0 ||
          currentSession.currentSegmentIndex !== null ||
          currentSession.seekRequest !== null ||
          currentSession.saveStatus !== "idle")
      ) {
        session.resetSession(workspace.id);
      }
    }
  }, [state.workspaces, session]);

  const activeWorkspace = useMemo(() => {
    const activeRecord = state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId);
    if (!activeRecord) {
      return undefined;
    }

    return {
      ...activeRecord,
      ...session.getSession(activeRecord.id),
    } satisfies Workspace;
  }, [state.workspaces, state.activeWorkspaceId, session]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      activeWorkspace,
      jobs,
      session,
      updateWorkspace,
    }),
    [state, dispatch, activeWorkspace, jobs, session, updateWorkspace],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
