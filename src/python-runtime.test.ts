import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getAppPath: () => "/tmp/app",
    getPath: () => "/tmp/user-data",
  },
}));

import { getPackageManagerDetails, isInstallerPlatformSupported } from "./python-runtime";

describe("isInstallerPlatformSupported", () => {
  it("supports only macOS and Windows", () => {
    expect(isInstallerPlatformSupported("darwin")).toBe(true);
    expect(isInstallerPlatformSupported("win32")).toBe(true);
    expect(isInstallerPlatformSupported("linux")).toBe(false);
  });
});

describe("getPackageManagerDetails", () => {
  it("maps supported platforms to the expected package manager", () => {
    expect(getPackageManagerDetails("darwin")).toEqual({
      command: "brew",
      name: "Homebrew",
    });
    expect(getPackageManagerDetails("win32")).toEqual({
      command: "winget",
      name: "winget",
    });
  });

  it("returns null for unsupported platforms", () => {
    expect(getPackageManagerDetails("linux")).toBeNull();
  });
});
