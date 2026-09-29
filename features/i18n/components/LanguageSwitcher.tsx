"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { locales, type Locale } from "../config";
import { setCookie } from "../utils/cookies";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("Language");

  function changeLocale(nextLocale: Locale) {
    if (nextLocale === locale) return;
    setCookie("NEXT_LOCALE", nextLocale);
    router.refresh();
  }

  // Set cookie once on client mount so the initial page render uses it
  useEffect(() => {
    const current = typeof window !== "undefined" && window.location.search.includes("lang=");
    if (current) {
      setCookie("NEXT_LOCALE", locale);
    }
  }, []);

  return (
    <div className="flex items-center gap-1 rounded-full bg-black/85 p-1 text-white shadow-lg backdrop-blur">
      {locales.map((item) => {
        const active = item === locale;
        return (
          <button
            key={item}
            type="button"
            onClick={() => changeLocale(item)}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              active
                ? "bg-white text-black"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            {t(item)}
          </button>
        );
      })}
    </div>
  );
}
