export interface Segment {
  ayah_number: number;
  start: number;
  end: number;
  text: string;
  similarity: number;
}

export interface WaveformEditorProps {
  audioUrl: string;
  segments: Segment[];
  surahId: number;
  reciterId: string;
  onSegmentUpdate: (ayahIndex: number, updates: { start?: number; end?: number }) => void;
  onTimeUpdate?: (time: number) => void;
  currentSegmentIndex?: number | null;
  seekRequest?: { time: number; id: number; autoPlay?: boolean } | null;
  saveStatus?: "idle" | "saving" | "saved" | "error";
}

export interface PeaksData {
  peaks: number[][] | null;
  duration?: number;
}

export interface EditingState {
  regionId: string;
  ayahNumber: number;
  startValue: number;
  endValue: number;
  position: { x: number; y: number };
}

export type UndoEntry =
  | {
      type: "single";
      ayahIndex: number;
      oldStart: number;
      oldEnd: number;
      newStart: number;
      newEnd: number;
    }
  | {
      type: "bulk";
      changes: Array<{
        ayahIndex: number;
        oldStart: number;
        oldEnd: number;
        newStart: number;
        newEnd: number;
      }>;
    };
