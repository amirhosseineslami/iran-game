"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useGame } from "@/features/game/context/GameContext";

export default function GameHUD() {
  const t = useTranslations("Game");
  const { ownedCount, stats } = useGame();
  const [lang, setLang] = useState<"en" | "fa">("fa");
  const [shortId, setShortId] = useState("....");

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
    <div className="absolute left-4 top-4 z-20 flex flex-col gap-2">
      <div className="rounded-xl bg-black/85 px-4 py-3 text-white shadow-xl backdrop-blur-md border border-white/10 min-w-[160px]">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
          <span className="text-sm font-bold tracking-widest">{t("title")}</span>
        </div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{t("beta")}</div>

        <div className="mt-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
            <span className="text-gray-400">{t("owned")}</span>
            <span className="font-bold text-green-300 text-base leading-none">{ownedCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gray-500" />
            <span className="text-gray-500 font-mono text-[10px]">{stats.total}</span>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-white/10">
          <span className="text-[10px] text-gray-500 font-mono">
            {t("player")}: {shortId}
          </span>
        </div>
      </div>

      <button
        onClick={handleLangChange}
        className="rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white/70 shadow backdrop-blur transition-all hover:bg-black/80 hover:text-white border border-white/10"
      >
        {lang === "fa" ? "EN" : "فا"}
      </button>
    </div>
  );
}
