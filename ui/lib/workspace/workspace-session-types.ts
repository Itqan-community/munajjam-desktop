export interface SeekRequest {
  time: number;
  id: number;
  autoPlay?: boolean;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface WorkspaceSessionState {
  currentTime: number;
  currentSegmentIndex: number | null;
  seekRequest: SeekRequest | null;
  saveStatus: SaveStatus;
}

export type WorkspaceSessionMap = Record<string, WorkspaceSessionState>;

export const DEFAULT_WORKSPACE_SESSION: WorkspaceSessionState = {
  currentTime: 0,
  currentSegmentIndex: null,
  seekRequest: null,
  saveStatus: "idle",
};
