import type { WorkspaceAction, WorkspaceState } from "../workspace-types";
import { createProject, createWorkspaceRecord, resetWorkspaceForLoad } from "./workspace-factories";

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "HYDRATE_WORKSPACES": {
      return {
        workspaces: action.workspaces,
        activeWorkspaceId: action.activeWorkspaceId,
        projects: action.projects,
        onboardingCompleted: action.onboardingCompleted,
      };
    }

    case "COMPLETE_ONBOARDING": {
      return { ...state, onboardingCompleted: true };
    }

    case "CREATE_WORKSPACE": {
      const workspace = createWorkspaceRecord();
      return {
        ...state,
        workspaces: [...state.workspaces, workspace],
        activeWorkspaceId: workspace.id,
      };
    }

    case "DELETE_WORKSPACE": {
      const remaining = state.workspaces.filter((workspace) => workspace.id !== action.id);
      let nextActive = state.activeWorkspaceId;
      if (nextActive === action.id) {
        nextActive = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
      }
      return { ...state, workspaces: remaining, activeWorkspaceId: nextActive };
    }

    case "BATCH_DELETE_WORKSPACES": {
      const idsToDelete = new Set(action.ids);
      const remaining = state.workspaces.filter((workspace) => !idsToDelete.has(workspace.id));
      let nextActive = state.activeWorkspaceId;
      if (nextActive && idsToDelete.has(nextActive)) {
        nextActive = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
      }
      return { ...state, workspaces: remaining, activeWorkspaceId: nextActive };
    }

    case "SET_ACTIVE": {
      return {
        ...state,
        activeWorkspaceId: action.id,
        workspaces: state.workspaces.map((workspace) =>
          workspace.id === action.id ? { ...workspace, lastAccessedAt: Date.now() } : workspace,
        ),
      };
    }

    case "UPDATE_WORKSPACE": {
      return {
        ...state,
        workspaces: state.workspaces.map((workspace) =>
          workspace.id === action.id ? { ...workspace, ...action.updates } : workspace,
        ),
      };
    }

    case "CONFIGURE_WORKSPACE": {
      return {
        ...state,
        workspaces: state.workspaces.map((workspace) =>
          workspace.id === action.id
            ? resetWorkspaceForLoad(workspace, {
                reciterId: action.reciterId,
                versionId: action.versionId,
                surahIds: action.surahIds,
                activeSurahId: action.surahIds[0],
              })
            : workspace,
        ),
      };
    }

    case "START_PROCESSING": {
      return {
        ...state,
        workspaces: state.workspaces.map((workspace) =>
          workspace.id === action.id
            ? {
                ...resetWorkspaceForLoad(workspace, {
                  reciterId: action.reciterId,
                  versionId: action.versionId,
                  surahIds: action.surahIds,
                  activeSurahId: action.surahIds[0],
                  audioDir: action.audioDir,
                  jobId: action.jobId,
                  loading: false,
                  status: "processing",
                }),
              }
            : workspace,
        ),
      };
    }

    case "CREATE_PROJECT": {
      return {
        ...state,
        projects: [...state.projects, createProject(action.name, action.color)],
      };
    }

    case "RENAME_PROJECT": {
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === action.id ? { ...project, name: action.name } : project,
        ),
      };
    }

    case "CHANGE_PROJECT_COLOR": {
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === action.id ? { ...project, color: action.color } : project,
        ),
      };
    }

    case "DELETE_PROJECT": {
      return {
        ...state,
        projects: state.projects.filter((project) => project.id !== action.id),
        workspaces: state.workspaces.map((workspace) =>
          workspace.projectId === action.id ? { ...workspace, projectId: null } : workspace,
        ),
      };
    }

    case "TOGGLE_PROJECT_COLLAPSED": {
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === action.id ? { ...project, collapsed: !project.collapsed } : project,
        ),
      };
    }

    case "MOVE_WORKSPACE_TO_PROJECT": {
      return {
        ...state,
        workspaces: state.workspaces.map((workspace) =>
          workspace.id === action.workspaceId
            ? { ...workspace, projectId: action.projectId }
            : workspace,
        ),
      };
    }

    case "SET_ACTIVE_SURAH": {
      return {
        ...state,
        workspaces: state.workspaces.map((workspace) =>
          workspace.id === action.workspaceId
            ? resetWorkspaceForLoad(workspace, {
                activeSurahId: action.surahId,
              })
            : workspace,
        ),
      };
    }

    default:
      return state;
  }
}
