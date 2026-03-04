import type { JobLogEntry } from "@/types/munajjam";
import type {
  Project,
  Segment,
  WorkspacePersistedState,
  WorkspaceRecord,
  WorkspaceStatus,
} from "./workspace/workspace-domain-types";
import type { SaveStatus, SeekRequest, WorkspaceSessionState } from "./workspace/workspace-session-types";

export type { Project, Segment, WorkspacePersistedState, WorkspaceRecord, WorkspaceStatus, SaveStatus, SeekRequest, WorkspaceSessionState };
export type { JobEvent, JobLogEntry } from "@/types/munajjam";

export type Workspace = WorkspaceRecord & WorkspaceSessionState;

export type WorkspaceAction =
  | { type: "CREATE_WORKSPACE" }
  | { type: "DELETE_WORKSPACE"; id: string }
  | { type: "SET_ACTIVE"; id: string }
  | {
      type: "HYDRATE_WORKSPACES";
      workspaces: WorkspaceRecord[];
      activeWorkspaceId: string | null;
      projects: Project[];
      onboardingCompleted?: boolean;
    }
  | {
      type: "UPDATE_WORKSPACE";
      id: string;
      updates: Partial<Omit<WorkspaceRecord, "id" | "createdAt">>;
    }
  | {
      type: "CONFIGURE_WORKSPACE";
      id: string;
      reciterId: string;
      versionId: string | null;
      surahIds: number[];
    }
  | {
      type: "START_PROCESSING";
      id: string;
      reciterId: string;
      versionId: string;
      surahIds: number[];
      audioDir: string;
      jobId: string;
    }
  | { type: "CREATE_PROJECT"; name: string; color: string }
  | { type: "RENAME_PROJECT"; id: string; name: string }
  | { type: "CHANGE_PROJECT_COLOR"; id: string; color: string }
  | { type: "DELETE_PROJECT"; id: string }
  | { type: "TOGGLE_PROJECT_COLLAPSED"; id: string }
  | { type: "MOVE_WORKSPACE_TO_PROJECT"; workspaceId: string; projectId: string | null }
  | { type: "COMPLETE_ONBOARDING" }
  | { type: "SET_ACTIVE_SURAH"; workspaceId: string; surahId: number }
  | { type: "BATCH_DELETE_WORKSPACES"; ids: string[] };

export interface WorkspaceState {
  workspaces: WorkspaceRecord[];
  activeWorkspaceId: string | null;
  projects: Project[];
  onboardingCompleted?: boolean;
}

export interface JobRecord {
  id: string;
  status: string;
  reciter_id?: string | null;
  recitation_id?: string | null;
  audio_dir?: string | null;
  output_dir?: string | null;
  total_surahs?: number | null;
  processed?: number | null;
  failed?: number | null;
  logs?: JobLogEntry[];
}
