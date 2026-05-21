import { spawn } from "child_process";
import fs from "fs";
import { BrowserWindow } from "electron";
import { inspectPythonRuntime } from "./python-runtime";
import {
  installerScriptPath,
  managedLogsDir,
  managedRuntimeRoot,
} from "./paths";
import { createLogger } from "./logger";
import type { EnvCheckResult, EnvInstallProgress } from "./ipc-types";

const log = createLogger("python-check");

const MUNAJJAM_REPO_URL = "https://github.com/Itqan-community/Munajjam";
const MUNAJJAM_REPO_REF = "main";
const PYTHON_VERSION = "3.12";
let activeInstall: Promise<number> | null = null;

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
  log.info("Starting environment check", { platform: process.platform });

  const runtime = await inspectPythonRuntime();

  const result: EnvCheckResult = {
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

  log.info("Environment check completed", {
    python: result.python,
    pythonVersion: result.pythonVersion,
    ffmpeg: result.ffmpeg,
    munajjam: result.munajjam,
    munajjamVersion: result.munajjamVersion,
  });

  return result;
}

function broadcastInstallProgress(progress: EnvInstallProgress) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("env:installProgress", progress);
  }
}

function installerEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const overrideKeys = [
    "MUNAJJAM_ALIGN_MODULE",
    "MUNAJJAM_ALIGN_SCRIPT",
    "MUNAJJAM_DEV_URL",
    "MUNAJJAM_PYTHON",
    "MUNAJJAM_REPO_ROOT",
    "MUNAJJAM_UI_DIR",
  ];

  for (const key of overrideKeys) {
    delete env[key];
  }

  return { ...env, PYTHONUNBUFFERED: "1", PYTHONIOENCODING: "utf-8" };
}

async function runInstallRuntime(): Promise<number> {
  const scriptPath = installerScriptPath();
  const rootPath = managedRuntimeRoot();
  const invocation = resolveInstallerInvocation(process.platform, scriptPath, rootPath);

  log.info("installRuntime called", { scriptPath, rootPath, platform: process.platform });

  if (!invocation) {
    const msg = `Automated runtime installation is not supported on ${process.platform}`;
    log.error(msg);
    broadcastInstallProgress({ type: "stderr", data: msg + "\n" });
    broadcastInstallProgress({ type: "exit", data: "", exitCode: 1 });
    return 1;
  }

  if (!fs.existsSync(scriptPath)) {
    const msg = `Installer script not found: ${scriptPath}`;
    log.error(msg);
    broadcastInstallProgress({ type: "stderr", data: msg + "\n" });
    broadcastInstallProgress({ type: "exit", data: "", exitCode: 1 });
    return 1;
  }

  fs.mkdirSync(rootPath, { recursive: true });
  fs.mkdirSync(managedLogsDir(), { recursive: true });

  return new Promise((resolve) => {
    const child = spawn(invocation.command, invocation.args, {
      env: installerEnvironment(),
    });

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      log.debug("installer stdout", text.trimEnd());
      broadcastInstallProgress({ type: "stdout", data: text });
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      log.warn("installer stderr", text.trimEnd());
      broadcastInstallProgress({ type: "stderr", data: text });
    });

    child.on("error", (error) => {
      log.error("Installer failed to start", { error: String(error) });
      broadcastInstallProgress({
        type: "stderr",
        data: `Installer failed to start: ${String(error)}\n`,
      });
      broadcastInstallProgress({ type: "exit", data: "", exitCode: 1 });
      resolve(1);
    });

    child.on("close", (code) => {
      const exitCode = code ?? 1;
      log.info("Installer exited", { exitCode });
      broadcastInstallProgress({ type: "exit", data: "", exitCode });
      resolve(exitCode);
    });
  });
}

export async function installRuntime(): Promise<number> {
  if (activeInstall) {
    log.info("installRuntime already running; joining existing invocation");
    return activeInstall;
  }

  activeInstall = runInstallRuntime().finally(() => {
    activeInstall = null;
  });

  return activeInstall;
}
