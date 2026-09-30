"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface GameHUDProps {
  title: string;
  ownedCount: number;
  totalCells: number;
  lang: string;
  onLangChange: (lang: "en" | "fa") => void;
}

export default function GameHUD({ title, ownedCount, totalCells, lang, onLangChange }: GameHUDProps) {
  const t = useTranslations("Game");

  return (
    <div className="absolute left-4 top-4 z-20">
      <div className="rounded-xl bg-black/80 px-4 py-3 text-white shadow-lg backdrop-blur">
        {/* Title */}
        <div className="text-lg font-bold tracking-wider">{title}</div>
        <div className="text-xs text-gray-400">{t("beta")}</div>

        {/* Stats */}
        <div className="mt-2 flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400"></span>
            <span className="text-gray-300">{t("owned")}:</span>
            <span className="font-bold text-amber-300">{ownedCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-400"></span>
            <span className="text-gray-300">{t("total")}:</span>
            <span className="font-mono text-gray-400">{totalCells}</span>
          </div>
        </div>
      </div>

      {/* Language switcher */}
      <button
        onClick={() => onLangChange(lang === "en" ? "fa" : "en")}
        className="mt-2 rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white/80 shadow backdrop-blur transition hover:bg-black/80 hover:text-white"
      >
        {t("language")}
      </button>
    </div>
  );
}
