"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useGame } from "@/features/game/context/GameContext";
import { MapPin, Globe, Shield } from "lucide-react";

export default function GameHUD() {
  const t = useTranslations("Game");
  const { ownedCount, stats, playerLocation } = useGame();
  const [lang, setLang] = useState<"en" | "fa">("fa");
  const [shortId, setShortId] = useState("••••");

  useEffect(() => {
    const stored = localStorage.getItem("iran-game-player-id");
    if (stored) setShortId(stored.slice(-4));

    const initialLang = document.documentElement.lang === "fa" ? "fa" : "en";
    setLang(initialLang);
  }, []);

  const handleLangChange = () => {
    const next = lang === "en" ? "fa" : "en";
    setLang(next);
    document.documentElement.dir = next === "fa" ? "rtl" : "ltr";
    document.documentElement.lang = next;
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`;
  };

  return (
    <div className="absolute inset-x-3 sm:inset-x-4 top-3 sm:top-4 z-20 flex items-start justify-between pointer-events-none">
      {/* Left: Player identity & territory count */}
      <div className="flex flex-col gap-2 pointer-events-auto">
        {/* Main HUD card */}
        <div className="glass-card rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-lg min-w-[160px] sm:min-w-[180px]">
          <div className="flex items-center gap-2 mb-2 sm:mb-2.5">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-game-title">{t("title")}</div>
              <div className="text-game-label">{t("beta")}</div>
            </div>
          </div>

          <div className="h-px bg-white/10 mb-2 sm:mb-2.5" />

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <span className="text-game-label mb-0.5">{t("owned")}</span>
              <span className="text-game-stat text-green-400">{ownedCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-game-label mb-0.5">{t("totalCells")}</span>
              <span className="text-game-stat text-gray-400">{stats.total.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-2 sm:mt-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-gray-500 font-mono">#{shortId}</span>
            </div>
            {playerLocation && (
              <span className="text-[10px] text-green-400/80 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {t("locationActive")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Language switcher */}
      <div className="pointer-events-auto">
        <button
          onClick={handleLangChange}
          className="glass-card rounded-xl px-3 py-2 text-xs font-semibold text-white/80 hover:text-white transition-all hover:bg-white/10 flex items-center gap-1.5"
          aria-label="Switch language"
        >
          <Globe className="w-3.5 h-3.5" />
          {lang === "fa" ? "EN" : "فا"}
        </button>
      </div>
    </div>
  );
}
