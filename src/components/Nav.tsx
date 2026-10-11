"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import type { Theme } from "@/lib/i18n";
import { useI18n } from "./I18nProvider";
import { Logo } from "./Logo";
import { LanguageSwitch, ThemeToggle } from "./Preferences";

export function Nav({ theme }: { theme: Theme }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const links = [
    { href: "/", label: t.nav.dashboard },
    { href: "/sell", label: t.nav.sell },
    { href: "/products", label: t.nav.stock },
    { href: "/sales", label: t.nav.sales },
    { href: "/settings", label: t.nav.settings },
  ];

  return (
    <header className="no-print border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" aria-label="Zionshop">
          <Logo />
        </Link>

        <nav className="hidden flex-1 gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                isActive(l.href) ? "bg-brand-soft text-brand-text" : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <form action="/search" className="hidden lg:block">
            <input name="q" placeholder={t.nav.search} aria-label={t.nav.search} className="input w-56" />
          </form>
          <LanguageSwitch />
          <ThemeToggle initial={theme} />
          <form action={logout} className="hidden md:block">
            <button className="text-sm text-muted hover:text-fg">{t.nav.logout}</button>
          </form>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="icon-btn md:hidden"
            aria-expanded={open}
            aria-label={t.nav.menu}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line px-4 py-3 md:hidden">
          <form action="/search" className="mb-3">
            <input name="q" placeholder={t.nav.search} aria-label={t.nav.search} className="input" />
          </form>
          <nav className="grid gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive(l.href) ? "bg-brand-soft text-brand-text" : "text-fg-2 hover:bg-surface-2"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <form action={logout} className="mt-2 border-t border-line pt-2">
            <button className="px-3 py-2 text-sm text-muted hover:text-fg">{t.nav.logout}</button>
          </form>
        </div>
      )}
    </header>
  );
}
