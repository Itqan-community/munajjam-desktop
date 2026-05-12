import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EXPORT_TICKET_TTL_MS,
  consumeExportTicket,
  getActiveExportTicketCount,
  issueExportTicket,
} from "./export-tickets";

describe("export tickets", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    // Expire and drain leftover tickets so module state does not leak between tests:
    // issueExportTicket prunes expired entries, then consume removes the drain entry itself.
    vi.advanceTimersByTime(EXPORT_TICKET_TTL_MS * 2);
    const drainToken = issueExportTicket("/drain");
    consumeExportTicket(drainToken);
    vi.useRealTimers();
  });

  it("issues a token that consume resolves to the original path", () => {
    const token = issueExportTicket("/tmp/out.json");
    expect(consumeExportTicket(token)).toBe("/tmp/out.json");
  });

  it("rejects unknown tokens", () => {
    expect(() => consumeExportTicket("not-a-real-token")).toThrow(/Invalid export token/);
  });

  it("rejects expired tokens", () => {
    const token = issueExportTicket("/tmp/out.json");
    vi.advanceTimersByTime(EXPORT_TICKET_TTL_MS + 1);
    expect(() => consumeExportTicket(token)).toThrow(/expired/i);
  });

  it("removes a token from the map after consume", () => {
    const token = issueExportTicket("/tmp/out.json");
    expect(getActiveExportTicketCount()).toBe(1);
    consumeExportTicket(token);
    expect(getActiveExportTicketCount()).toBe(0);
  });

  it("prunes expired tickets when a new ticket is issued", () => {
    issueExportTicket("/tmp/a");
    issueExportTicket("/tmp/b");
    expect(getActiveExportTicketCount()).toBe(2);

    vi.advanceTimersByTime(EXPORT_TICKET_TTL_MS + 1);
    issueExportTicket("/tmp/c");

    expect(getActiveExportTicketCount()).toBe(1);
  });
});
