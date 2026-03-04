import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { isWithin, toSafeAppFilePath } from "./protocols";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("protocol path safety", () => {
  it("checks base-path containment safely", () => {
    const base = "/tmp/base";
    expect(isWithin(base, "/tmp/base/file.txt")).toBe(true);
    expect(isWithin(base, "/tmp/base/../base/file.txt")).toBe(true);
    expect(isWithin(base, "/tmp/other/file.txt")).toBe(false);
  });

  it("resolves route and html fallback inside out dir", () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "munajjam-out-"));
    tempDirs.push(outDir);
    fs.writeFileSync(path.join(outDir, "en.html"), "<html/>", "utf-8");
    fs.writeFileSync(path.join(outDir, "ar.html"), "<html/>", "utf-8");

    expect(toSafeAppFilePath(outDir, "/")).toBe(path.join(outDir, "en.html"));
    expect(toSafeAppFilePath(outDir, "/ar")).toBe(path.join(outDir, "ar.html"));
    expect(toSafeAppFilePath(outDir, "/missing")).toBe(path.join(outDir, "missing"));
  });
});
