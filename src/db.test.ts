import fs from "fs";
import os from "os";
import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { LocalDb } from "./db";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("LocalDb schema reset", () => {
  it("backs up legacy db and creates fresh schema", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "munajjam-db-"));
    tempDirs.push(dir);
    const dbPath = path.join(dir, "munajjam.db");

    const legacy = new Database(dbPath);
    legacy.exec("CREATE TABLE legacy (id TEXT PRIMARY KEY); INSERT INTO legacy (id) VALUES ('x');");
    legacy.close();

    const db = new LocalDb(dbPath);
    const reciters = db.listReciters();
    expect(reciters.length).toBeGreaterThan(0);

    const backups = fs.readdirSync(dir).filter((name) => name.startsWith("munajjam.db.backup-"));
    expect(backups.length).toBe(1);
  });
});
