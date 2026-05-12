import { EventEmitter } from "events";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const userDataDirs: string[] = [];

vi.mock("electron", () => ({
  app: {
    getPath: () => userDataDirs[userDataDirs.length - 1] ?? os.tmpdir(),
  },
  powerMonitor: {
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

vi.mock("./logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("./python-runtime", () => ({
  inspectPythonRuntime: vi.fn(),
  resolveAlignmentEntrypoint: vi.fn(),
}));

vi.mock("./audio-files", () => ({
  scanAudioFiles: vi.fn(),
}));

vi.mock("./peaks", () => ({
  generatePeaks: vi.fn().mockResolvedValue(undefined),
}));

import { spawn } from "child_process";
import { LocalDb } from "./db";
import { JobsManager } from "./jobs";
import { inspectPythonRuntime, resolveAlignmentEntrypoint } from "./python-runtime";
import { scanAudioFiles } from "./audio-files";
import type { JobConfig, JobRow } from "./ipc-types";

class FakeChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  killed = false;
  killSignals: string[] = [];

  kill(signal?: string) {
    this.killSignals.push(signal ?? "SIGTERM");
    this.killed = true;
    return true;
  }
}

function makeRuntimeInfo(command: string) {
  return {
    command,
    prefix: [],
    pythonVersion: "3.12",
    pythonPath: "/usr/bin/python3",
    pipAvailable: true,
    ffmpegAvailable: true,
    ffmpegPath: "/usr/bin/ffmpeg",
    munajjamAvailable: true,
    munajjamVersion: "0.1.0",
    packageManagerAvailable: true,
    packageManagerName: "apt",
    managedInstallPath: null,
    platformSupported: true,
    localPackageAvailable: false,
    localPackagePath: null,
    localPythonPath: null,
  };
}

const sampleConfig: JobConfig = {
  reciterId: "r1",
  reciterName: "Test Reciter",
  recitationId: "rec1",
  audioDir: "/fake/audio",
  surahIds: [1],
};

function makeManager(userDataDir: string) {
  const dbPath = path.join(userDataDir, "munajjam.db");
  const db = new LocalDb(dbPath);
  const emitted: JobRow[] = [];
  const manager = new JobsManager(db, (job) => emitted.push(job));
  return { db, manager, emitted };
}

describe("JobsManager queue state machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "munajjam-jobs-test-"));
    userDataDirs.push(dir);

    vi.mocked(inspectPythonRuntime).mockResolvedValue(makeRuntimeInfo("python3"));
    vi.mocked(resolveAlignmentEntrypoint).mockResolvedValue({
      kind: "module",
      target: "munajjam",
    });
    vi.mocked(scanAudioFiles).mockReturnValue([
      { surahId: 1, fullPath: path.join(dir, "001.mp3"), ext: ".mp3" },
    ]);
    vi.mocked(spawn).mockImplementation(() => new FakeChild() as never);
  });

  afterEach(() => {
    while (userDataDirs.length > 0) {
      const dir = userDataDirs.pop();
      if (dir && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("recovers stale running jobs from the DB on construction", () => {
    const dir = userDataDirs[userDataDirs.length - 1];
    const dbPath = path.join(dir, "munajjam.db");
    const db = new LocalDb(dbPath);
    const stale = db.createJob({ status: "running" });

    new JobsManager(db, () => {});

    expect(db.getJob(stale.id).status).toBe("failed");
    expect(db.getJob(stale.id).finished_at).not.toBeNull();
  });

  it("fails a job cleanly when the Python runtime is not available", async () => {
    vi.mocked(inspectPythonRuntime).mockResolvedValueOnce(makeRuntimeInfo(""));
    const dir = userDataDirs[userDataDirs.length - 1];
    const { db, manager } = makeManager(dir);

    const job = manager.startJob(sampleConfig);

    await vi.waitFor(() => {
      expect(db.getJob(job.id).status).toBe("failed");
    });
    expect(spawn).not.toHaveBeenCalled();
    const failed = db.getJob(job.id);
    const message = failed.logs?.find((entry) => entry.type === "error")?.message ?? "";
    expect(message).toMatch(/Python runtime not found/);
  });

  it("queues a second job while the first is running and runs them sequentially", async () => {
    const dir = userDataDirs[userDataDirs.length - 1];
    const firstChild = new FakeChild();
    const secondChild = new FakeChild();
    vi.mocked(spawn)
      .mockReturnValueOnce(firstChild as never)
      .mockReturnValueOnce(secondChild as never);

    const { db, manager } = makeManager(dir);
    const first = manager.startJob(sampleConfig);

    // Wait for spawn so the manager's in-memory `running` pointer is set.
    await vi.waitFor(() => {
      expect(spawn).toHaveBeenCalledTimes(1);
    });
    expect(db.getJob(first.id).status).toBe("running");
    expect(spawn).toHaveBeenCalledTimes(1);

    const second = manager.startJob(sampleConfig);
    expect(db.getJob(second.id).status).toBe("queued");
    expect(spawn).toHaveBeenCalledTimes(1);

    firstChild.emit("close", 0);

    await vi.waitFor(() => {
      expect(db.getJob(first.id).status).toBe("completed");
      expect(db.getJob(second.id).status).toBe("running");
    });
    expect(spawn).toHaveBeenCalledTimes(2);

    secondChild.emit("close", 0);
    await vi.waitFor(() => {
      expect(db.getJob(second.id).status).toBe("completed");
    });
  });

  it("marks a queued job canceled without ever spawning it", async () => {
    const dir = userDataDirs[userDataDirs.length - 1];
    const firstChild = new FakeChild();
    vi.mocked(spawn).mockReturnValueOnce(firstChild as never);

    const { db, manager } = makeManager(dir);
    const first = manager.startJob(sampleConfig);

    // Wait for spawn so the manager's in-memory `running` pointer is set.
    await vi.waitFor(() => {
      expect(spawn).toHaveBeenCalledTimes(1);
    });
    expect(db.getJob(first.id).status).toBe("running");

    const second = manager.startJob(sampleConfig);
    expect(db.getJob(second.id).status).toBe("queued");

    manager.cancelJob(second.id);

    expect(db.getJob(second.id).status).toBe("canceled");
    expect(db.getJob(second.id).finished_at).not.toBeNull();
    expect(spawn).toHaveBeenCalledTimes(1);

    firstChild.emit("close", 0);
    await vi.waitFor(() => {
      expect(db.getJob(first.id).status).toBe("completed");
    });
  });

  it("starts the next queued job after a running job is canceled", async () => {
    const dir = userDataDirs[userDataDirs.length - 1];
    const firstChild = new FakeChild();
    const secondChild = new FakeChild();
    vi.mocked(spawn)
      .mockReturnValueOnce(firstChild as never)
      .mockReturnValueOnce(secondChild as never);

    const { db, manager } = makeManager(dir);
    const first = manager.startJob(sampleConfig);

    // Wait for spawn so the manager's in-memory `running` pointer is set.
    await vi.waitFor(() => {
      expect(spawn).toHaveBeenCalledTimes(1);
    });
    expect(db.getJob(first.id).status).toBe("running");

    const second = manager.startJob(sampleConfig);
    expect(db.getJob(second.id).status).toBe("queued");

    manager.cancelJob(first.id);
    expect(firstChild.killSignals).toContain("SIGTERM");

    firstChild.emit("close", null);

    await vi.waitFor(() => {
      expect(db.getJob(first.id).status).toBe("canceled");
      expect(db.getJob(second.id).status).toBe("running");
    });

    secondChild.emit("close", 0);
    await vi.waitFor(() => {
      expect(db.getJob(second.id).status).toBe("completed");
    });
  });
});
