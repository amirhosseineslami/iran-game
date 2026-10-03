"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useGame, useGameStore } from "@/features/game/context/GameContext";
import useGameState from "@/features/game/hooks/useGameState";
import GameMap from "@/features/map/components/GameMap";
import CellBottomSheet from "@/features/game/components/CellBottomSheet";
import GameHUD from "@/features/game/components/GameHUD";
import PlayerLayer from "@/features/player/components/PlayerLayer";
import LocationControl from "@/features/player/components/LocationControl";
import LanguageSwitcher from "@/features/i18n/components/LanguageSwitcher";
import GameToast, { type ToastData } from "@/features/game/components/GameToast";

export default function Page() {
  const t = useTranslations("Game");
  const w = useTranslations("World");
  const [toast, setToast] = useState<ToastData | null>(null);
  const loadingRef = useRef(false);

  // useGameState owns the cell-loading lifecycle and player init.
  useGameState();

  const {
    cells,
    selectedCellId,
    selectedCell,
    loading,
    loadError,
    claiming,
    claimError,
    ownedCount,
    selectCell,
    claimCell,
    refreshState,
    playerLocation,
  } = useGame();

  const handleCellClick = (cellId: string) => {
    selectCell(selectedCellId === cellId ? null : cellId);
  };

  const handleClaim = useCallback(async (cellId: string) => {
    await claimCell(cellId);
    const { claimError: err } = useGameStore.getState();
    if (err) {
      setToast({ message: t(err) || err, type: "error" });
    } else {
      setToast({ message: t("claim_success"), type: "success" });
    }
  }, [claimCell, t]);

  const handleDismissToast = useCallback(() => setToast(null), []);

  // Viewport-based cell loading — fetch only visible cells
  const handleViewportChange = useCallback(async (bbox: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const res = await fetch(`/api/cells?bbox=${encodeURIComponent(bbox)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.cells)) {
        useGameStore.getState().mergeCells(data.cells);
      }
    } catch {
      // Silent — viewport refresh is non-critical
    } finally {
      loadingRef.current = false;
    }
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-[#0f172a]">
      {/* Map layer — always present */}
      <GameMap
        cells={cells}
        selectedCellId={selectedCellId}
        playerLocation={playerLocation}
        onCellClick={handleCellClick}
        onViewportChange={handleViewportChange}
      />

      {/* Subtle vignette over map for UI readability */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(2, 6, 18, 0.45) 100%)",
        }}
      />

      {/* Top HUD */}
      <GameHUD />

      {/* Player marker layer */}
      <PlayerLayer />

      {/* GPS status pill (bottom-center) */}
      <LocationControl />

      {/* Language switcher (top-right, small) */}
      <LanguageSwitcher />

      {/* Cell detail sheet */}
      <CellBottomSheet
        cell={selectedCell}
        ownedCount={ownedCount}
        claiming={claiming}
        claimError={claimError}
        onClaim={handleClaim}
        onClose={() => selectCell(null)}
      />

      {/* Toast notification */}
      <GameToast toast={toast} onDismiss={handleDismissToast} />

      {/* Select-cell hint pill when nothing is selected */}
      {!selectedCell && !loading && !loadError && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="glass-card rounded-full px-4 py-2 text-xs text-white/60 shadow-lg animate-fade-in max-w-[calc(100%-8rem)] truncate">
            {w("selectCell")}
          </div>
        </div>
      )}

      {/* Loading overlay — first-time cell load only */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a]/85 backdrop-blur-sm z-30 animate-fade-in">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-amber-400/30" />
              <div className="w-14 h-14 rounded-full border-2 border-transparent border-t-amber-400 animate-spin absolute inset-0" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-game-title text-amber-400">{t("beta")}</span>
              </div>
            </div>
            <div className="text-xs text-white/50 font-medium tracking-widest uppercase">
              {t("loading")}
            </div>
          </div>
        </div>
      )}

      {/* Load error state — recoverable */}
      {!loading && loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a]/85 backdrop-blur-sm z-30 animate-fade-in">
          <div className="glass-card rounded-3xl p-8 max-w-sm w-[calc(100%-3rem)] text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-white mb-1.5">
              {t("claim_failed")}
            </h2>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              {t("confirm_network_error")}
            </p>
            <button
              type="button"
              onClick={() => refreshState()}
              className="rounded-xl bg-white/10 hover:bg-white/20 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              {t("retry")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
