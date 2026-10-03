"use client";

import { useTranslations } from "next-intl";
import { usePlayerLocation } from "../hooks/usePlayerLocation";
import { MapPin, RefreshCw, AlertCircle } from "lucide-react";

export default function LocationControl() {
  const t = useTranslations("Player");
  const { location, loading, error, permissionDenied, refresh } = usePlayerLocation();

  if (!location && !loading && !error && !permissionDenied) return null;

  return (
    <div className="absolute bottom-4 sm:bottom-6 inset-x-3 sm:inset-x-4 z-20 flex justify-center pointer-events-none">
      <div className="glass-card rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-lg w-full max-w-xs pointer-events-auto animate-slide-up">
        <div className="flex items-center gap-2">
          {loading && (
            <>
              <div className="w-6 h-6 rounded-full border-2 border-amber-400/60 border-t-amber-400 animate-spin shrink-0" />
              <span className="text-xs text-white/70 flex-1">{t("gettingLocation")}</span>
            </>
          )}

          {!loading && location && (
            <>
              <div className="relative w-6 h-6 shrink-0">
                <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
                <div className="absolute inset-1 rounded-full bg-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">{t("location")}</div>
                <div className="text-xs text-green-400 font-medium">{t("locationActive")}</div>
              </div>
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                aria-label={t("refreshLocation")}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {!loading && !location && error && (
            <>
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">{t("location")}</div>
                <div className="text-xs text-amber-300 truncate">{error}</div>
              </div>
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="ml-1 px-2.5 py-1.5 rounded-lg bg-white/10 text-xs text-white/80 hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                {t("refreshLocation")}
              </button>
            </>
          )}

          {permissionDenied && (
            <>
              <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">{t("location")}</div>
                <div className="text-xs text-yellow-300/80">{t("permissionHint")}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
