import type { WorkspacePersistedState, WorkspaceRecord } from "./workspace-domain-types";

interface LegacyWorkspaceShape {
  id?: unknown;
  label?: unknown;
  reciterId?: unknown;
  versionId?: unknown;
  surahIds?: unknown;
  surahId?: unknown;
  activeSurahId?: unknown;
  status?: unknown;
  jobId?: unknown;
  audioDir?: unknown;
  projectId?: unknown;
  createdAt?: unknown;
  lastAccessedAt?: unknown;
}

function isWorkspaceStatus(value: unknown): value is WorkspaceRecord["status"] {
  return value === "setup" || value === "loading" || value === "ready" || value === "error" || value === "processing";
}

function normalizeSurahIds(input: unknown): number[] {
  const values = Array.isArray(input) ? input : [];
  const valid = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 114,
  );
  return valid.length > 0 ? Array.from(new Set(valid)) : [1];
}

function normalizeStatus(input: unknown): WorkspaceRecord["status"] {
  if (input === "ready") {
    return "loading";
  }
  return isWorkspaceStatus(input) ? input : "setup";
}

function normalizeActiveSurahId(input: unknown, surahIds: number[]): number {
  if (typeof input === "number" && Number.isInteger(input) && input >= 1 && input <= 114) {
    return input;
  }
  return surahIds[0] ?? 1;
}

export function serializeWorkspaceRecord(workspace: WorkspaceRecord): WorkspaceRecord {
  return {
    id: workspace.id,
    label: workspace.label,
    reciterId: workspace.reciterId,
    versionId: workspace.versionId,
    surahIds: workspace.surahIds,
    activeSurahId: workspace.activeSurahId,
    status: workspace.status,
    jobId: workspace.jobId,
    audioDir: workspace.audioDir,
    projectId: workspace.projectId,
    createdAt: workspace.createdAt,
    lastAccessedAt: workspace.lastAccessedAt,
    segments: [],
    audioUrl: "",
    loading: workspace.status === "loading",
    error: null,
  };
}

export function deserializeWorkspaceRecord(data: unknown): WorkspaceRecord {
  const safe = (data && typeof data === "object" ? data : {}) as LegacyWorkspaceShape;
  const surahIds = normalizeSurahIds(safe.surahIds ?? (typeof safe.surahId === "number" ? [safe.surahId] : []));
  const status = normalizeStatus(safe.status);

  return {
    id: typeof safe.id === "string" ? safe.id : `ws-${Date.now()}`,
    label: typeof safe.label === "string" ? safe.label : "",
    reciterId: typeof safe.reciterId === "string" ? safe.reciterId : "badr_alturki",
    versionId: typeof safe.versionId === "string" ? safe.versionId : null,
    surahIds,
    activeSurahId: normalizeActiveSurahId(safe.activeSurahId ?? safe.surahId, surahIds),
    segments: [],
    audioUrl: "",
    loading: status === "loading",
    error: null,
    status,
    jobId: typeof safe.jobId === "string" ? safe.jobId : null,
    audioDir: typeof safe.audioDir === "string" ? safe.audioDir : null,
    projectId: typeof safe.projectId === "string" ? safe.projectId : null,
    createdAt: typeof safe.createdAt === "number" ? safe.createdAt : Date.now(),
    lastAccessedAt: typeof safe.lastAccessedAt === "number" ? safe.lastAccessedAt : Date.now(),
  };
}

export function buildPersistedWorkspaceState(state: {
  workspaces: WorkspaceRecord[];
  activeWorkspaceId: string | null;
  projects: WorkspacePersistedState["projects"];
  onboardingCompleted?: boolean;
}): WorkspacePersistedState {
  return {
    workspaces: state.workspaces.map(serializeWorkspaceRecord),
    activeWorkspaceId: state.activeWorkspaceId,
    projects: state.projects,
    onboardingCompleted: state.onboardingCompleted ?? false,
  };
}

export function parsePersistedWorkspaceState(input: unknown): WorkspacePersistedState | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const safe = input as Record<string, unknown>;
  return {
    workspaces: Array.isArray(safe.workspaces)
      ? safe.workspaces.map(deserializeWorkspaceRecord)
      : [],
    activeWorkspaceId: typeof safe.activeWorkspaceId === "string" ? safe.activeWorkspaceId : null,
    projects: Array.isArray(safe.projects)
      ? (safe.projects as WorkspacePersistedState["projects"])
      : [],
    onboardingCompleted:
      typeof safe.onboardingCompleted === "boolean" ? safe.onboardingCompleted : false,
  };
}
