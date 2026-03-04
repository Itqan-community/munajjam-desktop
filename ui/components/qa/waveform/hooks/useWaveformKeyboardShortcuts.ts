import { useEffect } from "react";

interface UseWaveformKeyboardShortcutsInput {
  editingStateOpen: boolean;
  currentSegmentIndex: number | null | undefined;
  onTogglePlayPause: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onSeekToStart: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onOpenCurrentSegmentEditor: () => void;
  onToggleLoop: () => void;
  onCyclePlaybackSpeed: () => void;
  onGoToPreviousSegment: () => void;
  onGoToNextSegment: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function useWaveformKeyboardShortcuts({
  editingStateOpen,
  currentSegmentIndex,
  onTogglePlayPause,
  onSkipBackward,
  onSkipForward,
  onSeekToStart,
  onZoomIn,
  onZoomOut,
  onOpenCurrentSegmentEditor,
  onToggleLoop,
  onCyclePlaybackSpeed,
  onGoToPreviousSegment,
  onGoToNextSegment,
  onUndo,
  onRedo,
}: UseWaveformKeyboardShortcutsInput) {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        editingStateOpen
      ) {
        return;
      }

      switch (event.code) {
        case "Space":
          event.preventDefault();
          onTogglePlayPause();
          break;
        case "ArrowLeft":
          event.preventDefault();
          onSkipBackward();
          break;
        case "ArrowRight":
          event.preventDefault();
          onSkipForward();
          break;
        case "Home":
        case "Digit0":
          event.preventDefault();
          onSeekToStart();
          break;
        case "KeyE":
          event.preventDefault();
          if (currentSegmentIndex !== null && currentSegmentIndex !== undefined) {
            onOpenCurrentSegmentEditor();
          }
          break;
        case "Equal":
        case "NumpadAdd":
          if (event.ctrlKey || event.metaKey) {
            break;
          }
          if (event.shiftKey || event.code === "NumpadAdd") {
            event.preventDefault();
            onZoomIn();
          }
          break;
        case "Minus":
        case "NumpadSubtract":
          if (event.ctrlKey || event.metaKey) {
            break;
          }
          event.preventDefault();
          onZoomOut();
          break;
        case "KeyL":
          event.preventDefault();
          onToggleLoop();
          break;
        case "KeyS":
          event.preventDefault();
          onCyclePlaybackSpeed();
          break;
        case "KeyJ":
        case "Comma":
          event.preventDefault();
          onGoToPreviousSegment();
          break;
        case "KeyK":
        case "Period":
          event.preventDefault();
          onGoToNextSegment();
          break;
        case "KeyZ":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (event.shiftKey) {
              onRedo();
            } else {
              onUndo();
            }
          }
          break;
        case "KeyY":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onRedo();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    editingStateOpen,
    currentSegmentIndex,
    onTogglePlayPause,
    onSkipBackward,
    onSkipForward,
    onSeekToStart,
    onZoomIn,
    onZoomOut,
    onOpenCurrentSegmentEditor,
    onToggleLoop,
    onCyclePlaybackSpeed,
    onGoToPreviousSegment,
    onGoToNextSegment,
    onUndo,
    onRedo,
  ]);
}
