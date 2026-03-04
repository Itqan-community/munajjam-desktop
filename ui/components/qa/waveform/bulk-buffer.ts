import type { Segment, UndoEntry } from "./types";

export type BulkBufferDirection = "start" | "end" | "both";
export type BulkBufferChange = Extract<UndoEntry, { type: "bulk" }>["changes"][number];

export function calculateBulkBufferChanges(
  segments: Segment[],
  bufferAmountMs: number,
  direction: BulkBufferDirection,
): BulkBufferChange[] {
  const bufferSeconds = bufferAmountMs / 1000;
  const changes: BulkBufferChange[] = [];

  segments.forEach((segment, index) => {
    const previousEnd = index > 0 ? segments[index - 1].end : 0;
    const nextStart = index < segments.length - 1 ? segments[index + 1].start : Infinity;

    let newStart = segment.start;
    let newEnd = segment.end;

    if (direction === "start" || direction === "both") {
      newStart = Math.max(0, Math.max(previousEnd + 0.001, segment.start - bufferSeconds));
    }

    if (direction === "end" || direction === "both") {
      newEnd = Math.min(nextStart - 0.001, segment.end + bufferSeconds);
    }

    if (newStart !== segment.start || newEnd !== segment.end) {
      changes.push({
        ayahIndex: index,
        oldStart: segment.start,
        oldEnd: segment.end,
        newStart,
        newEnd,
      });
    }
  });

  return changes;
}
