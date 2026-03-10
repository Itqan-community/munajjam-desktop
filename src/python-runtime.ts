import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import {
  localPackageDir,
  localPyprojectPath,
  managedFfmpegPathFile,
  managedPythonPath,
  managedRuntimeRoot,
  pythonPackageRoot,
  pythonScriptPath,
} from "./paths";

export interface PythonInvocation {
  command: string;
  prefix: string[];
}

export interface PythonRuntimeInfo extends PythonInvocation {
  pythonVersion: string | null;
  pythonPath: string | null;
  pipAvailable: boolean;
  ffmpegAvailable: boolean;
  ffmpegPath: string | null;
  munajjamAvailable: boolean;
  munajjamVersion: string | null;
  packageManagerAvailable: boolean;
  packageManagerName: string | null;
  managedInstallPath: string | null;
  platformSupported: boolean;
  localPackageAvailable: boolean;
  localPackagePath: string | null;
  localPythonPath: string | null;
}

export interface QuietResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface AlignmentEntrypoint {
  kind: "script" | "module";
  target: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export function isInstallerPlatformSupported(platform: NodeJS.Platform): boolean {
  return platform === "darwin" || platform === "win32";
}

export function getPackageManagerDetails(platform: NodeJS.Platform): { command: string; name: string } | null {
  if (platform === "darwin") {
    return { command: "brew", name: "Homebrew" };
  }
  if (platform === "win32") {
    return { command: "winget", name: "winget" };
  }
  return null;
}

function hasLocalPackage(): boolean {
  return fs.existsSync(localPyprojectPath());
}

function getLocalPackagePath(): string | null {
  return hasLocalPackage() ? localPackageDir() : null;
}

function getLocalPythonPath(): string | null {
  const root = pythonPackageRoot();
  return fs.existsSync(root) ? root : null;
}

function getManagedInstallPath(): string | null {
  return fs.existsSync(managedRuntimeRoot()) ? managedRuntimeRoot() : null;
}

function getManagedFfmpegPath(): string | null {
  const marker = managedFfmpegPathFile();
  if (!fs.existsSync(marker)) {
    return null;
  }

  const value = fs.readFileSync(marker, "utf-8").trim();
  if (!value) {
    return null;
  }

  return fs.existsSync(value) ? value : null;
}

function runQuiet(
  command: string,
  args: string[],
  timeout = DEFAULT_TIMEOUT_MS,
  env: NodeJS.ProcessEnv | undefined = undefined,
): Promise<QuietResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { timeout, env });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", () => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 1 });
    });
    child.on("close", (code) => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code ?? 1 });
    });
  });
}

async function resolvePythonInvocation(): Promise<PythonInvocation | null> {
  const override = process.env.MUNAJJAM_PYTHON;
  if (override) {
    const result = await runQuiet(override, ["--version"]);
    if (result.exitCode === 0) {
      return { command: override, prefix: [] };
    }
  }

  const managed = managedPythonPath();
  if (fs.existsSync(managed)) {
    const result = await runQuiet(managed, ["--version"]);
    if (result.exitCode === 0) {
      return { command: managed, prefix: [] };
    }
  }

  const candidates =
    process.platform === "win32"
      ? [
          { command: "py", prefix: ["-3"] },
          { command: "python", prefix: [] },
          { command: "python3", prefix: [] },
        ]
      : [
          { command: path.join(process.env.HOME ?? "", "miniforge3/bin/python3"), prefix: [] },
          { command: path.join(process.env.HOME ?? "", "miniconda3/bin/python3"), prefix: [] },
          { command: path.join(process.env.HOME ?? "", "anaconda3/bin/python3"), prefix: [] },
          { command: "/opt/homebrew/bin/python3", prefix: [] },
          { command: "/usr/local/bin/python3", prefix: [] },
          { command: "python3", prefix: [] },
        ];

  for (const candidate of candidates) {
    if (candidate.command.includes(path.sep) && !fs.existsSync(candidate.command)) {
      continue;
    }

    const result = await runQuiet(candidate.command, [...candidate.prefix, "--version"]);
    if (result.exitCode === 0) {
      return candidate;
    }
  }

  return null;
}

async function resolveCommandPath(command: string): Promise<string | null> {
  const locator = process.platform === "win32" ? "where" : "which";
  const result = await runQuiet(locator, [command]);
  if (result.exitCode !== 0) {
    return null;
  }
  const line = result.stdout.split(/\r?\n/).find((value) => value.trim().length > 0);
  return line ?? null;
}

async function probeMunajjamImport(
  invocation: PythonInvocation,
  extraEnv?: NodeJS.ProcessEnv,
): Promise<{ available: boolean; version: string | null }> {
  const result = await runQuiet(
    invocation.command,
    [...invocation.prefix, "-c", "import munajjam; print(getattr(munajjam, '__version__', 'unknown'))"],
    DEFAULT_TIMEOUT_MS,
    extraEnv,
  );
  return {
    available: result.exitCode === 0,
    version: result.exitCode === 0 ? result.stdout : null,
  };
}

export async function inspectPythonRuntime(): Promise<PythonRuntimeInfo> {
  const invocation = await resolvePythonInvocation();
  const localPackageAvailable = hasLocalPackage();
  const localPackagePath = getLocalPackagePath();
  const localPythonPath = getLocalPythonPath();
  const managedInstallPath = getManagedInstallPath();
  const packageManager = getPackageManagerDetails(process.platform);
  const packageManagerResult = packageManager
    ? await runQuiet(packageManager.command, ["--version"])
    : { exitCode: 1 };
  const ffmpegPath = getManagedFfmpegPath() ?? (await resolveCommandPath("ffmpeg"));
  const ffmpegAvailable = !!ffmpegPath;

  if (!invocation) {
    return {
      command: "",
      prefix: [],
      pythonVersion: null,
      pythonPath: null,
      pipAvailable: false,
      ffmpegAvailable,
      ffmpegPath,
      munajjamAvailable: false,
      munajjamVersion: null,
      packageManagerAvailable: packageManagerResult.exitCode === 0,
      packageManagerName: packageManager?.name ?? null,
      managedInstallPath,
      platformSupported: isInstallerPlatformSupported(process.platform),
      localPackageAvailable,
      localPackagePath,
      localPythonPath,
    };
  }

  const versionResult = await runQuiet(invocation.command, [...invocation.prefix, "--version"]);
  const pythonPathResult = await runQuiet(invocation.command, [
    ...invocation.prefix,
    "-c",
    "import sys; print(sys.executable)",
  ]);
  const pipResult = await runQuiet(invocation.command, [...invocation.prefix, "-m", "pip", "--version"]);
  let munajjamResult = await probeMunajjamImport(invocation);
  if (!munajjamResult.available && localPythonPath) {
    munajjamResult = await probeMunajjamImport(invocation, {
      ...process.env,
      PYTHONPATH: [localPythonPath, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
    });
  }

  const versionMatch = versionResult.stdout.match(/Python\\s+([\\d.]+)/);

  return {
    ...invocation,
    pythonVersion: versionResult.exitCode === 0 ? versionMatch?.[1] ?? versionResult.stdout : null,
    pythonPath: pythonPathResult.exitCode === 0 ? pythonPathResult.stdout : null,
    pipAvailable: pipResult.exitCode === 0,
    ffmpegAvailable,
    ffmpegPath,
    munajjamAvailable: munajjamResult.available,
    munajjamVersion: munajjamResult.version,
    packageManagerAvailable: packageManagerResult.exitCode === 0,
    packageManagerName: packageManager?.name ?? null,
    managedInstallPath,
    platformSupported: isInstallerPlatformSupported(process.platform),
    localPackageAvailable,
    localPackagePath,
    localPythonPath,
  };
}

async function canImportModule(invocation: PythonInvocation, moduleName: string): Promise<boolean> {
  const escapedModule = JSON.stringify(moduleName);
  const probe = await runQuiet(invocation.command, [
    ...invocation.prefix,
    "-c",
    `import importlib.util,sys;sys.exit(0 if importlib.util.find_spec(${escapedModule}) else 1)`,
  ]);
  return probe.exitCode === 0;
}

export async function resolveAlignmentEntrypoint(
  invocation: PythonInvocation,
): Promise<AlignmentEntrypoint | null> {
  const overrideScript = process.env.MUNAJJAM_ALIGN_SCRIPT;
  if (overrideScript && fs.existsSync(overrideScript)) {
    return { kind: "script", target: overrideScript };
  }

  const localScript = pythonScriptPath();
  if (fs.existsSync(localScript)) {
    return { kind: "script", target: localScript };
  }

  const moduleCandidates = [
    process.env.MUNAJJAM_ALIGN_MODULE,
    "munajjam.scripts.align_batch_cli",
    "munajjam.align_batch_cli",
  ].filter((value): value is string => !!value && value.trim().length > 0);

  for (const moduleName of moduleCandidates) {
    if (await canImportModule(invocation, moduleName)) {
      return { kind: "module", target: moduleName };
    }
  }

  return null;
}
