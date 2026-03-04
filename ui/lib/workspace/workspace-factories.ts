import type { Project, WorkspaceRecord } from "./workspace-domain-types";

let workspaceCounter = 0;
export function newWorkspaceId() {
  return `ws-${Date.now()}-${++workspaceCounter}`;
}

let projectCounter = 0;
export function newProjectId() {
  return `proj-${Date.now()}-${++projectCounter}`;
}

export function createWorkspaceRecord(overrides: Partial<WorkspaceRecord> = {}): WorkspaceRecord {
  const now = Date.now();
  return {
    id: newWorkspaceId(),
    label: "",
    reciterId: "badr_alturki",
    versionId: null,
    surahIds: [1],
    activeSurahId: 1,
    segments: [],
    audioUrl: "",
    loading: false,
    error: null,
    status: "setup",
    jobId: null,
    audioDir: null,
    projectId: null,
    createdAt: now,
    lastAccessedAt: now,
    ...overrides,
  };
}

export function createProject(name: string, color: string): Project {
  return {
    id: newProjectId(),
    name,
    color,
    collapsed: false,
    createdAt: Date.now(),
  };
}

export function resetWorkspaceForLoad(
  workspace: WorkspaceRecord,
  overrides: Partial<WorkspaceRecord> = {},
): WorkspaceRecord {
  return {
    ...workspace,
    segments: [],
    audioUrl: "",
    loading: true,
    error: null,
    status: "loading",
    lastAccessedAt: Date.now(),
    ...overrides,
  };
}
