import { ipcMain, BrowserWindow } from "electron";
import { randomUUID } from "crypto";
import type { LocalDb } from "./db";
import type { JobsManager } from "./jobs";
import type { JobRow } from "./ipc-types";
import { errorResult, ok, toIpcErrorInfo, IpcHandlerError } from "./errors";
import { approvePath, isPathApproved } from "./approved-paths";
import { registerDataHandlers } from "./ipc/register-data";
import { registerDialogHandlers } from "./ipc/register-dialog";
import { registerEnvHandlers } from "./ipc/register-env";
import { registerFileHandlers } from "./ipc/register-files";
import { registerJobsHandlers } from "./ipc/register-jobs";
import { registerPeaksHandlers } from "./ipc/register-peaks";
import type { RegisterContext } from "./ipc/register-types";

interface IpcDeps {
  db: LocalDb;
  jobs: JobsManager;
  quranCsvPath: string;
}

const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "m4a", "flac"]);
const EXPORT_TICKET_TTL_MS = 5 * 60 * 1000;
const exportTickets = new Map<string, { filePath: string; expiresAt: number }>();

function issueExportTicket(filePath: string): string {
  const token = randomUUID();
  exportTickets.set(token, {
    filePath,
    expiresAt: Date.now() + EXPORT_TICKET_TTL_MS,
  });
  return token;
}

function consumeExportTicket(token: string): string {
  const entry = exportTickets.get(token);
  exportTickets.delete(token);

  if (!entry) {
    throw new IpcHandlerError("EXPORT_TOKEN_INVALID", "Invalid export token");
  }
  if (Date.now() > entry.expiresAt) {
    throw new IpcHandlerError("EXPORT_TOKEN_EXPIRED", "Export token has expired");
  }
  return entry.filePath;
}

function handle<T>(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => Promise<T> | T,
) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const data = await handler(event, ...args);
      return ok(data);
    } catch (err) {
      return errorResult(toIpcErrorInfo(err));
    }
  });
}

export function registerIpc({ db, jobs, quranCsvPath }: IpcDeps) {
  const context: RegisterContext = {
    db,
    jobs,
    quranCsvPath,
    approvePath,
    isPathApproved,
    issueExportTicket,
    consumeExportTicket,
    audioExtensions: AUDIO_EXTENSIONS,
  };

  registerDataHandlers(handle, context);
  registerJobsHandlers(handle, context);
  registerDialogHandlers(handle, context);
  registerFileHandlers(handle, context);
  registerPeaksHandlers(handle, context);
  registerEnvHandlers(handle);
}

export function broadcastJobUpdate(job: JobRow) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("jobs:update", job);
  }
}
