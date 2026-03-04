import { getSurahText } from "../quran";
import { IpcHandlerError } from "../errors";
import {
  assertRecord,
  asIntegerInRange,
  asNonEmptyString,
  asNumberInRange,
  asOptionalString,
  isJsonValue,
} from "../validation";
import type { AlignmentRow, AudioFileRow } from "../ipc-types";
import type { RegisterContext, RegisterHandler } from "./register-types";

function validateAlignmentRows(rows: unknown): AlignmentRow[] {
  if (!Array.isArray(rows)) {
    throw new IpcHandlerError("INVALID_PAYLOAD", "rows must be an array");
  }

  return rows.map((item, index) => {
    assertRecord(item, `rows[${index}]`);

    return {
      recitation_id: asNonEmptyString(item.recitation_id, `rows[${index}].recitation_id`),
      reciter_id: asNonEmptyString(item.reciter_id, `rows[${index}].reciter_id`),
      surah_id: asIntegerInRange(item.surah_id, `rows[${index}].surah_id`, 1, 114),
      ayah_number: asIntegerInRange(item.ayah_number, `rows[${index}].ayah_number`, 1, 400),
      start_time: asNumberInRange(item.start_time, `rows[${index}].start_time`, 0, Number.MAX_SAFE_INTEGER),
      end_time: asNumberInRange(item.end_time, `rows[${index}].end_time`, 0, Number.MAX_SAFE_INTEGER),
      original_start_time: asNumberInRange(
        item.original_start_time,
        `rows[${index}].original_start_time`,
        0,
        Number.MAX_SAFE_INTEGER,
      ),
      original_end_time: asNumberInRange(
        item.original_end_time,
        `rows[${index}].original_end_time`,
        0,
        Number.MAX_SAFE_INTEGER,
      ),
      similarity_score:
        item.similarity_score === null || item.similarity_score === undefined
          ? null
          : asNumberInRange(item.similarity_score, `rows[${index}].similarity_score`, 0, 1),
      status: asOptionalString(item.status, `rows[${index}].status`) ?? "pending_review",
      notes: asOptionalString(item.notes, `rows[${index}].notes`) ?? null,
    };
  });
}

function validateAudioRows(rows: unknown): AudioFileRow[] {
  if (!Array.isArray(rows)) {
    throw new IpcHandlerError("INVALID_PAYLOAD", "rows must be an array");
  }

  return rows.map((item, index) => {
    assertRecord(item, `rows[${index}]`);

    return {
      reciter_id: asNonEmptyString(item.reciter_id, `rows[${index}].reciter_id`),
      surah_id: asIntegerInRange(item.surah_id, `rows[${index}].surah_id`, 1, 114),
      audio_path: asNonEmptyString(item.audio_path, `rows[${index}].audio_path`),
      duration:
        item.duration === undefined || item.duration === null
          ? null
          : asNumberInRange(item.duration, `rows[${index}].duration`, 0, Number.MAX_SAFE_INTEGER),
      file_size:
        item.file_size === undefined || item.file_size === null
          ? null
          : asNumberInRange(item.file_size, `rows[${index}].file_size`, 0, Number.MAX_SAFE_INTEGER),
      format: asOptionalString(item.format, `rows[${index}].format`) ?? null,
    };
  });
}

export function registerDataHandlers(register: RegisterHandler, { db, quranCsvPath }: RegisterContext) {
  register("data:listReciters", () => db.listReciters());

  register("data:createReciter", (_event, payload) => {
    assertRecord(payload, "payload");

    const nameEnglish = asNonEmptyString(payload.nameEnglish, "payload.nameEnglish");
    const slug = nameEnglish
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    if (!slug) {
      throw new IpcHandlerError("INVALID_PAYLOAD", "payload.nameEnglish produced an invalid reciter id");
    }

    return db.createReciter({
      id: slug,
      name_arabic: asNonEmptyString(payload.nameArabic, "payload.nameArabic"),
      name_english: nameEnglish,
      name_transliteration: asOptionalString(payload.nameTransliteration, "payload.nameTransliteration") ?? nameEnglish,
    });
  });

  register("data:updateReciterImage", (_event, payload) => {
    assertRecord(payload, "payload");
    return db.updateReciterImage(
      asNonEmptyString(payload.reciterId, "payload.reciterId"),
      asNonEmptyString(payload.imagePath, "payload.imagePath"),
    );
  });

  register("data:listRecitations", (_event, reciterId) => {
    return db.listRecitations(asNonEmptyString(reciterId, "reciterId"));
  });

  register("data:createRecitation", (_event, payload) => {
    assertRecord(payload, "payload");

    const versionName = asNonEmptyString(payload.versionName, "payload.versionName");
    return db.createRecitation({
      reciter_id: asNonEmptyString(payload.reciterId, "payload.reciterId"),
      version_name: versionName,
      version_label: asOptionalString(payload.versionLabel, "payload.versionLabel") ?? versionName,
    });
  });

  register("data:listAlignments", (_event, payload) => {
    assertRecord(payload, "payload");
    return db.listAlignments(
      asNonEmptyString(payload.recitationId, "payload.recitationId"),
      asIntegerInRange(payload.surahId, "payload.surahId", 1, 114),
    );
  });

  register("data:listAlignmentStats", (_event, recitationId) => {
    return db.listAlignmentStats(asNonEmptyString(recitationId, "recitationId"));
  });

  register("data:upsertAlignments", (_event, rows) => {
    db.upsertAlignments(validateAlignmentRows(rows));
    return { success: true };
  });

  register("data:updateAlignment", (_event, payload) => {
    assertRecord(payload, "payload");

    db.updateAlignment({
      recitation_id: asNonEmptyString(payload.recitation_id, "payload.recitation_id"),
      surah_id: asIntegerInRange(payload.surah_id, "payload.surah_id", 1, 114),
      ayah_number: asIntegerInRange(payload.ayah_number, "payload.ayah_number", 1, 400),
      start_time: asNumberInRange(payload.start_time, "payload.start_time", 0, Number.MAX_SAFE_INTEGER),
      end_time: asNumberInRange(payload.end_time, "payload.end_time", 0, Number.MAX_SAFE_INTEGER),
    });

    return { success: true };
  });

  register("data:getAudioFile", (_event, payload) => {
    assertRecord(payload, "payload");
    return (
      db.getAudioFile(
        asNonEmptyString(payload.reciterId, "payload.reciterId"),
        asIntegerInRange(payload.surahId, "payload.surahId", 1, 114),
      ) ?? null
    );
  });

  register("data:upsertAudioFiles", (_event, rows) => {
    db.upsertAudioFiles(validateAudioRows(rows));
    return { success: true };
  });

  register("data:getWorkspaceState", () => db.getWorkspaceState());

  register("data:saveWorkspaceState", (_event, state) => {
    if (!isJsonValue(state)) {
      throw new IpcHandlerError("INVALID_PAYLOAD", "workspace state must be JSON serializable");
    }
    db.saveWorkspaceState(state);
    return { success: true };
  });

  register("quran:getSurahText", (_event, surahId) => {
    return getSurahText(quranCsvPath, asIntegerInRange(surahId, "surahId", 1, 114));
  });
}
