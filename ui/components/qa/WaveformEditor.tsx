"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { Region } from "wavesurfer.js/dist/plugins/regions.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import {
  ZoomIn,
  ZoomOut,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  X,
  Clock,
  Repeat,
  Undo2,
  Redo2,
  Maximize2,
} from "lucide-react";
import { SaveStatusIndicator } from "./waveform/SaveStatusIndicator";
import { TimestampBubble } from "./waveform/TimestampBubble";
import { ACTIVE_REGION_COLOR, getSimilarityColor, WAVEFORM_CONFIG } from "./waveform/constants";
import { calculateBulkBufferChanges, type BulkBufferDirection } from "./waveform/bulk-buffer";
import type { EditingState, Segment, UndoEntry, WaveformEditorProps } from "./waveform/types";
import { useWaveformPeaks } from "./waveform/hooks/useWaveformPeaks";
import { useWaveformUndo } from "./waveform/hooks/useWaveformUndo";
import { useWaveformKeyboardShortcuts } from "./waveform/hooks/useWaveformKeyboardShortcuts";

export default function WaveformEditor({
  audioUrl,
  segments,
  surahId,
  reciterId,
  onSegmentUpdate,
  onTimeUpdate,
  currentSegmentIndex,
  seekRequest,
  saveStatus = "idle",
}: WaveformEditorProps) {
  const t = useTranslations("qa");

  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const lastSeekIdRef = useRef<number>(0);
  const lastClickRef = useRef<{ regionId: string; time: number } | null>(null);
  const isLoopingRef = useRef(false);
  const currentSegmentIndexRef = useRef<number | null>(null);
  const segmentsRef = useRef<Segment[]>(segments);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [zoom, setZoom] = useState(50);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Timestamp bubble editing state
  const [editingState, setEditingState] = useState<EditingState | null>(null);

  // New features state
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  // Bulk buffer state
  const [showBufferPopover, setShowBufferPopover] = useState(false);
  const [bufferAmount, setBufferAmount] = useState(300); // ms
  const [bufferDirection, setBufferDirection] = useState<BulkBufferDirection>("end");
  const bulkBufferButtonRef = useRef<HTMLButtonElement>(null);

  // Edit mode (Shift key held) - prevents accidental region dragging
  const [isEditMode, setIsEditMode] = useState(false);
  const isEditModeRef = useRef(false);

  const { peaksData, peaksLoading } = useWaveformPeaks(surahId, reciterId);

  // Update refs when state changes
  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  useEffect(() => {
    isEditModeRef.current = isEditMode;
  }, [isEditMode]);

  useEffect(() => {
    currentSegmentIndexRef.current = currentSegmentIndex ?? null;
  }, [currentSegmentIndex]);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  // Close bubble
  const closeBubble = useCallback(() => {
    setEditingState(null);
  }, []);

  const findRegionBySegmentIndex = useCallback((ayahIndex: number) => {
    if (!regionsRef.current) return null;
    return regionsRef.current.getRegions().find((region) => {
      const ayahNumber = parseInt(region.id.replace("ayah-", ""), 10);
      return segments.findIndex((segment) => segment.ayah_number === ayahNumber) === ayahIndex;
    });
  }, [segments]);

  const applyUndoEntry = useCallback((entry: UndoEntry, direction: "undo" | "redo") => {
    let applied = false;

    if (entry.type === "bulk") {
      entry.changes.forEach((change) => {
        const region = findRegionBySegmentIndex(change.ayahIndex);
        if (!region) {
          return;
        }

        const start = direction === "undo" ? change.oldStart : change.newStart;
        const end = direction === "undo" ? change.oldEnd : change.newEnd;
        region.setOptions({ start, end });
        onSegmentUpdate(change.ayahIndex, { start, end });
        applied = true;
      });
      return applied;
    }

    const region = findRegionBySegmentIndex(entry.ayahIndex);
    if (!region) {
      return false;
    }

    const start = direction === "undo" ? entry.oldStart : entry.newStart;
    const end = direction === "undo" ? entry.oldEnd : entry.newEnd;

    region.setOptions({ start, end });
    onSegmentUpdate(entry.ayahIndex, { start, end });
    return true;
  }, [findRegionBySegmentIndex, onSegmentUpdate]);

  const {
    undoStack,
    redoStack,
    recordSingleChange,
    recordBulkChange,
    undo: handleUndo,
    redo: handleRedo,
  } = useWaveformUndo(applyUndoEntry);

  // Apply bulk buffer to all segments
  const applyBulkBuffer = useCallback(() => {
    if (!regionsRef.current || segments.length === 0) return;

    const changes = calculateBulkBufferChanges(segments, bufferAmount, bufferDirection);

    if (changes.length === 0) {
      setShowBufferPopover(false);
      return;
    }

    recordBulkChange({ type: "bulk", changes });

    const allRegions = regionsRef.current.getRegions();
    changes.forEach((change) => {
      const segment = segments[change.ayahIndex];
      const region = allRegions.find((currentRegion) => currentRegion.id === `ayah-${segment.ayah_number}`);
      if (region) {
        region.setOptions({ start: change.newStart, end: change.newEnd });
      }
      onSegmentUpdate(change.ayahIndex, { start: change.newStart, end: change.newEnd });
    });

    setShowBufferPopover(false);
  }, [bufferAmount, bufferDirection, onSegmentUpdate, recordBulkChange, segments]);

  // Helper to find region and segment index from editing state
  const findRegionAndSegment = useCallback((regionId: string) => {
    if (!regionsRef.current) return null;

    const region = regionsRef.current.getRegions().find((r) => r.id === regionId);
    if (!region) return null;

    const ayahNumber = parseInt(regionId.replace("ayah-", ""), 10);
    const segmentIndex = segments.findIndex((s) => s.ayah_number === ayahNumber);
    if (segmentIndex === -1) return null;

    return { region, segmentIndex, segment: segments[segmentIndex] };
  }, [segments]);

  // Handle bubble timestamp updates (unified for start/end)
  const handleTimestampUpdate = useCallback(
    (type: "start" | "end", newValue: number) => {
      if (!editingState) return;

      const found = findRegionAndSegment(editingState.regionId);
      if (found) {
        const { region, segmentIndex, segment } = found;
        const isStart = type === "start";

        region.setOptions({ [type]: newValue });
        onSegmentUpdate(segmentIndex, { [type]: newValue });

        // Add to undo stack
        recordSingleChange(
          segmentIndex,
          segment.start,
          segment.end,
          isStart ? newValue : segment.start,
          isStart ? segment.end : newValue
        );
      }

      setEditingState((prev) =>
        prev ? { ...prev, [type === "start" ? "startValue" : "endValue"]: newValue } : null
      );
    },
    [editingState, findRegionAndSegment, onSegmentUpdate, recordSingleChange]
  );

  const handleUpdateStart = useCallback(
    (newValue: number) => handleTimestampUpdate("start", newValue),
    [handleTimestampUpdate]
  );

  const handleUpdateEnd = useCallback(
    (newValue: number) => handleTimestampUpdate("end", newValue),
    [handleTimestampUpdate]
  );

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    // Don't initialize if no audio URL is provided
    if (!audioUrl || audioUrl.trim() === "") {
      setIsReady(false);
      return;
    }

    // Wait for peaks loading to complete before initializing
    if (peaksLoading) return;

    // Flag to prevent stale callbacks after cleanup
    let isDestroyed = false;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const timeline = TimelinePlugin.create({
      height: 24,
      timeInterval: 1,
      primaryLabelInterval: 5,
      style: {
        fontSize: "11px",
        color: "rgba(255, 255, 255, 0.4)",
      },
    });

    // Use direct URL for playback (no CORS needed for audio playback)
    const audio = document.createElement("audio");
    audio.src = audioUrl;
    audio.preload = "metadata";
    audio.addEventListener("error", () => {
      if (isDestroyed) return;
      const mediaError = audio.error;
      console.error("Waveform audio load error", {
        src: audio.currentSrc || audio.src,
        code: mediaError?.code ?? null,
        message: mediaError?.message ?? null,
      });
    });

    // Store reference for cleanup
    let audioElement: HTMLAudioElement | null = audio;

    // Use pre-computed peaks if available, otherwise use placeholder
    const estimatedDuration = segments.length > 0 ? segments[segments.length - 1].end + 1 : 300;
    const peaks = peaksData?.peaks || [new Array(1000).fill(0.5).map(() => Math.random() * 0.3 + 0.2)];
    const audioDuration = peaksData?.duration || estimatedDuration;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: peaksData?.peaks ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.25)",
      progressColor: peaksData?.peaks ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.6)",
      cursorColor: "rgba(255, 255, 255, 0.9)",
      cursorWidth: 2,
      height: 128,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      minPxPerSec: zoom,
      media: audio,
      peaks: peaks,
      duration: audioDuration,
      plugins: [regions, timeline],
    });

    wavesurferRef.current = ws;

    ws.on("ready", () => {
      // Skip if this instance was destroyed
      if (isDestroyed) return;

      setIsReady(true);
      setDuration(ws.getDuration());

      segments.forEach((segment) => {
        // Double-check before adding regions
        if (isDestroyed) return;

        const labelEl = document.createElement("div");
        labelEl.className = "region-label";
        labelEl.innerHTML = `<span>${segment.ayah_number}</span>`;

        regions.addRegion({
          id: `ayah-${segment.ayah_number}`,
          start: segment.start,
          end: segment.end,
          color: getSimilarityColor(segment.similarity),
          drag: false,   // Disabled by default, enabled when Shift is held
          resize: false, // Disabled by default, enabled when Shift is held
          content: labelEl,
        });
      });
    });

    ws.on("error", (error) => {
      if (isDestroyed) return;
      if (error && typeof error === "object" && Object.keys(error).length === 0) {
        console.warn("WaveSurfer emitted an empty error object", {
          src: audio.currentSrc || audio.src,
        });
        return;
      }
      console.error("WaveSurfer error:", error);
    });

    ws.on("play", () => {
      if (isDestroyed) return;
      setIsPlaying(true);
    });

    ws.on("pause", () => {
      if (isDestroyed) return;
      setIsPlaying(false);
    });

    ws.on("timeupdate", (time) => {
      if (isDestroyed) return;
      setCurrentTime(time);
      onTimeUpdate?.(time);

      // Handle looping - use refs to get latest values (including edited timestamps)
      if (isLoopingRef.current && currentSegmentIndexRef.current !== null) {
        const segment = segmentsRef.current[currentSegmentIndexRef.current];
        if (segment && time >= segment.end) {
          ws.setTime(segment.start);
        }
      }
    });

    // Handle region updates from dragging
    regions.on("region-updated", (region: Region) => {
      if (isDestroyed) return;

      const ayahNumber = parseInt(region.id.replace("ayah-", ""), 10);
      const segmentIndex = segments.findIndex((s) => s.ayah_number === ayahNumber);

      if (segmentIndex !== -1) {
        const oldStart = segments[segmentIndex].start;
        const oldEnd = segments[segmentIndex].end;

        onSegmentUpdate(segmentIndex, {
          start: region.start,
          end: region.end,
        });

        // Add to undo stack
        recordSingleChange(segmentIndex, oldStart, oldEnd, region.start, region.end);
      }

      // Update bubble if it's open for this region
      if (editingState?.regionId === region.id) {
        setEditingState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            startValue: region.start,
            endValue: region.end,
          };
        });
      }
    });

    // Handle region clicks with double-click detection
    regions.on("region-clicked", (region: Region, e: MouseEvent) => {
      if (isDestroyed) return;
      e.stopPropagation();

      const now = Date.now();
      const lastClick = lastClickRef.current;

      // Check for double-click on the same region
      if (lastClick && lastClick.regionId === region.id && now - lastClick.time < WAVEFORM_CONFIG.DOUBLE_CLICK_THRESHOLD) {
        // Double-click detected - open timestamp editor
        e.preventDefault();
        lastClickRef.current = null;

        const ayahNumber = parseInt(region.id.replace("ayah-", ""), 10);

        setEditingState({
          regionId: region.id,
          ayahNumber,
          startValue: region.start,
          endValue: region.end,
          position: { x: e.clientX, y: e.clientY - 20 },
        });
      } else {
        // Single click - seek to clicked position within region
        lastClickRef.current = { regionId: region.id, time: now };

        // Calculate clicked time from mouse position
        const wrapper = ws.getWrapper();
        const rect = wrapper.getBoundingClientRect();
        const scrollLeft = wrapper.scrollLeft;
        const clickX = e.clientX - rect.left + scrollLeft;
        const duration = ws.getDuration();
        const width = wrapper.scrollWidth;
        const clickedTime = (clickX / width) * duration;

        // Clamp to region boundaries for safety
        const seekTime = Math.max(region.start, Math.min(region.end, clickedTime));
        ws.setTime(seekTime);
      }
    });

    return () => {
      isDestroyed = true;
      regionsRef.current = null;
      wavesurferRef.current = null;
      setIsReady(false);

      // Explicitly stop and clean up audio element before destroying WaveSurfer
      // This prevents orphaned audio playback when switching surahs
      if (audioElement) {
        audioElement.pause();
        audioElement.src = "";
        audioElement.load(); // Reset the audio element
        audioElement = null;
      }

      ws.destroy();
    };
  }, [audioUrl, peaksData, peaksLoading]);

  useEffect(() => {
    if (wavesurferRef.current && isReady) {
      try {
        const duration = wavesurferRef.current.getDuration();
        if (duration && duration > 0) {
          wavesurferRef.current.zoom(zoom);
        }
      } catch (err) {
        // Audio not fully loaded yet, ignore
        console.warn("Cannot zoom yet, audio not fully loaded");
      }
    }
  }, [zoom, isReady]);

  // Mouse wheel zoom on waveform
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Allow browser zoom when Ctrl/Cmd is pressed
      if (e.ctrlKey || e.metaKey) return;

      e.preventDefault();

      const delta = e.deltaY < 0
        ? WAVEFORM_CONFIG.ZOOM_STEP
        : -WAVEFORM_CONFIG.ZOOM_STEP;

      setZoom((prev) =>
        Math.max(
          WAVEFORM_CONFIG.ZOOM_MIN,
          Math.min(WAVEFORM_CONFIG.ZOOM_MAX, prev + delta)
        )
      );
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  // Shift key detection for edit mode (drag/resize regions)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift" && !isEditModeRef.current) {
        setIsEditMode(true);
        // Enable drag/resize on all regions
        if (regionsRef.current) {
          regionsRef.current.getRegions().forEach((region) => {
            region.setOptions({ drag: true, resize: true });
          });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift" && isEditModeRef.current) {
        setIsEditMode(false);
        // Disable drag/resize on all regions
        if (regionsRef.current) {
          regionsRef.current.getRegions().forEach((region) => {
            region.setOptions({ drag: false, resize: false });
          });
        }
      }
    };

    // Also handle blur to reset edit mode when window loses focus
    const handleBlur = () => {
      if (isEditModeRef.current) {
        setIsEditMode(false);
        if (regionsRef.current) {
          regionsRef.current.getRegions().forEach((region) => {
            region.setOptions({ drag: false, resize: false });
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    if (!regionsRef.current || !isReady) return;

    const regions = regionsRef.current;

    segments.forEach((segment) => {
      const regionId = `ayah-${segment.ayah_number}`;
      const existingRegion = regions.getRegions().find((r) => r.id === regionId);

      if (existingRegion) {
        if (existingRegion.start !== segment.start || existingRegion.end !== segment.end) {
          existingRegion.setOptions({
            start: segment.start,
            end: segment.end,
          });
        }
      }
    });
  }, [segments, isReady]);

  useEffect(() => {
    if (!regionsRef.current || currentSegmentIndex === null || currentSegmentIndex === undefined) return;

    const allRegions = regionsRef.current.getRegions();
    allRegions.forEach((region, index) => {
      const isActive = index === currentSegmentIndex;
      region.setOptions({
        color: isActive ? ACTIVE_REGION_COLOR : getSimilarityColor(segments[index]?.similarity || 1),
      });
    });
  }, [currentSegmentIndex, segments]);

  useEffect(() => {
    if (seekRequest && seekRequest.id !== lastSeekIdRef.current && wavesurferRef.current && isReady) {
      wavesurferRef.current.setTime(seekRequest.time);
      lastSeekIdRef.current = seekRequest.id;

      // Auto-play if requested (e.g., from play button in ayah list)
      if (seekRequest.autoPlay && !isPlaying) {
        wavesurferRef.current.play();
      }
    }
  }, [seekRequest, isReady, isPlaying]);

  // Playback speed control
  useEffect(() => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.setPlaybackRate(playbackSpeed);
    }
  }, [playbackSpeed, isReady]);

  const togglePlayPause = useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  const seekToStart = useCallback(() => {
    wavesurferRef.current?.setTime(0);
  }, []);

  const skipBackward = useCallback(() => {
    if (wavesurferRef.current) {
      const newTime = Math.max(0, wavesurferRef.current.getCurrentTime() - WAVEFORM_CONFIG.SKIP_AMOUNT);
      wavesurferRef.current.setTime(newTime);
    }
  }, []);

  const skipForward = useCallback(() => {
    if (wavesurferRef.current) {
      const newTime = Math.min(duration, wavesurferRef.current.getCurrentTime() + WAVEFORM_CONFIG.SKIP_AMOUNT);
      wavesurferRef.current.setTime(newTime);
    }
  }, [duration]);

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + WAVEFORM_CONFIG.ZOOM_STEP, WAVEFORM_CONFIG.ZOOM_MAX));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - WAVEFORM_CONFIG.ZOOM_STEP, WAVEFORM_CONFIG.ZOOM_MIN));
  }, []);

  // Navigate to previous segment
  const goToPreviousSegment = useCallback(() => {
    if (currentSegmentIndex == null || currentSegmentIndex <= 0) return;
    const prevSegment = segments[currentSegmentIndex - 1];
    if (prevSegment && wavesurferRef.current) {
      wavesurferRef.current.setTime(prevSegment.start);
    }
  }, [currentSegmentIndex, segments]);

  // Navigate to next segment
  const goToNextSegment = useCallback(() => {
    if (currentSegmentIndex == null || currentSegmentIndex >= segments.length - 1) return;
    const nextSegment = segments[currentSegmentIndex + 1];
    if (nextSegment && wavesurferRef.current) {
      wavesurferRef.current.setTime(nextSegment.start);
    }
  }, [currentSegmentIndex, segments]);

  // Toggle loop mode
  const toggleLoop = useCallback(() => {
    setIsLooping(prev => !prev);
  }, []);

  // Cycle playback speed
  const cyclePlaybackSpeed = useCallback(() => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  }, [playbackSpeed]);

  // Open editor for current segment
  const openCurrentSegmentEditor = useCallback(() => {
    if (currentSegmentIndex === null || currentSegmentIndex === undefined) return;

    const segment = segments[currentSegmentIndex];
    if (!segment) return;

    // Try to find region, but use segment data as fallback
    const region = regionsRef.current?.getRegions().find(
      (r) => r.id === `ayah-${segment.ayah_number}`
    );

    // Get the center position of the waveform container for the bubble
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    setEditingState({
      regionId: `ayah-${segment.ayah_number}`,
      ayahNumber: segment.ayah_number,
      startValue: region?.start ?? segment.start,
      endValue: region?.end ?? segment.end,
      position: {
        x: containerRect ? containerRect.left + containerRect.width / 2 : window.innerWidth / 2,
        y: containerRect ? containerRect.top + 100 : 200,
      },
    });
  }, [currentSegmentIndex, segments]);

  useWaveformKeyboardShortcuts({
    editingStateOpen: editingState !== null,
    currentSegmentIndex,
    onTogglePlayPause: togglePlayPause,
    onSkipBackward: skipBackward,
    onSkipForward: skipForward,
    onSeekToStart: seekToStart,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onOpenCurrentSegmentEditor: openCurrentSegmentEditor,
    onToggleLoop: toggleLoop,
    onCyclePlaybackSpeed: cyclePlaybackSpeed,
    onGoToPreviousSegment: goToPreviousSegment,
    onGoToNextSegment: goToNextSegment,
    onUndo: handleUndo,
    onRedo: handleRedo,
  });

  const formatTime = (time: number, includeMs = true) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const base = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    if (!includeMs) return base;
    const ms = Math.floor((time % 1) * 100);
    return `${base}.${ms.toString().padStart(2, "0")}`;
  };

  return (
    <div dir="ltr" className="bg-gradient-to-b from-[var(--waveform-bg-from)] to-[var(--waveform-bg-to)] border-b border-white/10 overflow-hidden relative">
      {/* Waveform Container */}
      <div className="relative bg-[#0a0a0a]/50 backdrop-blur-sm">
        {/* Loading State - Enhanced with progress feel */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#0a0a0a] to-black z-10 animate-in fade-in duration-200">
            <div className="flex flex-col items-center gap-4">
              {!audioUrl || audioUrl.trim() === "" ? (
                <>
                  <div className="w-12 h-12 flex items-center justify-center text-white/40">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm text-white/60 font-medium">{t("waveform.noAudioConfigured")}</span>
                    <span className="text-xs text-white/40">{t("waveform.pleaseUploadAudio")}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <div className="w-12 h-12 border-3 border-white/10 rounded-full" />
                    <div className="absolute inset-0 w-12 h-12 border-3 border-transparent border-t-white/70 rounded-full animate-spin" style={{ animationDuration: '0.8s' }} />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm text-white/60 font-medium">{t("waveform.loadingAudio")}</span>
                    <span className="text-xs text-white/40">{t("waveform.preparingWaveform")}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Waveform */}
        <div
          ref={containerRef}
          className="w-full overflow-x-auto px-6 py-4 waveform-scroll"
          style={{ minHeight: "180px" }}
          data-edit-mode={isEditMode ? "true" : "false"}
        />
      </div>

      {/* Control Bar - Single unified row */}
      <div className="border-t border-white/10 bg-gradient-to-b from-[var(--waveform-controls-bg-from)] to-[var(--waveform-controls-bg-to)] px-4 py-2.5 backdrop-blur-sm">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Left: Time + Edit + Undo/Redo */}
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            {/* Time Display */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <span className="text-sm font-mono text-white/90 tabular-nums font-semibold tracking-tight">
                {formatTime(currentTime)}
              </span>
              <span className="text-white/30 font-light">/</span>
              <span className="text-xs font-mono text-white/50 tabular-nums">
                {formatTime(duration, false)}
              </span>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-white/10" />

            {/* Edit Button */}
            {currentSegmentIndex !== null && currentSegmentIndex !== undefined && (
              <button
                onClick={openCurrentSegmentEditor}
                className="touch-target w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
                title={t("waveform.editTimestamps")}
                aria-label={t("waveform.editTimestamps")}
              >
                <Clock className="w-4 h-4" aria-hidden="true" />
              </button>
            )}

            {/* Undo/Redo */}
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="touch-target w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title={t("waveform.undo")}
              aria-label={`${t("waveform.undo")} (${undoStack.length} available)`}
            >
              <Undo2 className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="touch-target w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title={t("waveform.redo")}
              aria-label={`${t("waveform.redo")} (${redoStack.length} available)`}
            >
              <Redo2 className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Save Status Indicator */}
            {saveStatus !== "idle" && (
              <SaveStatusIndicator status={saveStatus} />
            )}

            {/* Edit Mode Indicator */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${
              isEditMode
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "text-white/40"
            }`}>
              {isEditMode ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>{t("waveform.editMode")}</span>
                </>
              ) : (
                <span className="hidden sm:inline">{t("waveform.shiftToEdit")}</span>
              )}
            </div>
          </div>

          {/* Center: Playback Controls */}
          <div className="flex items-center gap-2 justify-self-center">
            <button
              onClick={goToPreviousSegment}
              disabled={currentSegmentIndex == null || currentSegmentIndex <= 0}
              className="touch-target w-10 h-10 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10 active:bg-white/15 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              title={t("waveform.previousSegment")}
              aria-label={t("waveform.previousSegment")}
            >
              <SkipBack className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              className="group relative mx-1 w-12 h-12 rounded-full bg-gradient-to-br from-white via-white to-white/95 flex items-center justify-center transition-all duration-200 shadow-lg shadow-white/15 hover:shadow-xl hover:shadow-white/30 hover:scale-105 active:scale-100"
              title={isPlaying ? t("waveform.pause") : t("waveform.play")}
              aria-label={isPlaying ? t("waveform.pause") : t("waveform.play")}
            >
              <div className="absolute inset-0 rounded-full bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
              {isPlaying ? (
                <Pause className="relative w-4 h-4 text-black" aria-hidden="true" />
              ) : (
                <Play className="relative w-4 h-4 text-black ml-0.5" aria-hidden="true" />
              )}
            </button>

            <button
              onClick={goToNextSegment}
              disabled={currentSegmentIndex == null || currentSegmentIndex >= segments.length - 1}
              className="touch-target w-10 h-10 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/10 active:bg-white/15 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              title={t("waveform.nextSegment")}
              aria-label={t("waveform.nextSegment")}
            >
              <SkipForward className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Right: Bulk Buffer + Loop + Speed + Zoom */}
          <div className="flex items-center gap-2 justify-self-end min-w-0">
            {/* Bulk Buffer */}
            <button
              ref={bulkBufferButtonRef}
              onClick={() => setShowBufferPopover(p => !p)}
              disabled={segments.length === 0}
              className={`touch-target w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                showBufferPopover
                  ? "bg-white/20 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={t("waveform.bulkBuffer")}
              aria-label={t("waveform.bulkBuffer")}
            >
              <Maximize2 className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-white/10" />

            {/* Loop */}
            <button
              onClick={toggleLoop}
              className={`touch-target w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                isLooping
                  ? "bg-white/20 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
              title={t("waveform.loopSegment")}
              aria-label={t("waveform.loopSegment")}
              aria-pressed={isLooping}
            >
              <Repeat className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Speed */}
            <button
              onClick={cyclePlaybackSpeed}
              className="touch-target h-8 px-2.5 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
              title={t("waveform.cycleSpeed")}
              aria-label={`${t("waveform.cycleSpeed")} - Currently ${playbackSpeed}x`}
            >
              <span className="text-xs font-mono font-semibold">{playbackSpeed}x</span>
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-white/10" />

            {/* Zoom Controls */}
            <button
              onClick={zoomOut}
              disabled={zoom <= WAVEFORM_CONFIG.ZOOM_MIN}
              className="touch-target w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title={t("waveform.zoomOut")}
              aria-label={t("waveform.zoomOut")}
            >
              <ZoomOut className="w-4 h-4" aria-hidden="true" />
            </button>

            <div className="h-8 px-2.5 flex items-center justify-center rounded bg-white/[0.03] border border-white/10">
              <span className="text-[10px] font-mono text-white/60 tabular-nums">{zoom}px</span>
            </div>

            <button
              onClick={zoomIn}
              disabled={zoom >= WAVEFORM_CONFIG.ZOOM_MAX}
              className="touch-target w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title={t("waveform.zoomIn")}
              aria-label={t("waveform.zoomIn")}
            >
              <ZoomIn className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts & Quality Bar */}
      <div className="border-t border-white/[0.08] px-4 py-2 bg-gradient-to-b from-[#050505] to-black/50">
        <div className="flex items-center justify-between gap-4 overflow-hidden">
          {/* Keyboard shortcuts */}
          <div className="flex items-center gap-4 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] font-mono text-white/70 font-semibold">Space</kbd>
              <span className="text-[11px] text-white/50">{t("waveform.playPause")}</span>
            </div>
            <span className="text-white/20">•</span>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] font-mono text-white/70 font-semibold">J</kbd>
              <span className="text-white/30">/</span>
              <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] font-mono text-white/70 font-semibold">K</kbd>
              <span className="text-[11px] text-white/50">{t("waveform.prevNext")}</span>
            </div>
            <span className="text-white/20">•</span>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] font-mono text-white/70 font-semibold">L</kbd>
              <span className="text-[11px] text-white/50">{t("waveform.loop")}</span>
            </div>
            <span className="text-white/20">•</span>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] font-mono text-white/70 font-semibold">S</kbd>
              <span className="text-[11px] text-white/50">{t("waveform.speed")}</span>
            </div>
            <span className="text-white/20">•</span>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] font-mono text-white/70 font-semibold">E</kbd>
              <span className="text-[11px] text-white/50">{t("waveform.edit")}</span>
            </div>
            <span className="text-white/20">•</span>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] font-mono text-white/70 font-semibold">⌘Z</kbd>
              <span className="text-[11px] text-white/50">{t("waveform.undo")}</span>
            </div>
          </div>

          {/* Quality Legend */}
          <div className="flex items-center gap-2.5 shrink-0" role="status" aria-label={t("waveform.quality")}>
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">{t("waveform.quality")}</span>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--similarity-high-solid)]" />
                <span className="text-[10px] text-white/50">{t("waveform.high")}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--similarity-medium-solid)]" />
                <span className="text-[10px] text-white/50">{t("waveform.medium")}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--similarity-low-solid)]" />
                <span className="text-[10px] text-white/50">{t("waveform.low")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timestamp Bubble - rendered as fixed position */}
      {editingState && (
        <TimestampBubble
          editingState={editingState}
          onClose={closeBubble}
          onUpdateStart={handleUpdateStart}
          onUpdateEnd={handleUpdateEnd}
          t={t}
        />
      )}

      {/* Bulk Buffer Popover - rendered outside overflow:hidden container */}
      {showBufferPopover && bulkBufferButtonRef.current && (() => {
        const rect = bulkBufferButtonRef.current!.getBoundingClientRect();
        return (
          <div
            className="fixed bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/20 rounded-xl p-4 w-64 z-[200] shadow-2xl shadow-black/80"
            style={{
              top: rect.bottom + 8,
              right: window.innerWidth - rect.right,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-white/90">{t("waveform.bulkBuffer")}</span>
              <button
                onClick={() => setShowBufferPopover(false)}
                className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Buffer Amount Input */}
            <div className="mb-4">
              <label className="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-2">
                {t("waveform.bufferAmount")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={bufferAmount}
                  onChange={(e) => setBufferAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="flex-1 h-8 bg-white/5 border border-white/10 rounded-lg px-3 text-sm font-mono text-white focus:outline-none focus:border-white/30"
                  min="0"
                  max="5000"
                  step="50"
                />
                <span className="text-xs text-white/50">ms</span>
              </div>
            </div>

            {/* Direction Toggle */}
            <div className="mb-4">
              <label className="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-2">
                {t("waveform.applyTo")}
              </label>
              <div className="flex gap-1">
                {(['start', 'end', 'both'] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => setBufferDirection(dir)}
                    className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${
                      bufferDirection === dir
                        ? "bg-white/20 text-white border border-white/30"
                        : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {t(`waveform.applyTo${dir.charAt(0).toUpperCase() + dir.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Segments Count */}
            <div className="mb-4 px-3 py-2 bg-white/5 rounded-lg">
              <span className="text-xs text-white/50">
                {segments.length} {t("segments")} {t("waveform.willBeAffected")}
              </span>
            </div>

            {/* Apply Button */}
            <button
              onClick={applyBulkBuffer}
              className="w-full h-9 bg-white/90 hover:bg-white text-black rounded-lg text-sm font-semibold transition-all"
            >
              {t("waveform.applyBuffer")}
            </button>
          </div>
        );
      })()}

      {/* Custom Styles for WaveSurfer */}
      <style jsx global>{`
        /* Region label - ayah numbers */
        .region-label {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 8px;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .region-label span {
          font-size: 12px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          padding: 4px 10px;
          border-radius: 6px;
          font-family: var(--font-mono);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          letter-spacing: 0.5px;
        }

        /* WaveSurfer region handle styling */
        [data-resize] {
          width: 8px !important;
          background: rgba(255, 255, 255, 0.5) !important;
          border-radius: 4px !important;
          opacity: 0;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: ew-resize !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        [part="region"]:hover [data-resize] {
          opacity: 1;
        }

        [data-resize]:hover {
          background: rgba(255, 255, 255, 0.9) !important;
          width: 10px !important;
          box-shadow: 0 2px 8px rgba(255, 255, 255, 0.3);
        }

        /* Edit mode: always show resize handles */
        [data-edit-mode="true"] [data-resize] {
          opacity: 0.7 !important;
          background: rgba(251, 191, 36, 0.6) !important;
        }

        [data-edit-mode="true"] [data-resize]:hover {
          opacity: 1 !important;
          background: rgba(251, 191, 36, 0.9) !important;
        }

        /* Region styling */
        [part="region"] {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          border-radius: 8px;
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }

        [part="region"]:hover {
          filter: brightness(1.2);
        }

        /* Remove all focus/active outlines */
        [part="region"]:focus,
        [part="region"]:focus-visible,
        [part="region"]:active,
        [part="region"][data-draggable="true"],
        [part="region"][data-resizable="true"] {
          outline: none !important;
          border: none !important;
        }

        /* Edit mode cursor change */
        [data-edit-mode="true"] [part="region"] {
          cursor: grab;
        }

        [data-edit-mode="true"] [part="region"]:active {
          cursor: grabbing;
        }

        /* Timeline styling */
        [part="timeline"] {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
        }
        
        /* Scrollbar styling */
        .waveform-scroll::-webkit-scrollbar {
          height: 10px;
        }

        .waveform-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 5px;
        }

        .waveform-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 5px;
        }

        .waveform-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .waveform-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05);
        }

        /* Animation */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes zoomIn95 {
          from { opacity: 0; transform: translate(-50%, -100%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
        }
        
        .animate-in {
          animation: zoomIn95 0.15s ease forwards;
        }
        
        .fade-in { }
        .zoom-in-95 { }
      `}</style>
    </div>
  );
}
