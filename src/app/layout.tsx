import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/components/I18nProvider";
import { currency, getI18n, getTheme } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Zionshop", template: "%s · Zionshop" },
  description: "Inventory and sales for Zionshop",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d14" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ locale }, theme] = await Promise.all([getI18n(), getTheme()]);
  return (
    <html lang={locale} className={theme === "system" ? undefined : theme} suppressHydrationWarning>
      <body>
        <I18nProvider locale={locale} currency={currency}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
