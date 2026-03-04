import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { ReciterRow, RecitationVersion, AlignmentRow, AudioFileRow, JobRow, JobLogEntry } from "./ipc-types";
import { DEFAULT_RECITERS } from "./reciter-seed";

export type { ReciterRow, RecitationVersion, AlignmentRow, AudioFileRow, JobRow };

export interface CreateJobInput {
  status: string;
  reciter_id?: string | null;
  recitation_id?: string | null;
  audio_dir?: string | null;
  output_dir?: string | null;
  total_surahs?: number | null;
  processed?: number | null;
  failed?: number | null;
  started_at?: string | null;
  finished_at?: string | null;
  logs?: JobLogEntry[];
}

const now = () => new Date().toISOString();
const SCHEMA_VERSION = 2;

function getBackupPath(dbPath: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${dbPath}.backup-${stamp}`;
}

function hasCurrentSchema(dbPath: string): boolean {
  if (!fs.existsSync(dbPath)) return false;
  const probe = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const metaExists = probe
      .prepare("SELECT COUNT(*) AS cnt FROM sqlite_master WHERE type = 'table' AND name = 'meta'")
      .get() as { cnt: number };

    if (metaExists.cnt === 0) return false;
    const row = probe
      .prepare("SELECT value FROM meta WHERE key = 'schema_version' LIMIT 1")
      .get() as { value: string } | undefined;
    return row?.value === String(SCHEMA_VERSION);
  } catch {
    return false;
  } finally {
    probe.close();
  }
}

function backupAndResetLegacyDb(dbPath: string): void {
  if (!fs.existsSync(dbPath)) return;
  if (hasCurrentSchema(dbPath)) return;

  const backupPath = getBackupPath(dbPath);
  fs.copyFileSync(dbPath, backupPath);
  fs.unlinkSync(dbPath);

  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
}

export class LocalDb {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    backupAndResetLegacyDb(dbPath);
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reciters (
        id TEXT PRIMARY KEY,
        name_arabic TEXT NOT NULL,
        name_english TEXT NOT NULL,
        name_transliteration TEXT NOT NULL,
        image_path TEXT NOT NULL DEFAULT '/reciters_images/default.png',
        is_available INTEGER DEFAULT 1,
        country TEXT,
        style TEXT,
        is_custom INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS recitations (
        id TEXT PRIMARY KEY,
        reciter_id TEXT NOT NULL,
        version_name TEXT NOT NULL,
        version_label TEXT,
        is_active INTEGER DEFAULT 1,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(reciter_id, version_name)
      );

      CREATE TABLE IF NOT EXISTS alignments (
        id TEXT PRIMARY KEY,
        recitation_id TEXT NOT NULL,
        reciter_id TEXT NOT NULL,
        surah_id INTEGER NOT NULL CHECK (surah_id BETWEEN 1 AND 114),
        ayah_number INTEGER NOT NULL CHECK (ayah_number >= 1),
        start_time REAL NOT NULL,
        end_time REAL NOT NULL,
        original_start_time REAL NOT NULL,
        original_end_time REAL NOT NULL,
        similarity_score REAL,
        status TEXT DEFAULT 'pending_review',
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(recitation_id, surah_id, ayah_number)
      );

      CREATE TABLE IF NOT EXISTS audio_files (
        id TEXT PRIMARY KEY,
        reciter_id TEXT NOT NULL,
        surah_id INTEGER NOT NULL CHECK (surah_id BETWEEN 1 AND 114),
        audio_path TEXT NOT NULL,
        duration REAL,
        file_size INTEGER,
        format TEXT DEFAULT 'mp3',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(reciter_id, surah_id)
      );

      CREATE TABLE IF NOT EXISTS workspace_state (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        reciter_id TEXT,
        recitation_id TEXT,
        audio_dir TEXT,
        output_dir TEXT,
        total_surahs INTEGER,
        processed INTEGER,
        failed INTEGER,
        started_at TEXT,
        finished_at TEXT,
        logs_json TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_alignments_recitation_surah
        ON alignments(recitation_id, surah_id);

      CREATE INDEX IF NOT EXISTS idx_alignments_recitation
        ON alignments(recitation_id);

      CREATE INDEX IF NOT EXISTS idx_audio_files_reciter_surah
        ON audio_files(reciter_id, surah_id);

      CREATE INDEX IF NOT EXISTS idx_jobs_created_at
        ON jobs(created_at);

      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    this.db
      .prepare(
        `INSERT INTO meta (key, value)
         VALUES ('schema_version', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(String(SCHEMA_VERSION));

    // Seed reciters if table is empty
    const count = this.db.prepare("SELECT COUNT(*) as cnt FROM reciters").get() as { cnt: number };
    if (count.cnt === 0) {
      const insert = this.db.prepare(
        `INSERT INTO reciters (id, name_arabic, name_english, name_transliteration, image_path, is_available, country, style, is_custom, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, 0, datetime('now'), datetime('now'))`
      );
      const tx = this.db.transaction(() => {
        for (const reciter of DEFAULT_RECITERS) {
          insert.run(
            reciter.id,
            reciter.name_arabic,
            reciter.name_english,
            reciter.name_transliteration,
            reciter.image_path,
            reciter.country,
            reciter.style,
          );
        }
      });
      tx();
    }
  }

  listReciters(): ReciterRow[] {
    return this.db
      .prepare("SELECT * FROM reciters ORDER BY is_custom ASC, created_at ASC")
      .all() as ReciterRow[];
  }

  createReciter(input: { id: string; name_arabic: string; name_english: string; name_transliteration: string }): ReciterRow {
    const timestamp = now();
    this.db
      .prepare(
        `INSERT INTO reciters (id, name_arabic, name_english, name_transliteration, image_path, is_available, is_custom, created_at, updated_at)
         VALUES (?, ?, ?, ?, '/reciters_images/default.png', 1, 1, ?, ?)`
      )
      .run(input.id, input.name_arabic, input.name_english, input.name_transliteration, timestamp, timestamp);

    return this.db.prepare("SELECT * FROM reciters WHERE id = ?").get(input.id) as ReciterRow;
  }

  updateReciterImage(reciterId: string, imagePath: string): ReciterRow {
    this.db
      .prepare("UPDATE reciters SET image_path = ?, updated_at = ? WHERE id = ?")
      .run(imagePath, now(), reciterId);
    return this.db.prepare("SELECT * FROM reciters WHERE id = ?").get(reciterId) as ReciterRow;
  }

  listRecitations(reciterId: string): RecitationVersion[] {
    const stmt = this.db.prepare(
      "SELECT * FROM recitations WHERE reciter_id = ? ORDER BY is_default DESC, created_at DESC"
    );
    return stmt.all(reciterId) as RecitationVersion[];
  }

  createRecitation(input: {
    reciter_id: string;
    version_name: string;
    version_label?: string | null;
  }): RecitationVersion {
    const existing = this.db
      .prepare("SELECT id FROM recitations WHERE reciter_id = ? LIMIT 1")
      .get(input.reciter_id) as { id: string } | undefined;
    const isDefault = existing ? 0 : 1;
    const id = randomUUID();
    const createdAt = now();

    this.db
      .prepare(
        `INSERT INTO recitations (id, reciter_id, version_name, version_label, is_active, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?)`
      )
      .run(
        id,
        input.reciter_id,
        input.version_name,
        input.version_label ?? input.version_name,
        isDefault,
        createdAt,
        createdAt
      );

    return this.db
      .prepare("SELECT * FROM recitations WHERE id = ?")
      .get(id) as RecitationVersion;
  }

  listAlignments(recitationId: string, surahId: number): AlignmentRow[] {
    const stmt = this.db.prepare(
      "SELECT * FROM alignments WHERE recitation_id = ? AND surah_id = ? ORDER BY ayah_number ASC"
    );
    return stmt.all(recitationId, surahId) as AlignmentRow[];
  }

  listAlignmentStats(recitationId: string): { surah_id: number; similarity_score: number | null }[] {
    const stmt = this.db.prepare(
      "SELECT surah_id, similarity_score FROM alignments WHERE recitation_id = ?"
    );
    return stmt.all(recitationId) as { surah_id: number; similarity_score: number | null }[];
  }

  upsertAlignments(rows: AlignmentRow[]): void {
    if (rows.length === 0) return;

    const stmt = this.db.prepare(
      `INSERT INTO alignments (
        id, recitation_id, reciter_id, surah_id, ayah_number,
        start_time, end_time, original_start_time, original_end_time,
        similarity_score, status, notes, created_at, updated_at
      ) VALUES (
        @id, @recitation_id, @reciter_id, @surah_id, @ayah_number,
        @start_time, @end_time, @original_start_time, @original_end_time,
        @similarity_score, @status, @notes, @created_at, @updated_at
      )
      ON CONFLICT(recitation_id, surah_id, ayah_number) DO UPDATE SET
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        original_start_time = excluded.original_start_time,
        original_end_time = excluded.original_end_time,
        similarity_score = excluded.similarity_score,
        status = excluded.status,
        notes = excluded.notes,
        updated_at = excluded.updated_at`
    );

    const tx = this.db.transaction((items: AlignmentRow[]) => {
      const timestamp = now();
      for (const item of items) {
        stmt.run({
          id: item.id ?? randomUUID(),
          recitation_id: item.recitation_id,
          reciter_id: item.reciter_id,
          surah_id: item.surah_id,
          ayah_number: item.ayah_number,
          start_time: item.start_time,
          end_time: item.end_time,
          original_start_time: item.original_start_time,
          original_end_time: item.original_end_time,
          similarity_score: item.similarity_score,
          status: item.status ?? "pending_review",
          notes: item.notes ?? null,
          created_at: item.created_at ?? timestamp,
          updated_at: timestamp,
        });
      }
    });

    tx(rows);
  }

  updateAlignment(input: {
    recitation_id: string;
    surah_id: number;
    ayah_number: number;
    start_time: number;
    end_time: number;
  }): void {
    const stmt = this.db.prepare(
      `UPDATE alignments
       SET start_time = ?, end_time = ?, updated_at = ?
       WHERE recitation_id = ? AND surah_id = ? AND ayah_number = ?`
    );
    stmt.run(
      input.start_time,
      input.end_time,
      now(),
      input.recitation_id,
      input.surah_id,
      input.ayah_number
    );
  }

  getAudioFile(reciterId: string, surahId: number): AudioFileRow | undefined {
    const stmt = this.db.prepare(
      "SELECT * FROM audio_files WHERE reciter_id = ? AND surah_id = ?"
    );
    return stmt.get(reciterId, surahId) as AudioFileRow | undefined;
  }

  upsertAudioFiles(rows: AudioFileRow[]): void {
    if (rows.length === 0) return;

    const stmt = this.db.prepare(
      `INSERT INTO audio_files (
        id, reciter_id, surah_id, audio_path, duration, file_size, format, created_at, updated_at
      ) VALUES (
        @id, @reciter_id, @surah_id, @audio_path, @duration, @file_size, @format, @created_at, @updated_at
      )
      ON CONFLICT(reciter_id, surah_id) DO UPDATE SET
        audio_path = excluded.audio_path,
        duration = excluded.duration,
        file_size = excluded.file_size,
        format = excluded.format,
        updated_at = excluded.updated_at`
    );

    const tx = this.db.transaction((items: AudioFileRow[]) => {
      const timestamp = now();
      for (const item of items) {
        stmt.run({
          id: item.id ?? randomUUID(),
          reciter_id: item.reciter_id,
          surah_id: item.surah_id,
          audio_path: item.audio_path,
          duration: item.duration ?? null,
          file_size: item.file_size ?? null,
          format: item.format ?? null,
          created_at: item.created_at ?? timestamp,
          updated_at: timestamp,
        });
      }
    });

    tx(rows);
  }

  listJobs(): JobRow[] {
    const stmt = this.db.prepare("SELECT * FROM jobs ORDER BY created_at DESC");
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map((row) => this.parseJob(row));
  }

  createJob(input: CreateJobInput): JobRow {
    const id = randomUUID();
    const timestamp = now();
    const logsJson = JSON.stringify(input.logs ?? []);

    this.db
      .prepare(
        `INSERT INTO jobs (
          id, status, reciter_id, recitation_id, audio_dir, output_dir,
          total_surahs, processed, failed, started_at, finished_at, logs_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.status,
        input.reciter_id ?? null,
        input.recitation_id ?? null,
        input.audio_dir ?? null,
        input.output_dir ?? null,
        input.total_surahs ?? null,
        input.processed ?? null,
        input.failed ?? null,
        input.started_at ?? null,
        input.finished_at ?? null,
        logsJson,
        timestamp,
        timestamp
      );

    return this.getJob(id);
  }

  updateJob(id: string, updates: Partial<CreateJobInput & { status: string }>) {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    const mapField = (key: string, value: string | number | null) => {
      fields.push(`${key} = ?`);
      values.push(value);
    };

    if (updates.status !== undefined) mapField("status", updates.status);
    if (updates.reciter_id !== undefined) mapField("reciter_id", updates.reciter_id ?? null);
    if (updates.recitation_id !== undefined) mapField("recitation_id", updates.recitation_id ?? null);
    if (updates.audio_dir !== undefined) mapField("audio_dir", updates.audio_dir ?? null);
    if (updates.output_dir !== undefined) mapField("output_dir", updates.output_dir ?? null);
    if (updates.total_surahs !== undefined) mapField("total_surahs", updates.total_surahs ?? null);
    if (updates.processed !== undefined) mapField("processed", updates.processed ?? null);
    if (updates.failed !== undefined) mapField("failed", updates.failed ?? null);
    if (updates.started_at !== undefined) mapField("started_at", updates.started_at ?? null);
    if (updates.finished_at !== undefined) mapField("finished_at", updates.finished_at ?? null);
    if (updates.logs !== undefined) mapField("logs_json", JSON.stringify(updates.logs ?? []));

    mapField("updated_at", now());

    if (fields.length === 0) return this.getJob(id);

    const stmt = this.db.prepare(`UPDATE jobs SET ${fields.join(", ")} WHERE id = ?`);
    stmt.run(...values, id);

    return this.getJob(id);
  }

  appendJobLog(id: string, entry: JobLogEntry, maxEntries = 200) {
    const job = this.getJob(id);
    const logs = Array.isArray(job.logs) ? job.logs : [];
    logs.push(entry);
    while (logs.length > maxEntries) logs.shift();
    return this.updateJob(id, { logs });
  }

  getJob(id: string): JobRow {
    const row = this.db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as Record<string, unknown>;
    return this.parseJob(row);
  }

  // ── Workspace persistence ──────────────────────────────────────────────────

  getWorkspaceState(): unknown {
    const row = this.db
      .prepare("SELECT value_json FROM workspace_state WHERE key = 'workspaces'")
      .get() as { value_json: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.value_json);
    } catch {
      return null;
    }
  }

  saveWorkspaceState(state: unknown): void {
    const json = JSON.stringify(state);
    this.db
      .prepare(
        `INSERT INTO workspace_state (key, value_json, updated_at)
         VALUES ('workspaces', ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
      )
      .run(json);
  }

  private parseJob(row: Record<string, unknown>): JobRow {
    let logs: JobLogEntry[] = [];
    if (typeof row.logs_json === "string") {
      try {
        logs = JSON.parse(row.logs_json);
      } catch {
        logs = [];
      }
    }

    return {
      id: row.id as string,
      status: row.status as string,
      reciter_id: row.reciter_id as string | null,
      recitation_id: row.recitation_id as string | null,
      audio_dir: row.audio_dir as string | null,
      output_dir: row.output_dir as string | null,
      total_surahs: row.total_surahs as number | null,
      processed: row.processed as number | null,
      failed: row.failed as number | null,
      started_at: row.started_at as string | null,
      finished_at: row.finished_at as string | null,
      logs,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }
}
