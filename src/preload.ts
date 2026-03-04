import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import type {
  MunajjamBridge,
  AlignmentRow,
  AudioFileRow,
  JobConfig,
  JobRow,
  EnvInstallProgress,
  IpcErrorInfo,
  IpcResult,
} from "./ipc-types";

class BridgeError extends Error {
  code: string;
  details?: unknown;

  constructor(error: IpcErrorInfo) {
    super(error.message);
    this.name = "BridgeError";
    this.code = error.code;
    this.details = error.details;
  }
}

async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<T>;
  if (!result || typeof result !== "object" || !("ok" in result)) {
    throw new BridgeError({
      code: "MALFORMED_IPC_RESPONSE",
      message: `Malformed IPC response from channel ${channel}`,
    });
  }
  if (!result.ok) {
    throw new BridgeError(result.error);
  }
  return result.data;
}

const bridge: MunajjamBridge = {
  platform: process.platform,
  data: {
    listReciters: () => invoke("data:listReciters"),
    createReciter: (payload: { nameArabic: string; nameEnglish: string; nameTransliteration?: string }) =>
      invoke("data:createReciter", payload),
    updateReciterImage: (payload: { reciterId: string; imagePath: string }) =>
      invoke("data:updateReciterImage", payload),
    listRecitations: (reciterId: string) => invoke("data:listRecitations", reciterId),
    createRecitation: (payload: { reciterId: string; versionName: string; versionLabel?: string }) =>
      invoke("data:createRecitation", payload),
    listAlignments: (payload: { recitationId: string; surahId: number }) =>
      invoke("data:listAlignments", payload),
    listAlignmentStats: (recitationId: string) =>
      invoke("data:listAlignmentStats", recitationId),
    upsertAlignments: (rows: AlignmentRow[]) => invoke("data:upsertAlignments", rows),
    updateAlignment: (payload: { recitation_id: string; surah_id: number; ayah_number: number; start_time: number; end_time: number }) =>
      invoke("data:updateAlignment", payload),
    getAudioFile: (payload: { reciterId: string; surahId: number }) =>
      invoke("data:getAudioFile", payload),
    upsertAudioFiles: (rows: AudioFileRow[]) => invoke("data:upsertAudioFiles", rows),
    getWorkspaceState: () => invoke("data:getWorkspaceState"),
    saveWorkspaceState: (state: unknown) => invoke("data:saveWorkspaceState", state),
  },
  quran: {
    getSurahText: (surahId: number) => invoke("quran:getSurahText", surahId),
  },
  jobs: {
    start: (config: JobConfig) => invoke("jobs:start", config),
    cancel: (jobId: string) => invoke("jobs:cancel", jobId),
    list: () => invoke("jobs:list"),
    subscribe: (callback: (job: JobRow) => void) => {
      const handler = (_event: IpcRendererEvent, job: JobRow) => callback(job);
      ipcRenderer.on("jobs:update", handler);
      return () => ipcRenderer.removeListener("jobs:update", handler);
    },
  },
  dialog: {
    selectFolder: () => invoke("dialog:selectFolder"),
    selectAudioFiles: () => invoke("dialog:selectAudioFiles"),
    selectImage: () => invoke("dialog:selectImage"),
    saveFile: (options?: { defaultPath?: string }) => invoke("dialog:saveFile", options),
  },
  files: {
    saveAudio: (sourcePath: string, reciterId: string, surahId: number) =>
      invoke("files:saveAudio", { sourcePath, reciterId, surahId }),
    saveReciterImage: (sourcePath: string, reciterId: string) =>
      invoke("files:saveReciterImage", { sourcePath, reciterId }),
    findAudioInDir: (audioDir: string, surahId: number) =>
      invoke("files:findAudioInDir", { audioDir, surahId }),
    listAudioInDir: (audioDir: string) =>
      invoke("files:listAudioInDir", { audioDir }),
  },
  export: {
    writeJson: (token: string, payload: unknown) => invoke("export:writeJson", { token, payload }),
  },
  peaks: {
    get: (reciterId: string, surahId: number) => invoke("peaks:get", { reciterId, surahId }),
    generate: (audioPath: string, reciterId: string, surahId: number) =>
      invoke("peaks:generate", { audioPath, reciterId, surahId }),
  },
  env: {
    check: () => invoke("env:check"),
    installMunajjam: (options?: { editable?: boolean; packagePath?: string }) =>
      invoke("env:installMunajjam", options),
    subscribe: (callback: (progress: EnvInstallProgress) => void) => {
      const handler = (_event: IpcRendererEvent, progress: EnvInstallProgress) => callback(progress);
      ipcRenderer.on("env:installProgress", handler);
      return () => ipcRenderer.removeListener("env:installProgress", handler);
    },
  },
};

contextBridge.exposeInMainWorld("munajjam", bridge);
