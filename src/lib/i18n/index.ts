import { en } from "./en";
import { fr } from "./fr";

export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];
export const dictionaries = { en, fr } as const;

export const LOCALE_COOKIE = "lang";
export const THEME_COOKIE = "theme";
export type Theme = "light" | "dark" | "system";

export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}

const intlLocale = { en: "en-NG", fr: "fr-FR" } as const;
const timeZone = process.env.SHOP_TIMEZONE || "Africa/Lagos";

export function makeFormatters(locale: Locale, currency: string) {
  const money = new Intl.NumberFormat(intlLocale[locale], {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  });
  const dateTime = new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: "medium", timeStyle: "short", timeZone });
  return {
    money: (amount: number) => money.format(amount),
    dateTime: (date: Date) => dateTime.format(date),
  };
}
