import type { EnvCheckResult } from "@/types/munajjam";

export interface SetupAssistantState {
  isReady: boolean;
  showInstaller: boolean;
  showUnsupported: boolean;
}

export function getSetupAssistantState(result: EnvCheckResult | null): SetupAssistantState {
  if (!result) {
    return {
      isReady: false,
      showInstaller: false,
      showUnsupported: false,
    };
  }

  if (!result.platformSupported) {
    return {
      isReady: false,
      showInstaller: false,
      showUnsupported: true,
    };
  }

  const isReady = result.python && result.ffmpeg && result.munajjam;

  return {
    isReady,
    showInstaller: !isReady,
    showUnsupported: false,
  };
}
