import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs";
import path from "path";
import { app } from "electron";
import { LocalDb } from "./db";
import { scanAudioFiles } from "./audio-files";
import { parseJobEvent } from "./job-events";
import { generatePeaks } from "./peaks";
import { inspectPythonRuntime, resolveAlignmentEntrypoint } from "./python-runtime";
import type { AlignmentRow, JobRow, JobConfig } from "./ipc-types";

export type { JobConfig };
export { parseJobEvent, scanAudioFiles };

export type JobUpdateListener = (job: JobRow) => void;
const JOB_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

interface QueueItem {
  jobId: string;
  config: JobConfig;
}

export class JobsManager {
  private db: LocalDb;
  private emit: JobUpdateListener;
  private queue: QueueItem[] = [];
  private running: {
    jobId: string;
    process: ChildProcessWithoutNullStreams;
    killTimeout?: NodeJS.Timeout;
  } | null = null;
  private canceled = new Set<string>();

  constructor(db: LocalDb, emit: JobUpdateListener) {
    this.db = db;
    this.emit = emit;
  }

  listJobs() {
    return this.db.listJobs();
  }

  startJob(config: JobConfig): JobRow {
    const job = this.db.createJob({
      status: "queued",
      reciter_id: config.reciterId,
      recitation_id: config.recitationId,
      audio_dir: config.audioDir,
      processed: 0,
      failed: 0,
      logs: [],
    });

    this.queue.push({ jobId: job.id, config });
    this.emit(job);
    this.runNext();
    return job;
  }

  cancelJob(jobId: string) {
    if (this.running?.jobId === jobId) {
      this.canceled.add(jobId);
      const { process } = this.running;
      process.kill("SIGTERM");
      this.running.killTimeout = setTimeout(() => {
        if (!process.killed) {
          process.kill("SIGKILL");
        }
      }, 5_000);
      return;
    }

    const index = this.queue.findIndex((item) => item.jobId === jobId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      const job = this.db.updateJob(jobId, {
        status: "canceled",
        finished_at: new Date().toISOString(),
      });
      this.emit(job);
    }
  }

  private runNext() {
    if (this.running || this.queue.length === 0) return;
    const next = this.queue.shift();
    if (!next) return;
    this.executeJob(next).catch((error) => {
      const job = this.db.updateJob(next.jobId, {
        status: "failed",
        finished_at: new Date().toISOString(),
        logs: [{ type: "error", event_version: 1, message: String(error) }],
      });
      this.emit(job);
      this.running = null;
      this.runNext();
    });
  }

  private async executeJob(item: QueueItem) {
    const { jobId, config } = item;
    const outputDir = path.join(app.getPath("userData"), "outputs", jobId);
    fs.mkdirSync(outputDir, { recursive: true });

    const audioFiles = scanAudioFiles(config.audioDir, config.surahIds);
    const surahIds = audioFiles.map((file) => file.surahId);

    this.db.upsertAudioFiles(
      audioFiles.map((file) => ({
        reciter_id: config.reciterId,
        surah_id: file.surahId,
        audio_path: file.fullPath,
        format: file.ext.replace(".", ""),
      }))
    );

    if (audioFiles.length === 0) {
      const job = this.db.updateJob(jobId, {
        status: "failed",
        total_surahs: 0,
        processed: 0,
        failed: 0,
        finished_at: new Date().toISOString(),
        logs: [{ type: "error", event_version: 1, message: "No audio files found" }],
      });
      this.emit(job);
      this.runNext();
      return;
    }

    let job = this.db.updateJob(jobId, {
      status: "running",
      output_dir: outputDir,
      total_surahs: surahIds.length,
      processed: 0,
      failed: 0,
      started_at: new Date().toISOString(),
      logs: [],
    });
    this.emit(job);

    const runtime = await inspectPythonRuntime();
    if (!runtime.command) {
      const failedJob = this.db.updateJob(jobId, {
        status: "failed",
        finished_at: new Date().toISOString(),
        logs: [{ type: "error", event_version: 1, message: "Python runtime not found" }],
      });
      this.emit(failedJob);
      this.runNext();
      return;
    }

    const entrypoint = await resolveAlignmentEntrypoint(runtime);
    if (!entrypoint) {
      const failedJob = this.db.updateJob(jobId, {
        status: "failed",
        finished_at: new Date().toISOString(),
        logs: [{ type: "error", event_version: 1, message: "Alignment entrypoint is unavailable" }],
      });
      this.emit(failedJob);
      this.runNext();
      return;
    }

    const args = [
      ...runtime.prefix,
      ...(entrypoint.kind === "script" ? [entrypoint.target] : ["-m", entrypoint.target]),
      "--audio-dir",
      config.audioDir,
      "--output-dir",
      outputDir,
      "--reciter-name",
      config.reciterName,
      "--surah-ids",
      surahIds.join(","),
    ];

    const child = spawn(runtime.command, args, {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
        PYTHONPATH: [runtime.localPythonPath, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
        PATH: [
          runtime.ffmpegPath ? path.dirname(runtime.ffmpegPath) : null,
          process.env.PATH,
        ]
          .filter(Boolean)
          .join(path.delimiter),
      },
    });

    this.running = { jobId, process: child };

    const handleLine = (line: string) => {
      if (!line.trim()) return;
      const event = parseJobEvent(line);
      const update = this.db.appendJobLog(jobId, event);
      this.emit(update);

      if (event.type === "surah_done") {
        const processed = (update.processed ?? 0) + 1;
        const nextJob = this.db.updateJob(jobId, { processed });
        this.emit(nextJob);

        if (typeof event.surah_id === "number" && event.surah_id >= 1 && event.surah_id <= 114) {
          const surahId = event.surah_id;
          const audioFiles = scanAudioFiles(config.audioDir, [surahId]);
          if (audioFiles.length > 0) {
            generatePeaks(audioFiles[0].fullPath, config.reciterId, surahId)
              .then(() => {
                const peakLog = this.db.appendJobLog(jobId, {
                  type: "log",
                  event_version: 1,
                  message: `Peaks generated for surah ${surahId}`,
                });
                this.emit(peakLog);
              })
              .catch((err) => {
                const errLog = this.db.appendJobLog(jobId, {
                  type: "log",
                  event_version: 1,
                  message: `Peaks generation failed for surah ${surahId}: ${String(err)}`,
                });
                this.emit(errLog);
              });
          }
        }
      }

      if (event.type === "surah_skipped") {
        const processed = (update.processed ?? 0) + 1;
        const nextJob = this.db.updateJob(jobId, { processed });
        this.emit(nextJob);
      }

      if (event.type === "surah_error") {
        const failed = (update.failed ?? 0) + 1;
        const nextJob = this.db.updateJob(jobId, { failed });
        this.emit(nextJob);
      }
    };

    let stdoutBuffer = "";
    let stderrBuffer = "";
    const MAX_BUFFER = 1024 * 1024; // 1MB cap to prevent unbounded growth
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGKILL");
        }
      }, 5_000);
    }, JOB_TIMEOUT_MS);

    child.on("error", (err) => {
      handleLine(JSON.stringify({ type: "error", message: `Failed to start alignment process: ${String(err)}` }));
    });

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      if (stdoutBuffer.length > MAX_BUFFER) {
        stdoutBuffer = stdoutBuffer.slice(-MAX_BUFFER);
      }
      let index = stdoutBuffer.indexOf("\n");
      while (index !== -1) {
        const line = stdoutBuffer.slice(0, index);
        stdoutBuffer = stdoutBuffer.slice(index + 1);
        handleLine(line);
        index = stdoutBuffer.indexOf("\n");
      }
    });

    child.stderr.on("data", (chunk) => {
      stderrBuffer += chunk.toString();
      if (stderrBuffer.length > MAX_BUFFER) {
        stderrBuffer = stderrBuffer.slice(-MAX_BUFFER);
      }
      let index = stderrBuffer.indexOf("\n");
      while (index !== -1) {
        const line = stderrBuffer.slice(0, index);
        stderrBuffer = stderrBuffer.slice(index + 1);
        handleLine(JSON.stringify({ type: "stderr", message: line }));
        index = stderrBuffer.indexOf("\n");
      }
    });

    const exitCode: number = await new Promise((resolve) => {
      child.on("close", (code) => resolve(code ?? 0));
    });
    clearTimeout(timeout);
    if (stdoutBuffer.trim().length > 0) {
      handleLine(stdoutBuffer.trim());
    }
    if (stderrBuffer.trim().length > 0) {
      handleLine(JSON.stringify({ type: "stderr", message: stderrBuffer.trim() }));
    }

    if (this.running?.killTimeout) {
      clearTimeout(this.running.killTimeout);
    }
    this.running = null;

    const wasCanceled = this.canceled.has(jobId);
    if (wasCanceled) {
      this.canceled.delete(jobId);
    }

    if (!wasCanceled) {
      await this.importOutputs(jobId, config, outputDir);
    }
    if (timedOut) {
      this.db.appendJobLog(jobId, {
        type: "error",
        event_version: 1,
        message: "Alignment process timed out",
      });
    }

    job = this.db.updateJob(jobId, {
      status: wasCanceled ? "canceled" : timedOut ? "failed" : exitCode === 0 ? "completed" : "failed",
      finished_at: new Date().toISOString(),
    });
    this.emit(job);

    this.runNext();
  }

  private async importOutputs(jobId: string, config: JobConfig, outputDir: string) {
    if (!fs.existsSync(outputDir)) return;
    const files = fs.readdirSync(outputDir).filter((name) => name.endsWith(".json"));

    for (const file of files) {
      const fullPath = path.join(outputDir, file);
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const data = JSON.parse(content);

        if (!data.surah_id || !Array.isArray(data.ayahs)) {
          continue;
        }

        const rows: AlignmentRow[] = data.ayahs
          .filter((ayah: { ayah_number: number }) => ayah.ayah_number >= 1)
          .map((ayah: { ayah_number: number; start: number; end: number; similarity?: number }) => ({
            recitation_id: config.recitationId,
            reciter_id: config.reciterId,
            surah_id: data.surah_id,
            ayah_number: ayah.ayah_number,
            start_time: ayah.start,
            end_time: ayah.end,
            original_start_time: ayah.start,
            original_end_time: ayah.end,
            similarity_score: typeof ayah.similarity === "number" ? ayah.similarity : null,
            status: "pending_review",
          }));

        this.db.upsertAlignments(rows);
      } catch (error) {
        this.db.appendJobLog(jobId, {
          type: "error",
          event_version: 1,
          message: `Failed to import ${file}: ${String(error)}`,
        });
      }
    }
  }
}
