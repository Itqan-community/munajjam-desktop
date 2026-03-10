// src/ipc-types.ts — shared IPC contract (single source of truth)

export interface ReciterRow {
  id: string;
  name_arabic: string;
  name_english: string;
  name_transliteration: string;
  image_path: string;
  is_available: number;
  country: string | null;
  style: string | null;
  is_custom: number;
  created_at: string;
  updated_at: string;
}

export interface RecitationVersion {
  id: string;
  reciter_id: string;
  version_name: string;
  version_label: string | null;
  is_active: number;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export interface AlignmentRow {
  id?: string;
  recitation_id: string;
  reciter_id: string;
  surah_id: number;
  ayah_number: number;
  start_time: number;
  end_time: number;
  original_start_time: number;
  original_end_time: number;
  similarity_score: number | null;
  status: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AudioFileScanResult {
  filename: string;
  fullPath: string;
  surahId: number | null; // null if filename isn't numeric
}

export interface AudioFileRow {
  id?: string;
  reciter_id: string;
  surah_id: number;
  audio_path: string;
  duration?: number | null;
  file_size?: number | null;
  format?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface JobRow {
  id: string;
  status: string;
  reciter_id: string | null;
  recitation_id: string | null;
  audio_dir: string | null;
  output_dir: string | null;
  total_surahs: number | null;
  processed: number | null;
  failed: number | null;
  started_at: string | null;
  finished_at: string | null;
  logs: JobLogEntry[];
  created_at: string;
  updated_at: string;
}

interface BaseJobEvent {
  event_version: 1;
  message?: string;
}

export interface JobLogEvent extends BaseJobEvent {
  type: "log" | "error" | "stderr";
}

export interface JobProgressEvent extends BaseJobEvent {
  type: "progress";
  surah_id?: number;
  stage?: string;
  percent?: number;
  current?: number;
  total?: number;
  avg_similarity?: number;
  seconds?: number;
}

export interface JobSurahStartEvent extends BaseJobEvent {
  type: "surah_start";
  surah_id: number;
  total?: number;
}

export interface JobSurahDoneEvent extends BaseJobEvent {
  type: "surah_done";
  surah_id: number;
  aligned?: number;
  total?: number;
  avg_similarity?: number;
  similarity?: number;
  seconds?: number;
}

export interface JobSurahSkippedEvent extends BaseJobEvent {
  type: "surah_skipped";
  surah_id: number;
}

export interface JobSurahErrorEvent extends BaseJobEvent {
  type: "surah_error";
  surah_id: number;
}

export interface JobUnknownEvent extends BaseJobEvent {
  type: "unknown";
  raw_type: string;
  data: Record<string, unknown>;
}

export type JobEvent =
  | JobLogEvent
  | JobProgressEvent
  | JobSurahStartEvent
  | JobSurahDoneEvent
  | JobSurahSkippedEvent
  | JobSurahErrorEvent
  | JobUnknownEvent;

export type JobLogEntry = JobEvent;

export interface JobConfig {
  audioDir: string;
  reciterId: string;
  recitationId: string;
  reciterName: string;
  surahIds?: number[];
}

export interface EnvCheckResult {
  python: boolean;
  pythonVersion: string | null;
  pythonPath: string | null;
  pip: boolean;
  ffmpeg: boolean;
  ffmpegPath: string | null;
  munajjam: boolean;
  munajjamVersion: string | null;
  platform: string;
  platformSupported: boolean;
  packageManagerAvailable: boolean;
  packageManagerName: string | null;
  managedInstallPath: string | null;
  localPackageAvailable: boolean;
  localPackagePath: string | null;
}

export interface EnvInstallProgress {
  type: "stdout" | "stderr" | "exit";
  data: string;
  exitCode?: number;
}

export interface IpcErrorInfo {
  code: string;
  message: string;
  details?: unknown;
}

export interface IpcResponse<T> {
  ok: true;
  data: T;
}

export interface IpcErrorResponse {
  ok: false;
  error: IpcErrorInfo;
}

export type IpcResult<T> = IpcResponse<T> | IpcErrorResponse;

export interface MunajjamBridge {
  platform: string;
  data: {
    listReciters: () => Promise<ReciterRow[]>;
    createReciter: (payload: { nameArabic: string; nameEnglish: string; nameTransliteration?: string }) => Promise<ReciterRow>;
    updateReciterImage: (payload: { reciterId: string; imagePath: string }) => Promise<ReciterRow>;
    listRecitations: (reciterId: string) => Promise<RecitationVersion[]>;
    createRecitation: (payload: { reciterId: string; versionName: string; versionLabel?: string }) => Promise<RecitationVersion>;
    listAlignments: (payload: { recitationId: string; surahId: number }) => Promise<AlignmentRow[]>;
    listAlignmentStats: (recitationId: string) => Promise<{ surah_id: number; similarity_score: number | null }[]>;
    upsertAlignments: (rows: AlignmentRow[]) => Promise<{ success: boolean }>;
    updateAlignment: (payload: { recitation_id: string; surah_id: number; ayah_number: number; start_time: number; end_time: number }) => Promise<{ success: boolean }>;
    getAudioFile: (payload: { reciterId: string; surahId: number }) => Promise<AudioFileRow | null>;
    upsertAudioFiles: (rows: AudioFileRow[]) => Promise<{ success: boolean }>;
    getWorkspaceState: () => Promise<unknown>;
    saveWorkspaceState: (state: unknown) => Promise<{ success: boolean }>;
  };
  quran: {
    getSurahText: (surahId: number) => Promise<{ ayah_number: number; text: string }[]>;
  };
  jobs: {
    start: (config: JobConfig) => Promise<JobRow>;
    cancel: (jobId: string) => Promise<{ success: boolean }>;
    list: () => Promise<JobRow[]>;
    subscribe: (callback: (job: JobRow) => void) => () => void;
  };
  dialog: {
    selectFolder: () => Promise<string | null>;
    selectAudioFiles: () => Promise<string[] | null>;
    selectImage: () => Promise<string | null>;
    saveFile: (options?: { defaultPath?: string }) => Promise<{ token: string } | null>;
  };
  files: {
    saveAudio: (sourcePath: string, reciterId: string, surahId: number) => Promise<{ path: string }>;
    saveReciterImage: (sourcePath: string, reciterId: string) => Promise<{ imagePath: string }>;
    findAudioInDir: (audioDir: string, surahId: number) => Promise<string | null>;
    listAudioInDir: (audioDir: string) => Promise<AudioFileScanResult[]>;
  };
  export: {
    writeJson: (token: string, payload: unknown) => Promise<{ success: boolean }>;
  };
  peaks: {
    get: (reciterId: string, surahId: number) => Promise<{ peaks: number[][]; duration?: number; sampleRate?: number } | null>;
    generate: (audioPath: string, reciterId: string, surahId: number) => Promise<{ peaks: number[][]; duration?: number; sampleRate?: number }>;
  };
  env: {
    check: () => Promise<EnvCheckResult>;
    installRuntime: () => Promise<{ success: boolean }>;
    subscribe: (callback: (progress: EnvInstallProgress) => void) => () => void;
  };
}
