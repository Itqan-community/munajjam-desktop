"use client";

import { useCallback, useState } from "react";
import { WAVEFORM_CONFIG } from "../constants";
import type { UndoEntry } from "../types";

type UndoDirection = "undo" | "redo";

function trimUndoStack(entries: UndoEntry[]): UndoEntry[] {
  return entries.slice(-WAVEFORM_CONFIG.MAX_UNDO_STACK_SIZE);
}

export function useWaveformUndo(
  applyEntry: (entry: UndoEntry, direction: UndoDirection) => boolean,
) {
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);

  const recordSingleChange = useCallback(
    (ayahIndex: number, oldStart: number, oldEnd: number, newStart: number, newEnd: number) => {
      setUndoStack((previous) =>
        trimUndoStack([
          ...previous,
          { type: "single", ayahIndex, oldStart, oldEnd, newStart, newEnd },
        ]),
      );
      setRedoStack([]);
    },
    [],
  );

  const recordBulkChange = useCallback((entry: Extract<UndoEntry, { type: "bulk" }>) => {
    setUndoStack((previous) => trimUndoStack([...previous, entry]));
    setRedoStack([]);
  }, []);

  const moveHistory = useCallback(
    (direction: UndoDirection) => {
      const sourceStack = direction === "undo" ? undoStack : redoStack;
      if (sourceStack.length === 0) {
        return;
      }

      const entry = sourceStack[sourceStack.length - 1];
      if (!applyEntry(entry, direction)) {
        return;
      }

      if (direction === "undo") {
        setRedoStack((previous) => [...previous, entry]);
        setUndoStack((previous) => previous.slice(0, -1));
      } else {
        setUndoStack((previous) => [...previous, entry]);
        setRedoStack((previous) => previous.slice(0, -1));
      }
    },
    [applyEntry, redoStack, undoStack],
  );

  const undo = useCallback(() => {
    moveHistory("undo");
  }, [moveHistory]);

  const redo = useCallback(() => {
    moveHistory("redo");
  }, [moveHistory]);

  return {
    undoStack,
    redoStack,
    recordSingleChange,
    recordBulkChange,
    undo,
    redo,
  };
}
