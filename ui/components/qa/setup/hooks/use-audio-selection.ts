import { useCallback, useEffect, useMemo, useState } from "react";
import type { AudioFileScanResult } from "@/types/munajjam";
import { getElectronBridge } from "@/lib/electron";

type SelectionMode = "folder" | "files" | null;

interface UseAudioSelectionResult {
  audioDir: string | null;
  scanning: boolean;
  scannedFiles: AudioFileScanResult[];
  manualAssignments: Record<string, number>;
  selectionMode: SelectionMode;
  recognizedFiles: AudioFileScanResult[];
  unrecognizedFiles: AudioFileScanResult[];
  allIdentified: boolean;
  allSurahIds: number[];
  canSubmit: boolean;
  setSelectionMode: (mode: SelectionMode) => void;
  handleSelectAudioFolder: () => Promise<void>;
  handleSelectAudioFiles: () => Promise<void>;
  handleManualAssign: (filename: string, surahId: number) => void;
}

function extractFilename(fullPath: string): string {
  const separatorIndex = Math.max(fullPath.lastIndexOf("/"), fullPath.lastIndexOf("\\"));
  return separatorIndex >= 0 ? fullPath.substring(separatorIndex + 1) : fullPath;
}

function extractAudioDirectory(fullPath: string): string {
  const separatorIndex = Math.max(fullPath.lastIndexOf("/"), fullPath.lastIndexOf("\\"));
  return separatorIndex > 0 ? fullPath.substring(0, separatorIndex) : fullPath;
}

function inferSurahIdFromFilename(filename: string): number | null {
  const dotIndex = filename.lastIndexOf(".");
  const stem = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
  if (!/^\d+$/.test(stem)) {
    return null;
  }

  const parsed = Number.parseInt(stem, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 114) {
    return null;
  }

  return parsed;
}

function toAudioScanResult(filePath: string): AudioFileScanResult {
  const filename = extractFilename(filePath);
  return {
    filename,
    fullPath: filePath,
    surahId: inferSurahIdFromFilename(filename),
  };
}

function sortAudioScanResult(a: AudioFileScanResult, b: AudioFileScanResult): number {
  if (a.surahId !== null && b.surahId !== null) {
    return a.surahId - b.surahId;
  }
  if (a.surahId !== null) {
    return -1;
  }
  if (b.surahId !== null) {
    return 1;
  }
  return a.filename.localeCompare(b.filename);
}

export function useAudioSelection(): UseAudioSelectionResult {
  const [audioDir, setAudioDir] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedFiles, setScannedFiles] = useState<AudioFileScanResult[]>([]);
  const [manualAssignments, setManualAssignments] = useState<Record<string, number>>({});
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);

  const recognizedFiles = useMemo(
    () => scannedFiles.filter((file) => file.surahId !== null),
    [scannedFiles],
  );
  const unrecognizedFiles = useMemo(
    () => scannedFiles.filter((file) => file.surahId === null),
    [scannedFiles],
  );

  const allIdentified = useMemo(
    () => unrecognizedFiles.every((file) => manualAssignments[file.filename] != null),
    [manualAssignments, unrecognizedFiles],
  );

  const allSurahIds = useMemo(() => {
    const surahIds: number[] = [];

    for (const file of recognizedFiles) {
      if (file.surahId !== null) {
        surahIds.push(file.surahId);
      }
    }

    for (const file of unrecognizedFiles) {
      const assigned = manualAssignments[file.filename];
      if (typeof assigned === "number") {
        surahIds.push(assigned);
      }
    }

    return surahIds.sort((a, b) => a - b);
  }, [recognizedFiles, unrecognizedFiles, manualAssignments]);

  const canSubmit = scannedFiles.length > 0 && allIdentified && allSurahIds.length > 0;

  useEffect(() => {
    if (!audioDir) {
      setScannedFiles([]);
      setManualAssignments({});
      return;
    }

    if (selectionMode === "files") {
      return;
    }

    let cancelled = false;
    setScanning(true);
    setScannedFiles([]);
    setManualAssignments({});

    void getElectronBridge()
      .files
      .listAudioInDir(audioDir)
      .then((results) => {
        if (!cancelled) {
          setScannedFiles(results);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setScannedFiles([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setScanning(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [audioDir, selectionMode]);

  const handleSelectAudioFolder = useCallback(async () => {
    const folder = await getElectronBridge().dialog.selectFolder();
    if (!folder) {
      return;
    }

    setSelectionMode("folder");
    setAudioDir(folder);
  }, []);

  const handleSelectAudioFiles = useCallback(async () => {
    const files = await getElectronBridge().dialog.selectAudioFiles();
    if (!files || files.length === 0) {
      return;
    }

    const audioExtensions = new Set(["mp3", "wav", "m4a", "flac"]);
    const filtered = files.filter((filePath) => {
      const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
      return audioExtensions.has(ext);
    });

    if (filtered.length === 0) {
      return;
    }

    const derivedDir = extractAudioDirectory(filtered[0]);
    const mapped = filtered.map(toAudioScanResult).sort(sortAudioScanResult);

    setSelectionMode("files");
    setAudioDir(derivedDir);
    setScannedFiles(mapped);
    setManualAssignments({});
  }, []);

  const handleManualAssign = useCallback((filename: string, surahId: number) => {
    setManualAssignments((previous) => ({
      ...previous,
      [filename]: surahId,
    }));
  }, []);

  return {
    audioDir,
    scanning,
    scannedFiles,
    manualAssignments,
    selectionMode,
    recognizedFiles,
    unrecognizedFiles,
    allIdentified,
    allSurahIds,
    canSubmit,
    setSelectionMode,
    handleSelectAudioFolder,
    handleSelectAudioFiles,
    handleManualAssign,
  };
}
