export interface SeedReciter {
  id: string;
  name_arabic: string;
  name_english: string;
  name_transliteration: string;
  image_path: string;
  country: string | null;
  style: string | null;
}

export const DEFAULT_RECITERS: SeedReciter[] = [
  {
    id: "badr_alturki",
    name_arabic: "بدر التركي",
    name_english: "Bader Al-Turki",
    name_transliteration: "Badr Al-Turki",
    image_path: "/reciters_images/bader_alturki.png",
    country: "Saudi Arabia",
    style: "Murattal",
  },
  {
    id: "hassan_aldaghreeri",
    name_arabic: "حسن الدغريري",
    name_english: "Hassan Al-Daghreeri",
    name_transliteration: "Hassan Al-Daghreeri",
    image_path: "/reciters_images/hassan.png",
    country: null,
    style: "Murattal",
  },
  {
    id: "dhafar_qolaib",
    name_arabic: "ظفر قليب",
    name_english: "Dhafar Qolaib",
    name_transliteration: "Dhafar Qolaib",
    image_path: "/reciters_images/zafar.png",
    country: null,
    style: "Murattal",
  },
  {
    id: "majed_alzamel",
    name_arabic: "ماجد الزامل",
    name_english: "Majed Al-Zamel",
    name_transliteration: "Majed Al-Zamel",
    image_path: "/reciters_images/majed.png",
    country: null,
    style: "Murattal",
  },
  {
    id: "mohammed_alzubaidi",
    name_arabic: "محمد الزبيدي",
    name_english: "Mohammed Al-Zubaidi",
    name_transliteration: "Mohammed Al-Zubaidi",
    image_path: "/reciters_images/alzubidi.png",
    country: null,
    style: "Murattal",
  },
  {
    id: "nasser_alasfour",
    name_arabic: "ناصر العصفور",
    name_english: "Nasser Al-Asfour",
    name_transliteration: "Nasser Al-Asfour",
    image_path: "/reciters_images/nasser.png",
    country: null,
    style: "Murattal",
  },
];
