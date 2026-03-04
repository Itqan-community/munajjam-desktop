import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { app } from "electron";
import { uiDir } from "./paths";

export interface PeaksResult {
  peaks: number[][];
  duration?: number;
  sampleRate?: number;
}

function getPeaksPath(reciterId: string, surahId: number) {
  const padded = String(surahId).padStart(3, "0");
  return path.join(app.getPath("userData"), "peaks", reciterId, `${padded}.json`);
}

export async function loadPeaks(reciterId: string, surahId: number): Promise<PeaksResult | null> {
  const peaksPath = getPeaksPath(reciterId, surahId);
  if (!fs.existsSync(peaksPath)) return null;

  try {
    const raw = fs.readFileSync(peaksPath, "utf-8");
    const data = JSON.parse(raw);
    if (!data.peaks) return null;
    return data as PeaksResult;
  } catch {
    return null;
  }
}

export async function generatePeaks(audioPath: string, reciterId: string, surahId: number): Promise<PeaksResult> {
  const scriptPath = path.join(uiDir(), "scripts", "generate-peaks.js");
  const outputPath = getPeaksPath(reciterId, surahId);

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Peak generator script not found: ${scriptPath}`);
  }

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn("node", [scriptPath, audioPath, outputPath], {
      env: {
        ...process.env,
        PATH: process.env.PATH,
      },
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `generate-peaks exited with code ${code}`));
      }
    });
  });

  const loaded = await loadPeaks(reciterId, surahId);
  if (!loaded) {
    throw new Error("Failed to load generated peaks");
  }
  return loaded;
}
