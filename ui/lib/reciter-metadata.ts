// Reciter metadata for QA dashboard

import type { ReciterRow } from "@/lib/qa-data";

export interface ReciterInfo {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  nameTransliteration: string;
  imagePath: string;
  isAvailable: boolean;
  country?: string;
  style?: string;
  isCustom?: boolean;
}

export const allReciters: ReciterInfo[] = [
  {
    id: "badr_alturki",
    nameArabic: "بدر التركي",
    nameEnglish: "Bader Al-Turki",
    nameTransliteration: "Badr Al-Turki",
    imagePath: "/reciters_images/bader_alturki.png",
    isAvailable: true,
    country: "Saudi Arabia",
    style: "Murattal",
  },
  {
    id: "hassan_aldaghreeri",
    nameArabic: "حسن الدغريري",
    nameEnglish: "Hassan Al-Daghreeri",
    nameTransliteration: "Hassan Al-Daghreeri",
    imagePath: "/reciters_images/hassan.png",
    isAvailable: true,
    style: "Murattal",
  },
  {
    id: "dhafar_qolaib",
    nameArabic: "ظفر قليب",
    nameEnglish: "Dhafar Qolaib",
    nameTransliteration: "Dhafar Qolaib",
    imagePath: "/reciters_images/zafar.png",
    isAvailable: true,
    style: "Murattal",
  },
  {
    id: "majed_alzamel",
    nameArabic: "ماجد الزامل",
    nameEnglish: "Majed Al-Zamel",
    nameTransliteration: "Majed Al-Zamel",
    imagePath: "/reciters_images/majed.png",
    isAvailable: true,
    style: "Murattal",
  },
  {
    id: "mohammed_alzubaidi",
    nameArabic: "محمد الزبيدي",
    nameEnglish: "Mohammed Al-Zubaidi",
    nameTransliteration: "Mohammed Al-Zubaidi",
    imagePath: "/reciters_images/alzubidi.png",
    isAvailable: true,
    style: "Murattal",
  },
  {
    id: "nasser_alasfour",
    nameArabic: "ناصر العصفور",
    nameEnglish: "Nasser Al-Asfour",
    nameTransliteration: "Nasser Al-Asfour",
    imagePath: "/reciters_images/nasser.png",
    isAvailable: true,
    style: "Murattal",
  },
];

// Convert a DB row to ReciterInfo
export function reciterRowToInfo(row: ReciterRow): ReciterInfo {
  return {
    id: row.id,
    nameArabic: row.name_arabic,
    nameEnglish: row.name_english,
    nameTransliteration: row.name_transliteration,
    imagePath: row.image_path,
    isAvailable: row.is_available === 1,
    country: row.country ?? undefined,
    style: row.style ?? undefined,
    isCustom: row.is_custom === 1,
  };
}
