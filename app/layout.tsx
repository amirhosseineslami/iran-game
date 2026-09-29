import type { Metadata } from "next";
import {
  getLocale,
  getMessages,
} from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";

import "./globals.css";

export const metadata: Metadata = {
  title: "Iran Game",
  description:
    "A real-world game built on the map of Iran.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  const direction =
    locale === "fa" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={direction}
    >
      <body>
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
        >
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
