import { spawn } from "child_process";
import fs from "fs";
import { BrowserWindow } from "electron";
import { inspectPythonRuntime } from "./python-runtime";
import { installerScriptPath, managedLogsDir, managedRuntimeRoot } from "./paths";
import type { EnvCheckResult, EnvInstallProgress } from "./ipc-types";

const MUNAJJAM_REPO_URL = "https://github.com/Itqan-community/Munajjam.git";
const MUNAJJAM_REPO_REF = "main";
const PYTHON_VERSION = "3.12";

export interface InstallerInvocation {
  command: string;
  args: string[];
}

export function resolveInstallerInvocation(
  platform: NodeJS.Platform,
  scriptPath: string,
  rootPath: string,
): InstallerInvocation | null {
  const posixArgs = [
    "--root",
    rootPath,
    "--repo-url",
    MUNAJJAM_REPO_URL,
    "--repo-ref",
    MUNAJJAM_REPO_REF,
    "--python-version",
    PYTHON_VERSION,
  ];

  if (platform === "darwin") {
    return {
      command: "bash",
      args: [scriptPath, ...posixArgs],
    };
  }

  if (platform === "win32") {
    const windowsArgs = [
      "-Root",
      rootPath,
      "-RepoUrl",
      MUNAJJAM_REPO_URL,
      "-RepoRef",
      MUNAJJAM_REPO_REF,
      "-PythonVersion",
      PYTHON_VERSION,
    ];

    return {
      command: "powershell.exe",
      args: [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
        ...windowsArgs,
      ],
    };
  }

  return null;
}

export async function checkEnvironment(): Promise<EnvCheckResult> {
  const runtime = await inspectPythonRuntime();

  return {
    python: !!runtime.command,
    pythonVersion: runtime.pythonVersion,
    pythonPath: runtime.pythonPath,
    pip: runtime.pipAvailable,
    ffmpeg: runtime.ffmpegAvailable,
    ffmpegPath: runtime.ffmpegPath,
    munajjam: runtime.munajjamAvailable,
    munajjamVersion: runtime.munajjamVersion,
    platform: process.platform,
    platformSupported: runtime.platformSupported,
    packageManagerAvailable: runtime.packageManagerAvailable,
    packageManagerName: runtime.packageManagerName,
    managedInstallPath: runtime.managedInstallPath,
    localPackageAvailable: runtime.localPackageAvailable,
    localPackagePath: runtime.localPackagePath,
  };
}

function broadcastInstallProgress(progress: EnvInstallProgress) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("env:installProgress", progress);
  }
}

export async function installRuntime(): Promise<number> {
  const scriptPath = installerScriptPath();
  const rootPath = managedRuntimeRoot();
  const invocation = resolveInstallerInvocation(process.platform, scriptPath, rootPath);

  if (!invocation) {
    broadcastInstallProgress({
      type: "stderr",
      data: `Automated runtime installation is not supported on ${process.platform}\n`,
    });
    broadcastInstallProgress({ type: "exit", data: "", exitCode: 1 });
    return 1;
  }

  if (!fs.existsSync(scriptPath)) {
    broadcastInstallProgress({
      type: "stderr",
      data: `Installer script not found: ${scriptPath}\n`,
    });
    broadcastInstallProgress({ type: "exit", data: "", exitCode: 1 });
    return 1;
  }

  fs.mkdirSync(rootPath, { recursive: true });
  fs.mkdirSync(managedLogsDir(), { recursive: true });

  return new Promise((resolve) => {
    const child = spawn(invocation.command, invocation.args, {
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    child.stdout.on("data", (chunk) => {
      broadcastInstallProgress({ type: "stdout", data: chunk.toString() });
    });

    child.stderr.on("data", (chunk) => {
      broadcastInstallProgress({ type: "stderr", data: chunk.toString() });
    });

    child.on("error", (error) => {
      broadcastInstallProgress({
        type: "stderr",
        data: `Installer failed to start: ${String(error)}\n`,
      });
      broadcastInstallProgress({ type: "exit", data: "", exitCode: 1 });
      resolve(1);
    });

    child.on("close", (code) => {
      const exitCode = code ?? 1;
      broadcastInstallProgress({ type: "exit", data: "", exitCode });
      resolve(exitCode);
    });
  });
}
