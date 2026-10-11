"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/sell", label: "Sell" },
  { href: "/products", label: "Stock" },
  { href: "/sales", label: "Sales" },
];

export function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="no-print border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand">
          Zionshop
        </Link>
        <nav className="flex flex-1 flex-wrap gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                isActive(l.href) ? "bg-brand/10 text-brand" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <form action="/search" className="flex">
          <input name="q" placeholder="Search IMEI or model" className="input w-48 sm:w-56" />
        </form>
        <form action={logout}>
          <button className="text-sm text-muted hover:text-gray-900">Log out</button>
        </form>
      </div>
    </header>
  );
}
