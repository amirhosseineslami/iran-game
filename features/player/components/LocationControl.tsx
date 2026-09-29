"use client";

import { useTranslations } from "next-intl";

import {
  usePlayerLocation,
} from "../hooks/usePlayerLocation";

export default function LocationControl() {
  const t = useTranslations("Player");

  const {
    location,
    loading,
    error,
    permissionDenied,
    refresh,
  } = usePlayerLocation();

  return (
    <div className="absolute bottom-6 right-4 z-20 w-[calc(100%-2rem)] max-w-xs">
      <div className="rounded-2xl bg-black/90 p-4 text-white shadow-2xl backdrop-blur">
        <div className="mb-2 font-bold">
          {t("location")}
        </div>

        {loading && (
          <div className="text-sm text-white/70">
            {t("gettingLocation")}
          </div>
        )}

        {!loading && location && (
          <div className="space-y-1 text-xs text-white/70">
            <div>
              {t("accuracy")}:{" "}
              {Math.round(
                location.accuracy
              )}
              m
            </div>

            <div className="text-green-400">
              {t("locationActive")}
            </div>
          </div>
        )}

        {!loading &&
          !location &&
          error && (
            <div className="mb-3 text-xs text-red-300">
              {error}
            </div>
          )}

        {permissionDenied && (
          <div className="mb-3 text-xs text-yellow-300">
            {t("permissionHint")}
          </div>
        )}

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="mt-3 w-full rounded-xl bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? t("loading")
            : t("refreshLocation")}
        </button>
      </div>
    </div>
  );
}
