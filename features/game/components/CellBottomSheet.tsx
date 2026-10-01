"use client";

import { useTranslations } from "next-intl";
import type { GameCell } from "@/features/world/types/gameCell";

interface CellBottomSheetProps {
  cell: GameCell | null;
  ownedCount: number;
  claiming: boolean;
  claimError: string | null;
  onClaim: (cellId: string) => void;
  onClose: () => void;
}

export default function CellBottomSheet({ cell, ownedCount, claiming, claimError, onClaim, onClose }: CellBottomSheetProps) {
  const t = useTranslations("Game");

  if (!cell) {
    return (
      <div className="absolute bottom-6 left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 z-20">
        <div className="rounded-full bg-black/80 px-4 py-2.5 text-sm text-white/70 shadow-lg backdrop-blur border border-white/10 text-center">
          {t("selectCellHint")}
        </div>
      </div>
    );
  }

  const isAvailable = cell.status === "available";
  const isPending = cell.status === "pending_claim";
  const isClaimed = cell.status === "claimed";
  const isOwner = cell.ownerId !== null;

  const statusLabel = isAvailable ? t("available") : isPending ? t("pending") : isClaimed ? t("owned") : cell.status;
  const statusColor = isAvailable
    ? "bg-green-500/20 text-green-300 border-green-500/30"
    : isPending
    ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
    : isClaimed
    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
    : "bg-gray-500/20 text-gray-300 border-gray-500/30";

  return (
    <div className="absolute bottom-6 left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 z-20">
      <div className="pointer-events-auto rounded-2xl bg-black/92 p-4 text-white shadow-2xl backdrop-blur-xl border border-white/10">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-0.5">{t("gameCell")}</div>
            <div className="font-mono text-base font-bold tracking-wide">{cell.id}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-white/10 hover:text-white transition-colors shrink-0"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>

        {/* Status badge */}
        <div className="mb-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${statusColor}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              isAvailable ? "bg-green-400" : isPending ? "bg-blue-400" : isClaimed ? "bg-amber-400" : "bg-gray-400"
            }`} />
            {statusLabel}
          </span>
        </div>

        {/* Owner info */}
        {isOwner && (
          <div className="mb-3 text-xs text-gray-400 flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            {t("owner")}: <span className="font-mono text-gray-300">{cell.ownerId!.slice(-6)}</span>
          </div>
        )}

        {/* Actions */}
        {isAvailable && (
          <button
            type="button"
            onClick={() => onClaim(cell.id)}
            disabled={claiming}
            className="w-full rounded-xl bg-green-500 px-4 py-3 font-bold text-white text-sm transition-all hover:bg-green-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-green-500/20"
          >
            {claiming ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                {t("claiming")}
              </span>
            ) : (
              t("claim")
            )}
          </button>
        )}

        {isClaimed && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-green-500/15 py-3 text-sm text-green-300 border border-green-500/20">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {t("ownedByYou")}
          </div>
        )}

        {/* Error */}
        {claimError && (
          <div className="mt-2 rounded-lg bg-red-500/15 border border-red-500/20 p-2.5 text-xs text-red-300">
            {t(claimError) || claimError}
          </div>
        )}
      </div>
    </div>
  );
}
