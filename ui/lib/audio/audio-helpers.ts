import { getElectronBridge } from "../electron";

/**
 * Returns a `munajjam://` URL for a local audio file associated with a reciter/surah pair.
 */
export async function getAudioUrl(
  surahId: number,
  reciterId: string,
): Promise<string> {
  try {
    const bridge = getElectronBridge();
    const record = await bridge.data.getAudioFile({
      reciterId,
      surahId,
    });

    if (!record?.audio_path) {
      return "";
    }

    return `munajjam://audio?path=${encodeURIComponent(record.audio_path)}`;
  } catch (error) {
    console.error("Error fetching local audio URL:", error);
    return "";
  }
}
