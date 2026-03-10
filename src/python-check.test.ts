import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getAppPath: () => "/tmp/app",
    getPath: () => "/tmp/user-data",
  },
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

import { resolveInstallerInvocation } from "./python-check";

describe("resolveInstallerInvocation", () => {
  it("builds the macOS installer invocation", () => {
    expect(resolveInstallerInvocation("darwin", "/tmp/install.sh", "/tmp/runtime")).toEqual({
      command: "bash",
      args: [
        "/tmp/install.sh",
        "--root",
        "/tmp/runtime",
        "--repo-url",
        "https://github.com/Itqan-community/Munajjam.git",
        "--repo-ref",
        "main",
        "--python-version",
        "3.12",
      ],
    });
  });

  it("builds the Windows installer invocation", () => {
    expect(
      resolveInstallerInvocation("win32", "C:\\install.ps1", "C:\\runtime"),
    ).toEqual({
      command: "powershell.exe",
      args: [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "C:\\install.ps1",
        "-Root",
        "C:\\runtime",
        "-RepoUrl",
        "https://github.com/Itqan-community/Munajjam.git",
        "-RepoRef",
        "main",
        "-PythonVersion",
        "3.12",
      ],
    });
  });

  it("returns null for unsupported platforms", () => {
    expect(resolveInstallerInvocation("linux", "/tmp/install.sh", "/tmp/runtime")).toBeNull();
  });
});
