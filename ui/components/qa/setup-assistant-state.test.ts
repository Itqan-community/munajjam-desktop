import { describe, expect, it } from "vitest";
import { getSetupAssistantState } from "./setup-assistant-state";

describe("getSetupAssistantState", () => {
  it("shows unsupported state for non-supported platforms", () => {
    expect(
      getSetupAssistantState({
        python: false,
        pythonVersion: null,
        pythonPath: null,
        pip: false,
        ffmpeg: false,
        ffmpegPath: null,
        munajjam: false,
        munajjamVersion: null,
        platform: "linux",
        platformSupported: false,
        packageManagerAvailable: false,
        packageManagerName: null,
        managedInstallPath: null,
        localPackageAvailable: false,
        localPackagePath: null,
      }),
    ).toEqual({
      isReady: false,
      showInstaller: false,
      showUnsupported: true,
    });
  });

  it("shows installer on supported platforms until all runtime requirements exist", () => {
    expect(
      getSetupAssistantState({
        python: true,
        pythonVersion: "3.12.8",
        pythonPath: "/tmp/python",
        pip: true,
        ffmpeg: false,
        ffmpegPath: null,
        munajjam: false,
        munajjamVersion: null,
        platform: "darwin",
        platformSupported: true,
        packageManagerAvailable: true,
        packageManagerName: "Homebrew",
        managedInstallPath: "/tmp/runtime",
        localPackageAvailable: false,
        localPackagePath: null,
      }),
    ).toEqual({
      isReady: false,
      showInstaller: true,
      showUnsupported: false,
    });
  });

  it("marks the environment ready only when python, ffmpeg, and munajjam are all available", () => {
    expect(
      getSetupAssistantState({
        python: true,
        pythonVersion: "3.12.8",
        pythonPath: "/tmp/python",
        pip: true,
        ffmpeg: true,
        ffmpegPath: "/tmp/ffmpeg",
        munajjam: true,
        munajjamVersion: "0.1.0",
        platform: "win32",
        platformSupported: true,
        packageManagerAvailable: true,
        packageManagerName: "winget",
        managedInstallPath: "C:\\runtime",
        localPackageAvailable: false,
        localPackagePath: null,
      }),
    ).toEqual({
      isReady: true,
      showInstaller: false,
      showUnsupported: false,
    });
  });
});
