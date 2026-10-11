"use client";

import { createContext, useContext, useMemo } from "react";
import { dictionaries, makeFormatters, type Locale } from "@/lib/i18n";

const I18nContext = createContext<{ locale: Locale; currency: string }>({ locale: "en", currency: "NGN" });

export function I18nProvider({
  locale,
  currency,
  children,
}: {
  locale: Locale;
  currency: string;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ locale, currency }), [locale, currency]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const { locale, currency } = useContext(I18nContext);
  return useMemo(
    () => ({ locale, t: dictionaries[locale], fmt: makeFormatters(locale, currency) }),
    [locale, currency],
  );
}
