import type { IpcErrorInfo, IpcResult } from "./ipc-types";

export class IpcHandlerError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "IpcHandlerError";
    this.code = code;
    this.details = details;
  }
}

export function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data };
}

export function errorResult(error: IpcErrorInfo): IpcResult<never> {
  return { ok: false, error };
}

export function toIpcErrorInfo(err: unknown, fallbackCode = "INTERNAL_ERROR"): IpcErrorInfo {
  if (err instanceof IpcHandlerError) {
    return {
      code: err.code,
      message: err.message,
      details: err.details,
    };
  }

  if (err instanceof Error) {
    return { code: fallbackCode, message: err.message };
  }

  return { code: fallbackCode, message: String(err) };
}
