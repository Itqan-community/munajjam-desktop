import { randomUUID } from "crypto";
import { IpcHandlerError } from "./errors";

export const EXPORT_TICKET_TTL_MS = 5 * 60 * 1000;

interface ExportTicketEntry {
  filePath: string;
  expiresAt: number;
}

const exportTickets = new Map<string, ExportTicketEntry>();

function pruneExpiredExportTickets(): void {
  const now = Date.now();
  for (const [token, entry] of exportTickets) {
    if (now > entry.expiresAt) {
      exportTickets.delete(token);
    }
  }
}

export function issueExportTicket(filePath: string): string {
  pruneExpiredExportTickets();
  const token = randomUUID();
  exportTickets.set(token, {
    filePath,
    expiresAt: Date.now() + EXPORT_TICKET_TTL_MS,
  });
  return token;
}

export function consumeExportTicket(token: string): string {
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

export function getActiveExportTicketCount(): number {
  return exportTickets.size;
}
