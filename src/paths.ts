import path from "path";
import fs from "fs";
import { app } from "electron";

const repoRoot = () =>
  process.env.MUNAJJAM_REPO_ROOT || path.resolve(app.getAppPath(), "..");

const desktopRoot = () => {
  const appPath = app.getAppPath();
  if (fs.existsSync(path.join(appPath, "ui")) && fs.existsSync(path.join(appPath, "src"))) {
    return appPath;
  }
  return path.join(repoRoot(), "munajjam-desktop");
};

const resourcePath = (...segments: string[]) => {
  const bundled = path.join(process.resourcesPath, ...segments);
  if (fs.existsSync(bundled)) return bundled;
  return path.join(desktopRoot(), "resources", ...segments);
};

export const managedRuntimeRoot = () =>
  path.join(app.getPath("userData"), "runtime", "munajjam");

export const managedLogsDir = () =>
  path.join(managedRuntimeRoot(), "logs");

export const managedFfmpegPathFile = () =>
  path.join(managedRuntimeRoot(), "ffmpeg-path.txt");

export const managedRepoRoot = () =>
  path.join(managedRuntimeRoot(), "repo");

export const managedPackageDir = () =>
  path.join(managedRepoRoot(), "munajjam");

export const managedVenvDir = () =>
  path.join(managedRuntimeRoot(), "venv");

export const managedPythonPath = () =>
  process.platform === "win32"
    ? path.join(managedVenvDir(), "Scripts", "python.exe")
    : path.join(managedVenvDir(), "bin", "python");

export const uiDir = () => {
  if (process.env.MUNAJJAM_UI_DIR) return process.env.MUNAJJAM_UI_DIR;
  const packagedUi = path.join(app.getAppPath(), "ui");
  if (fs.existsSync(packagedUi)) return packagedUi;
  return path.join(repoRoot(), "munajjam-desktop", "ui");
};

export const uiOutDir = () => {
  if (process.env.MUNAJJAM_UI_DIR) return process.env.MUNAJJAM_UI_DIR;
  const resourcesOut = path.join(process.resourcesPath, "ui", "out");
  if (fs.existsSync(resourcesOut)) return resourcesOut;
  const localOut = path.join(app.getAppPath(), "ui", "out");
  if (fs.existsSync(localOut)) return localOut;
  return path.join(repoRoot(), "munajjam-desktop", "ui", "out");
};

export const quranCsvPath = () =>
  fs.existsSync(managedQuranCsvPath())
    ? managedQuranCsvPath()
    : path.join(repoRoot(), "Munajjam", "munajjam", "munajjam", "data", "quran_ayat.csv");

export const managedQuranCsvPath = () =>
  path.join(managedPackageDir(), "munajjam", "data", "quran_ayat.csv");

export const pythonScriptPath = () => {
  const override = process.env.MUNAJJAM_ALIGN_SCRIPT;
  if (override && fs.existsSync(override)) return override;
  return resourcePath("python", "align_batch_cli.py");
};

export const pythonPackageRoot = () =>
  path.join(repoRoot(), "Munajjam");

export const localPyprojectPath = () =>
  path.join(repoRoot(), "Munajjam", "munajjam", "pyproject.toml");

export const localPackageDir = () =>
  path.join(repoRoot(), "Munajjam", "munajjam");

export const installerScriptPath = () =>
  resourcePath(
    "installers",
    process.platform === "win32" ? "install-munajjam-windows.ps1" : "install-munajjam-macos.sh",
  );
