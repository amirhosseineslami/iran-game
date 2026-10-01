"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useGame } from "@/features/game/context/GameContext";
import GameMap from "@/features/map/components/GameMap";
import CellBottomSheet from "@/features/game/components/CellBottomSheet";
import GameHUD from "@/features/game/components/GameHUD";
import PlayerLayer from "@/features/player/components/PlayerLayer";
import LocationControl from "@/features/player/components/LocationControl";
import LanguageSwitcher from "@/features/i18n/components/LanguageSwitcher";

export default function Page() {
  const t = useTranslations("Game");
  const { cells, selectedCellId, selectedCell, loading, claiming, claimError, ownedCount, stats, selectCell, claimCell, initPlayer, playerLocation } = useGame();

  useEffect(() => {
    initPlayer();
  }, [initPlayer]);

  const handleCellClick = (cellId: string) => {
    selectCell(selectedCellId === cellId ? null : cellId);
  };

  const handleClaim = (cellId: string) => {
    claimCell(cellId);
  };

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      <GameMap
        cells={cells}
        selectedCellId={selectedCellId}
        playerLocation={playerLocation}
        onCellClick={handleCellClick}
      />
      <GameHUD />
      <PlayerLayer />
      <LocationControl />
      <LanguageSwitcher />
      <CellBottomSheet
        cell={selectedCell}
        ownedCount={ownedCount}
        claiming={claiming}
        claimError={claimError}
        onClaim={handleClaim}
        onClose={() => selectCell(null)}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
          <div className="flex flex-col items-center gap-3">
            <svg className="h-8 w-8 animate-spin text-amber-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <span className="text-white text-sm font-medium">{t("loading") || "Loading..."}</span>
          </div>
        </div>
      )}
    </div>
  );
}
