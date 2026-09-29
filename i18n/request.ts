import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  defaultLocale,
  locales,
  type Locale,
} from "../features/i18n/config";

function isValidLocale(
  value: string | undefined
): value is Locale {
  return !!value && locales.includes(value as Locale);
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();

  const cookieLocale =
    cookieStore.get("NEXT_LOCALE")?.value;

  const locale: Locale = isValidLocale(cookieLocale)
    ? cookieLocale
    : defaultLocale;

  const messages =
    locale === "fa"
      ? (await import("../messages/fa.json")).default
      : (await import("../messages/en.json")).default;

  return {
    locale,
    messages,
  };
});
