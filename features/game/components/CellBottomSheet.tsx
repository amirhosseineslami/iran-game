"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { GameCell } from "@/features/world/types/gameCell";
import { X, MapPin, Lock, CheckCircle, Shield } from "lucide-react";

interface CellBottomSheetProps {
  cell: GameCell | null;
  ownedCount: number;
  claiming: boolean;
  claimError: string | null;
  onClaim: (cellId: string) => void;
  onClose: () => void;
  onToast?: (message: string, type: "success" | "error") => void;
}

export default function CellBottomSheet({
  cell,
  ownedCount,
  claiming,
  claimError,
  onClaim,
  onClose,
}: CellBottomSheetProps) {
  const t = useTranslations("Game");
  const [errorShown, setErrorShown] = useState<string | null>(null);

  if (!cell) return null;

  const isAvailable = cell.status === "available";
  const isPending = cell.status === "pending_claim";
  const isClaimed = cell.status === "claimed";
  const isOwner = cell.ownerId !== null;

  const buildabilityLabel =
    cell.buildability === "non_buildable"
      ? t("claim_already_owned")
      : cell.buildability === "restricted"
      ? t("claim_conflict")
      : "";

  const handleClaim = () => {
    onClaim(cell.id);
  };

  // Build area estimate from row/col (approximate for display)
  const approximateArea = `${(0.11 * 0.11).toFixed(2)} km²`;

  return (
    <div className="absolute bottom-0 inset-x-0 z-20 pointer-events-none">
      <div className="max-w-lg mx-auto px-3 sm:px-4 pb-3 sm:pb-4 pt-2 pointer-events-auto">
        {/* Bottom sheet */}
        <div className="glass-card rounded-t-3xl p-4 sm:p-5 shadow-2xl animate-slide-up">
          {/* Drag handle */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-game-label mb-0.5">{t("gameCell")}</div>
              <div className="text-game-cell-id font-mono">{cell.id}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                ({cell.row}, {cell.col}) · ~{approximateArea}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status badge */}
          <div className="mb-4">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border ${
                isAvailable
                  ? "bg-green-500/15 text-green-300 border-green-500/30"
                  : isClaimed
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-gray-500/15 text-gray-300 border-gray-500/30"
              }`}
            >
              {isAvailable && <MapPin className="w-3 h-3" />}
              {isClaimed && <CheckCircle className="w-3 h-3" />}
              {isClaimed && <span className="text-xs">{t("ownedByYou")}</span>}
              {isAvailable && <span className="text-xs">{t("available")}</span>}
            </span>
          </div>

          {/* Owner info */}
          {isOwner && (
            <div className="flex items-center gap-2 mb-4 text-xs text-gray-400">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>{t("owner")}: <span className="font-mono text-gray-300">{cell.ownerId!.slice(-6)}</span></span>
            </div>
          )}

          {/* Claim action */}
          {isAvailable && (
            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3.5 font-bold text-white text-sm transition-all hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
            >
              {claiming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                  <span>{t("claiming")}</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>{t("claim")}</span>
                </>
              )}
            </button>
          )}

          {isClaimed && (
            <div className="rounded-2xl bg-green-500/15 border border-green-500/20 py-3.5 text-center">
              <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <span className="text-sm font-semibold text-green-300">{t("ownedByYou")}</span>
            </div>
          )}

          {/* Error */}
          {(claimError || errorShown) && (
            <div className="mt-3 rounded-xl bg-red-500/15 border border-red-500/20 p-3 text-xs text-red-300">
              {t(claimError || errorShown!) || (claimError || errorShown)}
            </div>
          )}

          {/* Buildability note */}
          {cell.buildability !== undefined && cell.buildability !== "buildable" && isAvailable && (
            <div className="mt-2 text-[10px] text-gray-500 text-center">
              {cell.buildability === "non_buildable" ? "🚫 " : "⚠️ "}{buildabilityLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
