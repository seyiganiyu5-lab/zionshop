"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, THEME_COOKIE, type Locale, type Theme } from "@/lib/i18n";
import { useI18n } from "./I18nProvider";

function setPrefCookie(name: string, value: string) {
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax${secure}`;
}

const order: Theme[] = ["system", "light", "dark"];

function ThemeIcon({ theme }: { theme: Theme }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (theme === "light")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  if (theme === "dark")
    return (
      <svg {...common}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export function ThemeToggle({ initial }: { initial: Theme }) {
  const { t } = useI18n();
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
  }, [theme]);

  const next = order[(order.indexOf(theme) + 1) % order.length];
  return (
    <button
      type="button"
      onClick={() => {
        setPrefCookie(THEME_COOKIE, next);
        setTheme(next);
      }}
      className="icon-btn"
      title={`${t.theme.label}: ${t.theme[theme]}`}
      aria-label={`${t.theme.label}: ${t.theme[theme]}`}
    >
      <ThemeIcon theme={theme} />
    </button>
  );
}

export function LanguageSwitch() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const choose = (l: Locale) => {
    if (l === locale) return;
    setPrefCookie(LOCALE_COOKIE, l);
    router.refresh();
  };
  return (
    <div role="group" aria-label={t.language.label} className="flex overflow-hidden rounded-lg border border-line text-xs font-semibold">
      {(["en", "fr"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={l === locale}
          className={`px-2 py-1.5 ${l === locale ? "bg-brand text-white" : "text-muted hover:bg-surface-2"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
