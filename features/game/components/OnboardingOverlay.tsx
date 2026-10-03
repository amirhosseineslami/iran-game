"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Shield, Sparkles } from "lucide-react";

interface OnboardingOverlayProps {
  onDismiss: () => void;
}

export default function OnboardingOverlay({ onDismiss }: OnboardingOverlayProps) {
  const t = useTranslations("Game");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if this is the first visit
    const hasSeenOnboarding = localStorage.getItem("iran-game-onboarded");
    if (!hasSeenOnboarding) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("iran-game-onboarded", "true");
    setVisible(false);
    onDismiss();
  };

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-sm w-[calc(100%-2rem)] text-center animate-slide-up">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/30">
          <Sparkles className="w-7 h-7 text-white" />
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-white mb-2">
          {t("title")}
        </h1>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          {t("onboardingText")}
        </p>

        {/* Steps */}
        <div className="space-y-3 mb-6 text-right">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-gray-300">{t("onboardingStep1")}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-gray-300">{t("onboardingStep2")}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-gray-300">{t("onboardingStep3")}</span>
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3.5 font-bold text-white text-sm transition-all hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] shadow-lg shadow-amber-500/25"
        >
          {t("onboardingCta")}
        </button>
      </div>
    </div>
  );
}
