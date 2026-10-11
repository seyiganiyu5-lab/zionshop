import { cache } from "react";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, THEME_COOKIE, dictionaries, isLocale, makeFormatters, type Locale, type Theme } from ".";

export const currency = process.env.NEXT_PUBLIC_CURRENCY || "NGN";

export const getLocale = cache(async (): Promise<Locale> => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  const accept = (await headers()).get("accept-language") ?? "";
  return accept.toLowerCase().startsWith("fr") ? "fr" : "en";
});

export const getI18n = cache(async () => {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale], fmt: makeFormatters(locale, currency) };
});

export async function getTheme(): Promise<Theme> {
  const saved = (await cookies()).get(THEME_COOKIE)?.value;
  return saved === "light" || saved === "dark" ? saved : "system";
}
