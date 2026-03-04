import {
  assertRecord,
  asNonEmptyString,
  asOptionalIntegerArray,
} from "../validation";
import type { JobConfig } from "../ipc-types";
import type { RegisterContext, RegisterHandler } from "./register-types";

function validateJobConfig(payload: unknown): JobConfig {
  assertRecord(payload, "config");

  return {
    audioDir: asNonEmptyString(payload.audioDir, "config.audioDir"),
    reciterId: asNonEmptyString(payload.reciterId, "config.reciterId"),
    recitationId: asNonEmptyString(payload.recitationId, "config.recitationId"),
    reciterName: asNonEmptyString(payload.reciterName, "config.reciterName"),
    surahIds: asOptionalIntegerArray(payload.surahIds, "config.surahIds", 1, 114),
  };
}

export function registerJobsHandlers(register: RegisterHandler, { jobs, approvePath }: RegisterContext) {
  register("jobs:start", (_event, config) => {
    const safeConfig = validateJobConfig(config);
    approvePath(safeConfig.audioDir);
    return jobs.startJob(safeConfig);
  });

  register("jobs:cancel", (_event, jobId) => {
    jobs.cancelJob(asNonEmptyString(jobId, "jobId"));
    return { success: true };
  });

  register("jobs:list", () => jobs.listJobs());
}
