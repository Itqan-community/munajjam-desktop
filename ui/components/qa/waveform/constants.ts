export const WAVEFORM_CONFIG = {
  SIMILARITY_HIGH_THRESHOLD: 0.95,
  SIMILARITY_MEDIUM_THRESHOLD: 0.9,
  MAX_UNDO_STACK_SIZE: 50,
  DOUBLE_CLICK_THRESHOLD: 300,
  SKIP_AMOUNT: 5,
  ZOOM_STEP: 25,
  ZOOM_MIN: 25,
  ZOOM_MAX: 200,
} as const;

export const ACTIVE_REGION_COLOR = "var(--region-color-active)";

export function getSimilarityColor(similarity: number): string {
  if (similarity >= WAVEFORM_CONFIG.SIMILARITY_HIGH_THRESHOLD) {
    return "var(--similarity-high)";
  }
  if (similarity >= WAVEFORM_CONFIG.SIMILARITY_MEDIUM_THRESHOLD) {
    return "var(--similarity-medium)";
  }
  return "var(--similarity-low)";
}
