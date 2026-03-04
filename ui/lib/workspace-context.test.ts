import { describe, expect, it } from "vitest";
import type { WorkspaceState } from "./workspace-types";
import {
  workspaceReducer,
  serializeWorkspace,
  deserializeWorkspace,
  buildPersistedWorkspaceState,
  parsePersistedWorkspaceState,
} from "./workspace-context";

const initialState: WorkspaceState = {
  workspaces: [],
  activeWorkspaceId: null,
  projects: [],
  onboardingCompleted: false,
};

describe("workspace reducer", () => {
  it("creates and activates a workspace", () => {
    const next = workspaceReducer(initialState, { type: "CREATE_WORKSPACE" });
    expect(next.workspaces.length).toBe(1);
    expect(next.activeWorkspaceId).toBe(next.workspaces[0].id);
    expect(next.workspaces[0].status).toBe("setup");
  });

  it("sets workspace to loading when active surah changes", () => {
    const created = workspaceReducer(initialState, { type: "CREATE_WORKSPACE" });
    const workspace = created.workspaces[0];
    const updated = workspaceReducer(created, {
      type: "SET_ACTIVE_SURAH",
      workspaceId: workspace.id,
      surahId: 2,
    });
    expect(updated.workspaces[0].activeSurahId).toBe(2);
    expect(updated.workspaces[0].status).toBe("loading");
    expect(updated.workspaces[0].segments).toEqual([]);
  });
});

describe("workspace serialization", () => {
  it("round-trips persisted fields", () => {
    const created = workspaceReducer(initialState, { type: "CREATE_WORKSPACE" });
    const workspace = created.workspaces[0];

    const serialized = serializeWorkspace(workspace);
    const restored = deserializeWorkspace(serialized);

    expect(restored.id).toBe(workspace.id);
    expect(restored.reciterId).toBe(workspace.reciterId);
    expect(restored.surahIds).toEqual(workspace.surahIds);
    expect(restored.status).toBe("setup");
  });

  it("hydrates legacy payloads and drops transient fields", () => {
    const restored = deserializeWorkspace({
      id: "ws-legacy",
      reciterId: "legacy",
      surahIds: [2],
      activeSurahId: 2,
      status: "ready",
      currentTime: 88,
      currentSegmentIndex: 5,
      seekRequest: { id: 1, time: 1.5 },
      saveStatus: "saving",
    });

    expect(restored.id).toBe("ws-legacy");
    expect(restored.status).toBe("loading");
    expect(restored.loading).toBe(true);
    expect(restored.segments).toEqual([]);
  });

  it("persists only workspace records", () => {
    const created = workspaceReducer(initialState, { type: "CREATE_WORKSPACE" });
    const payload = buildPersistedWorkspaceState(created);

    expect(payload.workspaces[0]).not.toHaveProperty("currentTime");
    expect(payload.workspaces[0]).not.toHaveProperty("seekRequest");

    const hydrated = parsePersistedWorkspaceState(payload);
    expect(hydrated?.workspaces.length).toBe(1);
    expect(hydrated?.workspaces[0].id).toBe(payload.workspaces[0].id);
  });
});
