import type { LocalDb } from "../db";
import type { JobsManager } from "../jobs";

export type RegisterHandler = (
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown> | unknown,
) => void;

export interface RegisterContext {
  db: LocalDb;
  jobs: JobsManager;
  quranCsvPath: string;
  approvePath: (value: string) => void;
  isPathApproved: (value: string) => boolean;
  issueExportTicket: (filePath: string) => string;
  consumeExportTicket: (token: string) => string;
  audioExtensions: ReadonlySet<string>;
}
