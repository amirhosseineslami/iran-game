"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useGame } from "@/features/game/context/GameContext";
import { MapPin, Globe, Shield, Star } from "lucide-react";

export default function GameHUD() {
  const t = useTranslations("Game");
  const { ownedCount, stats, playerLocation, xp, progression } = useGame();
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
      {/* Left: Player identity & stats */}
      <div className="flex flex-col gap-2 pointer-events-auto">
        {/* Main HUD card */}
        <div className="glass-card rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-lg min-w-[160px] sm:min-w-[180px]">
          {/* Level + Title row */}
          <div className="flex items-center gap-2 mb-2 sm:mb-2.5">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#0f172a] flex items-center justify-center">
                <span className="text-[8px] sm:text-[9px] font-bold text-amber-400 leading-none">
                  {progression.level}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-game-title truncate">{t("title")}</div>
              <div className="text-game-label">{t("beta")}</div>
            </div>
          </div>

          {/* XP progress bar */}
          <div className="mb-2 sm:mb-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-amber-400/80 font-medium flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5" />
                {xp} XP
              </span>
              <span className="text-[9px] text-gray-500">
                {progression.nextLevelXp} XP
              </span>
            </div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
                style={{ width: `${progression.progressToNext * 100}%` }}
              />
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
