"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { GameProvider, useGame } from "@/features/game/context/GameContext";
import GameMap from "@/features/map/components/GameMap";
import CellRenderer from "@/features/game/components/CellRenderer";
import CellBottomSheet from "@/features/game/components/CellBottomSheet";
import GameHUD from "@/features/game/components/GameHUD";
import PlayerLayer from "@/features/player/components/PlayerLayer";
import LocationControl from "@/features/player/components/LocationControl";

function GameplayUI() {
  const t = useTranslations("Game");
  const locale = typeof window !== 'undefined' ? document.documentElement.lang : 'en';
  const [lang, setLang] = React.useState(locale);
  
  const {
    cells,
    selectedCellId,
    selectedCell,
    loading,
    claiming,
    claimError,
    ownedCount,
    stats,
    selectCell,
    claimCell,
    confirmClaim,
  } = useGame();

  const handleLangChange = (newLang: "en" | "fa") => {
    setLang(newLang);
    document.documentElement.dir = newLang === "fa" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
  };

  return (
    <>
      {/* HUD - top left */}
      <GameHUD
        title={t("title")}
        ownedCount={ownedCount}
        totalCells={stats.total}
        lang={lang}
        onLangChange={handleLangChange}
      />

      {/* Map and layers */}
      <div className="absolute inset-0 z-0">
        <GameMap>
          <CellRenderer
            cells={cells}
            selectedCellId={selectedCellId}
            onCellClick={selectCell}
          />
          <PlayerLayer />
        </GameMap>
      </div>

      {/* Location control - top right */}
      <div className="absolute right-4 top-4 z-20">
        <LocationControl />
      </div>

      {/* Bottom sheet for cell details */}
      <CellBottomSheet
        cell={selectedCell}
        ownedCount={ownedCount}
        claiming={claiming}
        claimError={claimError}
        onClaim={claimCell}
        onConfirm={confirmClaim}
        onClose={() => selectCell(selectedCellId ?? "")}
      />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30 pointer-events-none">
          <div className="text-white text-lg font-bold">{t("claiming") || "Loading..."}</div>
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <GameProvider>
        <GameplayUI />
      </GameProvider>
    </div>
  );
}
