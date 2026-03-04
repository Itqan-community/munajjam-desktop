import fs from "fs";
import path from "path";
import { app } from "electron";
import { IpcHandlerError } from "../errors";
import {
  assertRecord,
  asIntegerInRange,
  asNonEmptyString,
  isJsonValue,
} from "../validation";
import type { RegisterContext, RegisterHandler } from "./register-types";

export function registerFileHandlers(
  register: RegisterHandler,
  { isPathApproved, approvePath, consumeExportTicket, audioExtensions }: RegisterContext,
) {
  register("export:writeJson", async (_event, payload) => {
    assertRecord(payload, "payload");

    const token = asNonEmptyString(payload.token, "payload.token");
    const jsonPayload = payload.payload;

    if (!isJsonValue(jsonPayload)) {
      throw new IpcHandlerError("INVALID_PAYLOAD", "payload.payload must be JSON serializable");
    }

    const filePath = consumeExportTicket(token);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, `${JSON.stringify(jsonPayload, null, 2)}\n`, "utf-8");

    return { success: true };
  });

  register("files:findAudioInDir", async (_event, payload) => {
    assertRecord(payload, "payload");

    const audioDir = path.resolve(asNonEmptyString(payload.audioDir, "payload.audioDir"));
    const surahId = asIntegerInRange(payload.surahId, "payload.surahId", 1, 114);

    if (!isPathApproved(audioDir)) {
      throw new IpcHandlerError("FORBIDDEN_PATH", "Audio directory is not approved for access");
    }

    const padded = String(surahId).padStart(3, "0");
    for (const ext of audioExtensions) {
      const filePath = path.join(audioDir, `${padded}.${ext}`);
      try {
        await fs.promises.access(filePath);
        return filePath;
      } catch {
        // file does not exist, try next extension
      }
    }

    return null;
  });

  register("files:listAudioInDir", async (_event, payload) => {
    assertRecord(payload, "payload");

    const audioDir = path.resolve(asNonEmptyString(payload.audioDir, "payload.audioDir"));
    if (!isPathApproved(audioDir)) {
      throw new IpcHandlerError("FORBIDDEN_PATH", "Audio directory is not approved for access");
    }

    const entries = await fs.promises.readdir(audioDir, { withFileTypes: true });
    const results: { filename: string; fullPath: string; surahId: number | null }[] = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).slice(1).toLowerCase();
      if (!audioExtensions.has(ext)) continue;

      const stem = path.basename(entry.name, path.extname(entry.name));
      let surahId: number | null = null;
      if (/^\d+$/.test(stem)) {
        const parsed = parseInt(stem, 10);
        if (parsed >= 1 && parsed <= 114) {
          surahId = parsed;
        }
      }

      results.push({
        filename: entry.name,
        fullPath: path.join(audioDir, entry.name),
        surahId,
      });
    }

    results.sort((a, b) => {
      if (a.surahId !== null && b.surahId !== null) return a.surahId - b.surahId;
      if (a.surahId !== null && b.surahId === null) return -1;
      if (a.surahId === null && b.surahId !== null) return 1;
      return a.filename.localeCompare(b.filename);
    });

    return results;
  });

  register("files:saveAudio", async (_event, payload) => {
    assertRecord(payload, "payload");

    const sourcePath = path.resolve(asNonEmptyString(payload.sourcePath, "payload.sourcePath"));
    const reciterId = asNonEmptyString(payload.reciterId, "payload.reciterId");
    const surahId = asIntegerInRange(payload.surahId, "payload.surahId", 1, 114);

    const outputDir = path.join(app.getPath("userData"), "audio", reciterId);
    await fs.promises.mkdir(outputDir, { recursive: true });

    const ext = path.extname(sourcePath) || ".mp3";
    const filename = `${String(surahId).padStart(3, "0")}${ext}`;
    const targetPath = path.join(outputDir, filename);
    await fs.promises.copyFile(sourcePath, targetPath);

    approvePath(outputDir);
    return { path: targetPath };
  });

  register("files:saveReciterImage", async (_event, payload) => {
    assertRecord(payload, "payload");

    const sourcePath = path.resolve(asNonEmptyString(payload.sourcePath, "payload.sourcePath"));
    const reciterId = asNonEmptyString(payload.reciterId, "payload.reciterId");

    const outputDir = path.join(app.getPath("userData"), "reciter_images");
    await fs.promises.mkdir(outputDir, { recursive: true });

    const ext = path.extname(sourcePath) || ".png";
    const targetPath = path.join(outputDir, `${reciterId}${ext}`);
    await fs.promises.copyFile(sourcePath, targetPath);

    approvePath(outputDir);
    return { imagePath: `munajjam://?path=${encodeURIComponent(targetPath)}` };
  });
}
