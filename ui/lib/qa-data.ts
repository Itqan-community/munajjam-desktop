import { getElectronBridge } from "./electron";
import type {
  AlignmentRow,
  AudioFileRow,
  ReciterRow,
  RecitationVersion,
} from "@/types/munajjam";

const getBridge = getElectronBridge;

export type { AlignmentRow, AudioFileRow, ReciterRow, RecitationVersion };

export async function listReciters(): Promise<ReciterRow[]> {
  return getBridge().data.listReciters();
}

export async function createReciter(input: {
  nameArabic: string;
  nameEnglish: string;
  nameTransliteration?: string;
}): Promise<ReciterRow> {
  return getBridge().data.createReciter(input);
}

export async function saveReciterImage(sourcePath: string, reciterId: string): Promise<{ imagePath: string }> {
  return getBridge().files.saveReciterImage(sourcePath, reciterId);
}

export async function updateReciterImage(reciterId: string, imagePath: string): Promise<ReciterRow> {
  return getBridge().data.updateReciterImage({ reciterId, imagePath });
}

export async function selectImage(): Promise<string | null> {
  return getBridge().dialog.selectImage();
}

export async function listRecitations(reciterId: string): Promise<RecitationVersion[]> {
  return getBridge().data.listRecitations(reciterId);
}

export async function createRecitation(input: {
  reciterId: string;
  versionName: string;
  versionLabel?: string;
}): Promise<RecitationVersion> {
  return getBridge().data.createRecitation(input);
}

export async function listAlignments(recitationId: string, surahId: number) {
  return getBridge().data.listAlignments({ recitationId, surahId });
}

export async function updateAlignment(payload: {
  recitation_id: string;
  surah_id: number;
  ayah_number: number;
  start_time: number;
  end_time: number;
}) {
  return getBridge().data.updateAlignment(payload);
}
