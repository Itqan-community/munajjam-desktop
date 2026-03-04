import type {
  MunajjamBridge,
  AudioFileScanResult,
  EnvCheckResult,
  EnvInstallProgress,
  AlignmentRow,
  AudioFileRow,
  ReciterRow,
  RecitationVersion,
  JobRow,
  JobConfig,
  JobEvent,
  JobLogEntry,
} from "../../src/ipc-types";

export type {
  MunajjamBridge,
  AudioFileScanResult,
  EnvCheckResult,
  EnvInstallProgress,
  AlignmentRow,
  AudioFileRow,
  ReciterRow,
  RecitationVersion,
  JobRow,
  JobConfig,
  JobEvent,
  JobLogEntry,
};

declare global {
  interface Window {
    munajjam?: MunajjamBridge;
  }
}
