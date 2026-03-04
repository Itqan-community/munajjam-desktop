import { IpcHandlerError } from "./errors";

export function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new IpcHandlerError("INVALID_PAYLOAD", `${label} must be an object`);
  }
}

export function asNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new IpcHandlerError("INVALID_PAYLOAD", `${label} must be a non-empty string`);
  }
  return value.trim();
}

export function asOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new IpcHandlerError("INVALID_PAYLOAD", `${label} must be a string`);
  }
  return value;
}

export function asNumberInRange(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new IpcHandlerError("INVALID_PAYLOAD", `${label} must be a number between ${min} and ${max}`);
  }
  return value;
}

export function asIntegerInRange(value: unknown, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new IpcHandlerError("INVALID_PAYLOAD", `${label} must be an integer between ${min} and ${max}`);
  }
  return value as number;
}

export function asStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new IpcHandlerError("INVALID_PAYLOAD", `${label} must be an array of strings`);
  }
  return value;
}

export function asOptionalIntegerArray(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new IpcHandlerError("INVALID_PAYLOAD", `${label} must be an array`);
  }
  return value.map((item, idx) => asIntegerInRange(item, `${label}[${idx}]`, min, max));
}

export function isJsonValue(value: unknown): boolean {
  if (value === null) return true;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (t === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  return false;
}
