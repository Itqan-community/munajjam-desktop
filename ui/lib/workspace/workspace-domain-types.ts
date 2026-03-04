export interface Segment {
  ayah_number: number;
  start: number;
  end: number;
  text: string;
  similarity: number;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
  createdAt: number;
}

export type WorkspaceStatus = "setup" | "loading" | "ready" | "error" | "processing";

export interface WorkspaceRecord {
  id: string;
  label: string;
  reciterId: string;
  versionId: string | null;
  surahIds: number[];
  activeSurahId: number;
  segments: Segment[];
  audioUrl: string;
  loading: boolean;
  error: string | null;
  status: WorkspaceStatus;
  jobId: string | null;
  audioDir: string | null;
  projectId: string | null;
  createdAt: number;
  lastAccessedAt: number;
}

export interface WorkspacePersistedState {
  workspaces: WorkspaceRecord[];
  activeWorkspaceId: string | null;
  projects: Project[];
  onboardingCompleted: boolean;
}
