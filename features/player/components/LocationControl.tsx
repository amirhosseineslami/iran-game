"use client";

import { useTranslations } from "next-intl";
import { usePlayerLocation } from "../hooks/usePlayerLocation";

export default function LocationControl() {
  const t = useTranslations("Player");
  const { location, loading, error, permissionDenied, refresh } = usePlayerLocation();

  if (!location && !loading && !error && !permissionDenied) return null;

  return (
    <div className="absolute bottom-24 right-4 z-20 w-[calc(100%-2rem)] max-w-xs">
      <div className="rounded-2xl bg-black/90 p-3 text-white shadow-2xl backdrop-blur border border-white/10">
        <div className="mb-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
          {t("location")}
        </div>

        {loading && (
          <div className="text-xs text-white/70">{t("gettingLocation")}</div>
        )}

        {!loading && location && (
          <div className="space-y-0.5 text-xs text-white/70">
            <div>{t("accuracy")}: {Math.round(location.accuracy)}m</div>
            <div className="text-green-400">{t("locationActive")}</div>
          </div>
        )}

        {!loading && !location && error && (
          <div className="mb-2 text-xs text-red-300">{error}</div>
        )}

        {permissionDenied && (
          <div className="mb-2 text-xs text-yellow-300">{t("permissionHint")}</div>
        )}

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="mt-2 w-full rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? t("loading") : t("refreshLocation")}
        </button>
      </div>
    </div>
  );
}
