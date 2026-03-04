"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Check, Lock, Plus, Loader2, Camera } from "lucide-react";

import { useReciters } from "@/lib/reciters-context";
import { selectImage } from "@/lib/qa-data";
import type { ReciterInfo } from "@/lib/reciter-metadata";
import ReciterAvatar from "./ReciterAvatar";

interface ReciterSelectorProps {
  selectedReciterId: string;
  onReciterChange: (reciterId: string) => void;
  locale: "en" | "ar";
}

export default function ReciterSelector({
  selectedReciterId,
  onReciterChange,
  locale,
}: ReciterSelectorProps) {
  const t = useTranslations("qa");
  const isRTL = locale === "ar";
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { reciters: allReciters, addReciter, updateReciterImage } = useReciters();

  // Add reciter form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNameEnglish, setNewNameEnglish] = useState("");
  const [newNameArabic, setNewNameArabic] = useState("");
  const [newImagePath, setNewImagePath] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAddForm(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedReciter = allReciters.find((r) => r.id === selectedReciterId);

  const handleReciterClick = (reciter: ReciterInfo) => {
    if (!reciter.isAvailable) {
      return;
    }
    onReciterChange(reciter.id);
    setIsOpen(false);
    setShowAddForm(false);
  };

  const handleSelectNewImage = async () => {
    const path = await selectImage();
    if (path) setNewImagePath(path);
  };

  const handleChangeReciterImage = async (reciter: ReciterInfo) => {
    if (!reciter.isCustom) return;
    const path = await selectImage();
    if (path) {
      await updateReciterImage(reciter.id, path);
    }
  };

  const handleCreateReciter = async () => {
    if (!newNameEnglish.trim() || !newNameArabic.trim()) return;
    setIsCreating(true);
    try {
      const info = await addReciter({
        nameEnglish: newNameEnglish.trim(),
        nameArabic: newNameArabic.trim(),
        nameTransliteration: newNameEnglish.trim(),
      });
      if (newImagePath) {
        await updateReciterImage(info.id, newImagePath);
      }
      onReciterChange(info.id);
      setShowAddForm(false);
      setNewNameEnglish("");
      setNewNameArabic("");
      setNewImagePath(null);
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to create reciter:", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`touch-target flex items-center gap-3 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors min-w-[240px] focus-visible:ring-2 focus-visible:ring-white/60 rounded-xl ${isRTL ? "flex-row-reverse" : ""}`}
        aria-label={`${t("selectReciter")}: ${isRTL ? selectedReciter?.nameArabic : selectedReciter?.nameTransliteration}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {selectedReciter && (
          <ReciterAvatar
            src={selectedReciter.imagePath}
            alt={selectedReciter.nameEnglish}
            size={40}
            className="w-10 h-10 rounded-full object-cover"
          />
        )}
        <div className={`flex-1 ${isRTL ? "text-right" : "text-left"}`}>
          <p className="text-sm font-medium text-white">
            {isRTL
              ? selectedReciter?.nameArabic
              : selectedReciter?.nameTransliteration}
          </p>
          <p
            className="text-xs text-gray-400"
            style={{ fontFamily: "var(--font-serif)" }}
            dir={isRTL ? "ltr" : "rtl"}
          >
            {isRTL
              ? selectedReciter?.nameTransliteration
              : selectedReciter?.nameArabic}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute ${isRTL ? "right-0" : "left-0"} bottom-full mb-2 w-80 max-h-[360px] overflow-y-auto bg-neutral-900/95 border border-white/10 backdrop-blur-xl shadow-2xl z-[9999] rounded-xl`}
          role="listbox"
          aria-label={t("selectReciter")}
        >
          {allReciters.map((reciter) => (
            <button
              key={reciter.id}
              onClick={() => handleReciterClick(reciter)}
              disabled={!reciter.isAvailable}
              className={`touch-target w-full flex items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60 ${
                reciter.isAvailable
                  ? "hover:bg-white/10 cursor-pointer"
                  : "opacity-50 cursor-not-allowed"
              } ${
                reciter.id === selectedReciterId ? "bg-white/5" : ""
              } ${isRTL ? "flex-row-reverse" : ""}`}
              role="option"
              aria-selected={reciter.id === selectedReciterId}
              aria-disabled={!reciter.isAvailable}
            >
              <div className="relative group/avatar">
                <ReciterAvatar
                  src={reciter.imagePath}
                  alt={reciter.nameEnglish}
                  size={40}
                  className={`w-10 h-10 rounded-full object-cover ${
                    !reciter.isAvailable ? "blur-sm" : ""
                  }`}
                />
                {!reciter.isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-white/70" />
                  </div>
                )}
                {reciter.isCustom && reciter.isAvailable && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChangeReciterImage(reciter);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        handleChangeReciterImage(reciter);
                      }
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                    aria-label="Change image"
                  >
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <div className={`flex-1 ${isRTL ? "text-right" : "text-left"}`}>
                <p className="text-sm font-medium text-white">
                  {isRTL ? reciter.nameArabic : reciter.nameTransliteration}
                </p>
                <p
                  className="text-xs text-gray-400"
                  style={{ fontFamily: "var(--font-serif)" }}
                  dir={isRTL ? "ltr" : "rtl"}
                >
                  {isRTL ? reciter.nameTransliteration : reciter.nameArabic}
                </p>
                {!reciter.isAvailable && (
                  <p className="text-xs text-amber-400 mt-0.5">
                    {t("comingSoon")}
                  </p>
                )}
              </div>
              <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                {reciter.id === selectedReciterId && reciter.isAvailable && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </div>
            </button>
          ))}

          {/* Divider + Add Reciter */}
          <div className="border-t border-white/10">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <Plus className="w-4 h-4" />
                <span>{t("addReciter")}</span>
              </button>
            ) : (
              <div className="p-3 space-y-2" dir={isRTL ? "rtl" : "ltr"}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectNewImage}
                    className="relative w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0 overflow-hidden"
                    aria-label="Select reciter image"
                  >
                    {newImagePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`munajjam://?path=${encodeURIComponent(newImagePath)}`}
                        alt="Preview"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <Camera className="w-4 h-4 text-white/40" />
                    )}
                  </button>
                  <input
                    type="text"
                    value={newNameEnglish}
                    onChange={(e) => setNewNameEnglish(e.target.value)}
                    placeholder="English name"
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
                    autoFocus
                    dir="ltr"
                  />
                </div>
                <input
                  type="text"
                  value={newNameArabic}
                  onChange={(e) => setNewNameArabic(e.target.value)}
                  placeholder="الاسم بالعربي"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
                  dir="rtl"
                  style={{ fontFamily: "var(--font-serif)" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateReciter();
                  }}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewNameEnglish("");
                      setNewNameArabic("");
                      setNewImagePath(null);
                    }}
                    className="flex-1 px-3 py-1.5 text-xs text-white/60 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {t("config.cancel") ?? "Cancel"}
                  </button>
                  <button
                    onClick={handleCreateReciter}
                    disabled={!newNameEnglish.trim() || !newNameArabic.trim() || isCreating}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-black bg-white hover:bg-white/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isCreating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      t("config.create") ?? "Create"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
