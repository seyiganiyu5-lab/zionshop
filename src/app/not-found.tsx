import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-4">
      <LogoMark size={48} />
      <h1 className="text-2xl font-bold">{t.notFound.title}</h1>
      <Link href="/" className="link">
        {t.notFound.back}
      </Link>
    </main>
  );
}
