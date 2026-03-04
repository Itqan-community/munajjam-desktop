import path from "path";
import { app } from "electron";

const APPROVED_PATHS = new Set<string>();

export function approvePath(value: string): void {
  APPROVED_PATHS.add(path.resolve(value));
}

export function isPathApproved(value: string): boolean {
  const resolved = path.resolve(value);
  const userData = path.resolve(app.getPath("userData"));

  if (resolved === userData || resolved.startsWith(`${userData}${path.sep}`)) {
    return true;
  }

  for (const approved of APPROVED_PATHS) {
    if (resolved === approved || resolved.startsWith(`${approved}${path.sep}`)) {
      return true;
    }
  }

  return false;
}
