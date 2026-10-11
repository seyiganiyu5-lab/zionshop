import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { cleanImei } from "@/lib/imei";
import { productName } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.search.title };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { t, fmt } = await getI18n();
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const digits = cleanImei(q);
  const words = q.split(/\s+/).filter(Boolean);

  const [units, products] =
    q.length < 2
      ? [[], []]
      : await Promise.all([
          /^\d{4,}$/.test(digits)
            ? db.unit.findMany({
                where: { imei: { contains: digits } },
                include: { product: true, saleItem: { include: { sale: true } } },
                take: 50,
              })
            : Promise.resolve([]),
          db.product.findMany({
            where: {
              AND: words.map((w) => ({
                OR: [
                  { brand: { contains: w, mode: "insensitive" as const } },
                  { model: { contains: w, mode: "insensitive" as const } },
                  { storage: { contains: w, mode: "insensitive" as const } },
                  { color: { contains: w, mode: "insensitive" as const } },
                ],
              })),
            },
            take: 50,
            orderBy: [{ brand: "asc" }, { model: "asc" }],
          }),
        ]);

  return (
    <>
      <PageHeader title={t.search.title} subtitle={q ? t.search.resultsFor(q) : t.search.hint} />

      {units.length > 0 && (
        <section className="card mb-6 overflow-x-auto p-0">
          <h2 className="px-4 pt-4 font-semibold">{t.search.phonesByImei}</h2>
          <table className="table">
            <tbody>
              {units.map((u) => (
                <tr key={u.id}>
                  <td className="font-mono">{u.imei}</td>
                  <td>
                    <Link href={`/products/${u.productId}`} className="link">
                      {productName(u.product)}
                    </Link>
                    <div className="text-xs text-muted">{t.search.costNote(t.condition[u.condition], fmt.money(u.costPrice))}</div>
                  </td>
                  <td>
                    {u.saleItem ? (
                      <Link href={`/sales/${u.saleItem.saleId}`} className="link">
                        {t.search.soldIn(u.saleItem.sale.number)}
                      </Link>
                    ) : (
                      <span className="badge badge-success">{t.common.inStock}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {products.length > 0 && (
        <section className="card p-0">
          <h2 className="px-4 pt-4 font-semibold">{t.search.products}</h2>
          <ul className="divide-y divide-line">
            {products.map((p) => (
              <li key={p.id}>
                <Link href={`/products/${p.id}`} className="flex justify-between px-4 py-3 hover:bg-surface-2">
                  <span>{productName(p)}</span>
                  <span className="text-sm text-muted">{fmt.money(p.sellPrice)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {q.length >= 2 && units.length === 0 && products.length === 0 && <p className="text-muted">{t.search.nothing}</p>}
    </>
  );
}
