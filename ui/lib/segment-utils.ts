/**
 * Segment detection utilities for QA Dashboard
 * Centralized logic for finding current segment based on playback time
 */

interface Segment {
  ayah_number: number;
  start: number;
  end: number;
  text: string;
  similarity: number;
}

// Configuration constants
const SEGMENT_DETECTION_CONFIG = {
  /** Buffer to prevent boundary overlap issues (in seconds) */
  BOUNDARY_BUFFER: 0.08,
} as const;

/**
 * Finds the current segment index based on playback time
 * Uses precise boundary detection with fallback logic
 *
 * @param currentTime - Current playback time in seconds
 * @param segments - Array of segment data
 * @returns The index of the current segment, or null if no match found
 */
export function getCurrentSegmentIndex(
  currentTime: number,
  segments: Segment[]
): number | null {
  if (segments.length === 0) return null;

  const { BOUNDARY_BUFFER } = SEGMENT_DETECTION_CONFIG;

  // Primary: Precise boundary detection
  const preciseIndex = segments.findIndex((segment, i) => {
    const nextStart = i < segments.length - 1 ? segments[i + 1].start : Infinity;
    const cappedUpperBound = Math.min(segment.end, nextStart - BOUNDARY_BUFFER);
    const upperBound = cappedUpperBound > segment.start ? cappedUpperBound : segment.end;
    return currentTime >= segment.start && currentTime < upperBound;
  });

  if (preciseIndex !== -1) {
    return preciseIndex;
  }

  // Fallback: Find last started segment
  const fallbackIndex = [...segments].reverse().findIndex((s) => currentTime >= s.start);

  if (fallbackIndex !== -1) {
    return segments.length - 1 - fallbackIndex;
  }

  return null;
}

/**
 * Formats time value for display
 * @param time - Time in seconds
 * @returns Formatted string in M:SS.MS format
 */
export function formatSegmentTime(time: number): string {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const ms = Math.floor((time % 1) * 100);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

/**
 * Formats duration for display (shorter format without milliseconds)
 * @param time - Time in seconds
 * @returns Formatted string in M:SS format
 */
export function formatDuration(time: number): string {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Gets a human-readable label for a segment
 * @param segment - The segment object
 * @param t - Translation function
 * @returns Formatted label like "Ayah 1"
 */
export function getSegmentLabel(segment: Segment, t: (key: string) => string): string {
  return `${t("ayah")} ${segment.ayah_number}`;
}

/**
 * Calculates the duration of a segment
 * @param segment - The segment object
 * @returns Duration in seconds, formatted to 2 decimal places
 */
export function getSegmentDuration(segment: Segment): string {
  return (segment.end - segment.start).toFixed(2);
}
