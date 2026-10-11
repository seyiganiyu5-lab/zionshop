import { Nav } from "@/components/Nav";
import { requireUser } from "@/lib/auth/session";
import { getTheme } from "@/lib/i18n/server";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <Nav theme={await getTheme()} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
