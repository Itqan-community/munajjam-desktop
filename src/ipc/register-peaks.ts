import { generatePeaks, loadPeaks } from "../peaks";
import {
  assertRecord,
  asIntegerInRange,
  asNonEmptyString,
} from "../validation";
import type { RegisterContext, RegisterHandler } from "./register-types";

export function registerPeaksHandlers(register: RegisterHandler, { db }: RegisterContext) {
  register("peaks:get", async (_event, payload) => {
    assertRecord(payload, "payload");

    const reciterId = asNonEmptyString(payload.reciterId, "payload.reciterId");
    const surahId = asIntegerInRange(payload.surahId, "payload.surahId", 1, 114);

    const cached = await loadPeaks(reciterId, surahId);
    if (cached) return cached;

    const audioFile = db.getAudioFile(reciterId, surahId);
    if (!audioFile?.audio_path) return null;

    try {
      return await generatePeaks(audioFile.audio_path, reciterId, surahId);
    } catch {
      return null;
    }
  });

  register("peaks:generate", async (_event, payload) => {
    assertRecord(payload, "payload");

    return generatePeaks(
      asNonEmptyString(payload.audioPath, "payload.audioPath"),
      asNonEmptyString(payload.reciterId, "payload.reciterId"),
      asIntegerInRange(payload.surahId, "payload.surahId", 1, 114),
    );
  });
}
