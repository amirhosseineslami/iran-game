"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { GameCell } from "@/features/world/types/gameCell";

interface CellBottomSheetProps {
  cell: GameCell | null;
  ownedCount: number;
  claiming: boolean;
  claimError: string | null;
  onClaim: () => void;
  onConfirm: (cellId: string) => void;
  onClose: () => void;
}

export default function CellBottomSheet({
  cell,
  ownedCount,
  claiming,
  claimError,
  onClaim,
  onConfirm,
  onClose,
}: CellBottomSheetProps) {
  const t = useTranslations("Game");

  if (!cell) {
    return (
      <div className="absolute bottom-6 left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 z-20">
        <div className="rounded-full bg-black/80 px-4 py-2 text-sm text-white/80 shadow-lg backdrop-blur">
          {t("selectCellHint")}
        </div>
      </div>
    );
  }

  const isAvailable = cell.status === "available";
  const isPending = cell.status === "pending_claim";
  const isClaimed = cell.status === "claimed";
  const isOwner = cell.ownerId !== null;

  return (
    <div className="absolute bottom-6 left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 z-20">
      <div className="pointer-events-auto rounded-2xl bg-black/90 p-4 text-white shadow-2xl backdrop-blur">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400">{t("gameCell")}</div>
            <div className="font-mono text-lg font-bold">{cell.id}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>

        {/* Status */}
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="text-gray-400">{t("status")}:</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isAvailable ? "bg-green-500/20 text-green-300" :
            isPending ? "bg-blue-500/20 text-blue-300" :
            isClaimed ? "bg-amber-500/20 text-amber-300" :
            "bg-gray-500/20 text-gray-300"
          }`}>
            {isAvailable ? t("available") :
             isPending ? t("pending") :
             isClaimed ? t("owned") :
             cell.status}
          </span>
        </div>

        {/* Owner info */}
        {isOwner && (
          <div className="mb-3 text-xs text-gray-400">
            {t("owner")}: <span className="font-mono">{cell.ownerId!.slice(0, 8)}...</span>
          </div>
        )}

        {/* Claim button */}
        {isAvailable && (
          <button
            type="button"
            onClick={onClaim}
            disabled={claiming}
            className="w-full rounded-xl bg-green-500 px-4 py-3 font-bold text-white transition-all hover:bg-green-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* Pending confirmation */}
        {isPending && (
          <button
            type="button"
            onClick={() => onConfirm(cell.id)}
            className="w-full rounded-xl bg-blue-500 px-4 py-3 font-bold text-white transition-all hover:bg-blue-400 active:scale-[0.98]"
          >
            {t("confirmClaim")}
          </button>
        )}

        {/* Owned state */}
        {isClaimed && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-green-500/20 py-3 text-sm text-green-300">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
            </svg>
            {t("ownedByYou")}
          </div>
        )}

        {/* Error message */}
        {claimError && (
          <div className="mt-2 rounded-lg bg-red-500/20 p-2 text-xs text-red-300">
            {t(claimError)}
          </div>
        )}
      </div>
    </div>
  );
}
