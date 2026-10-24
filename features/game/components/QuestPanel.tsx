"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  X,
  Star,
  CheckCircle,
  ChevronRight,
  Target,
  Trophy,
  Shield,
  Map as MapIcon,
  Crown,
  Compass,
  Navigation,
  Gift,
  type LucideIcon,
} from "lucide-react";
import {
  QUEST_DEFINITIONS,
  type QuestProgress,
} from "@/features/game/services/quests";

/**
 * Quest panel — bottom sheet showing active, available and completed quests
 * with progress bars and reward claiming. All text is localized; icons map
 * from the data-driven icon names in the quest definitions.
 */

const ICONS: Record<string, LucideIcon> = {
  Shield,
  Map: MapIcon,
  Crown,
  Compass,
  Navigation,
  Star,
  Trophy,
  Target,
};

function QuestIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Target;
  return <Icon className={className} aria-hidden="true" />;
}

interface QuestPanelProps {
  open: boolean;
  onClose: () => void;
  quests: QuestProgress[];
  activeQuestId: string | null;
  onSetActive: (questId: string | null) => void;
  onClaimReward: (questId: string) => number;
}

export default function QuestPanel({
  open,
  onClose,
  quests,
  activeQuestId,
  onSetActive,
  onClaimReward,
}: QuestPanelProps) {
  const t = useTranslations("Game");
  const locale = useLocale();
  const [claimedFlash, setClaimedFlash] = useState<string | null>(null);

  if (!open) return null;

  const byId = new Map(quests.map((q) => [q.questId, q]));
  const done = QUEST_DEFINITIONS.filter((d) => byId.get(d.id)?.completed);
  const todo = QUEST_DEFINITIONS.filter((d) => !byId.get(d.id)?.completed);
  const rewardable = done.filter((d) => !byId.get(d.id)?.claimed);

  const handleClaim = (questId: string) => {
    onClaimReward(questId);
    setClaimedFlash(questId);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center pointer-events-none">
      <div className="w-full max-w-lg px-3 sm:px-4 pb-3 sm:pb-4 pointer-events-auto">
        <div
          className="glass-card rounded-t-3xl p-4 sm:p-5 shadow-2xl animate-slide-up max-h-[70vh] overflow-y-auto"
          role="dialog"
          aria-label={t("questsTitle")}
        >
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="text-game-title flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" aria-hidden="true" />
                {t("questsTitle")}
                {rewardable.length > 0 && (
                  <span
                    className="min-w-5 h-5 px-1 rounded-full bg-amber-500 text-[10px] font-bold text-white flex items-center justify-center"
                    aria-label={`${rewardable.length} ${t("questCompleted")}`}
                  >
                    {rewardable.length}
                  </span>
                )}
              </div>
              <div className="text-game-label mt-0.5">{t("questsSubtitle")}</div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {done.length === 0 && todo.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">{t("questEmpty")}</p>
          )}

          {rewardable.length > 0 && (
            <section aria-label={t("questCompleted")} className="mb-4">
              <h2 className="text-game-label mb-2">{t("questCompleted")}</h2>
              <ul className="space-y-2">
                {rewardable.map((def) => (
                  <li
                    key={def.id}
                    className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                      <QuestIcon name={def.icon} className="w-4 h-4 text-amber-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {locale === "fa" ? def.titleFa : def.title}
                      </div>
                      <div className="text-[11px] text-amber-300/90 flex items-center gap-1">
                        <Gift className="w-3 h-3" aria-hidden="true" />+{def.xpReward} XP
                      </div>
                    </div>
                    {claimedFlash === def.id ? (
                      <span className="text-xs font-semibold text-green-300 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" aria-hidden="true" />
                        {t("questRewardClaimed")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleClaim(def.id)}
                        className="rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] px-4 py-2.5 text-xs font-bold text-white transition-all min-h-[44px]"
                        aria-label={`${t("questClaimReward")}: ${locale === "fa" ? def.titleFa : def.title}`}
                      >
                        {t("questClaimReward")}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {todo.length > 0 && (
            <section aria-label={t("questAvailable")} className="mb-4">
              <h2 className="text-game-label mb-2">{t("questAvailable")}</h2>
              <ul className="space-y-2">
                {todo.map((def) => {
                  const progress = byId.get(def.id);
                  const current = progress?.current ?? 0;
                  const pct = Math.min(100, Math.round((current / def.target) * 100));
                  const isActive = activeQuestId === def.id;
                  return (
                    <li
                      key={def.id}
                      className={`rounded-2xl border p-3 transition-colors ${
                        isActive ? "border-amber-500/40 bg-white/10" : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                          <QuestIcon name={def.icon} className="w-4 h-4 text-gray-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">
                            {locale === "fa" ? def.titleFa : def.title}
                          </div>
                          <div className="text-[11px] text-gray-400 truncate">
                            {locale === "fa" ? def.descriptionFa : def.description}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSetActive(isActive ? null : def.id)}
                          className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all min-h-[44px] min-w-[44px] ${
                            isActive
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-white/10 text-white/80 hover:bg-white/20"
                          }`}
                          aria-label={`${isActive ? t("questTracking") : t("questSetActive")}: ${locale === "fa" ? def.titleFa : def.title}`}
                        >
                          {isActive ? t("questTracking") : t("questSetActive")}
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div
                          className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden"
                          role="progressbar"
                          aria-valuenow={current}
                          aria-valuemin={0}
                          aria-valuemax={def.target}
                          aria-label={`${locale === "fa" ? def.titleFa : def.title} ${t("questProgress", { current, target: def.target })}`}
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 tabular-nums shrink-0">
                          {t("questProgress", { current, target: def.target })}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {done.filter((d) => byId.get(d.id)?.claimed).length > 0 && (
            <section aria-label={t("questCompleted")}>
              <h2 className="text-game-label mb-2">{t("questCompleted")}</h2>
              <ul className="space-y-2">
                {done
                  .filter((d) => byId.get(d.id)?.claimed)
                  .map((def) => (
                    <li
                      key={def.id}
                      className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 flex items-center gap-3 opacity-70"
                    >
                      <div className="w-9 h-9 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-4 h-4 text-green-400" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-300 truncate">
                          {locale === "fa" ? def.titleFa : def.title}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600" aria-hidden="true" />
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

