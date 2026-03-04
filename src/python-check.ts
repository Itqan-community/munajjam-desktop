import { spawn } from "child_process";
import { BrowserWindow } from "electron";
import { inspectPythonRuntime } from "./python-runtime";
import type { EnvCheckResult, EnvInstallProgress } from "./ipc-types";

export async function checkEnvironment(): Promise<EnvCheckResult> {
  const runtime = await inspectPythonRuntime();

  return {
    python: !!runtime.command,
    pythonVersion: runtime.pythonVersion,
    pythonPath: runtime.pythonPath,
    pip: runtime.pipAvailable,
    munajjam: runtime.munajjamAvailable,
    munajjamVersion: runtime.munajjamVersion,
    platform: process.platform,
    localPackageAvailable: runtime.localPackageAvailable,
    localPackagePath: runtime.localPackagePath,
  };
}

function broadcastInstallProgress(progress: EnvInstallProgress) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("env:installProgress", progress);
  }
}

export async function installMunajjam(options?: { editable?: boolean; packagePath?: string }): Promise<number> {
  const runtime = await inspectPythonRuntime();
  if (!runtime.command) return 1;

  const pipArgs = [...runtime.prefix, "-m", "pip", "install"];

  if (options?.editable && options.packagePath) {
    pipArgs.push("-e", options.packagePath);
  } else {
    pipArgs.push("munajjam");
  }

  return new Promise((resolve) => {
    const child = spawn(runtime.command, pipArgs, {
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    child.stdout.on("data", (chunk) => {
      broadcastInstallProgress({ type: "stdout", data: chunk.toString() });
    });

    child.stderr.on("data", (chunk) => {
      broadcastInstallProgress({ type: "stderr", data: chunk.toString() });
    });

    child.on("error", () => {
      broadcastInstallProgress({ type: "exit", data: "Process failed to start", exitCode: 1 });
      resolve(1);
    });

    child.on("close", (code) => {
      const exitCode = code ?? 1;
      broadcastInstallProgress({ type: "exit", data: "", exitCode });
      resolve(exitCode);
    });
  });
}
