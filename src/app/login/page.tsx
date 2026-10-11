import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import { LanguageSwitch, ThemeToggle } from "@/components/Preferences";
import { getCurrentSession } from "@/lib/auth/session";
import { getI18n, getTheme } from "@/lib/i18n/server";
import { LoginForm } from "./LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.title };
}

export default async function LoginPage() {
  if (await getCurrentSession()) redirect("/");
  const [{ t }, theme] = await Promise.all([getI18n(), getTheme()]);

  return (
    <main className="flex min-h-screen flex-col p-4">
      <div className="flex justify-end gap-2">
        <LanguageSwitch />
        <ThemeToggle initial={theme} />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="card w-full max-w-sm space-y-6 p-7">
          <div className="flex flex-col items-center text-center">
            <LogoMark size={56} />
            <h1 className="mt-3 text-2xl font-bold">Zionshop</h1>
            <p className="text-sm text-muted">{t.auth.subtitle}</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
