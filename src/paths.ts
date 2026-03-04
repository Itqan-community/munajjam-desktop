import path from "path";
import fs from "fs";
import { app } from "electron";

const repoRoot = () =>
  process.env.MUNAJJAM_REPO_ROOT || path.resolve(app.getAppPath(), "..");

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
  path.join(repoRoot(), "Munajjam", "munajjam", "munajjam", "data", "quran_ayat.csv");

export const pythonScriptPath = () => {
  const override = process.env.MUNAJJAM_ALIGN_SCRIPT;
  if (override && fs.existsSync(override)) return override;
  return path.join(repoRoot(), "Munajjam", "scripts", "align_batch_cli.py");
};

export const pythonPackageRoot = () =>
  path.join(repoRoot(), "Munajjam");

export const localPyprojectPath = () =>
  path.join(repoRoot(), "Munajjam", "munajjam", "pyproject.toml");

export const localPackageDir = () =>
  path.join(repoRoot(), "Munajjam", "munajjam");
