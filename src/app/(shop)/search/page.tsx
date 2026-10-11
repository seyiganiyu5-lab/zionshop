import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { cleanImei } from "@/lib/imei";
import { conditionLabel, formatMoney, productName } from "@/lib/format";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
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
      <PageHeader title="Search" subtitle={q ? `Results for "${q}"` : "Type an IMEI or model in the search box."} />

      {units.length > 0 && (
        <section className="card mb-6 overflow-x-auto p-0">
          <h2 className="px-4 pt-4 font-semibold">Phones by IMEI</h2>
          <table className="table">
            <tbody>
              {units.map((u) => (
                <tr key={u.id}>
                  <td className="font-mono">{u.imei}</td>
                  <td>
                    <Link href={`/products/${u.productId}`} className="text-brand hover:underline">
                      {productName(u.product)}
                    </Link>
                    <div className="text-xs text-muted">{conditionLabel[u.condition]} · cost {formatMoney(u.costPrice)}</div>
                  </td>
                  <td>
                    {u.saleItem ? (
                      <Link href={`/sales/${u.saleItem.saleId}`} className="text-brand hover:underline">
                        Sold in #{u.saleItem.sale.number}
                      </Link>
                    ) : (
                      <span className="badge bg-green-100 text-green-800">In stock</span>
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
          <h2 className="px-4 pt-4 font-semibold">Products</h2>
          <ul className="divide-y divide-gray-100">
            {products.map((p) => (
              <li key={p.id}>
                <Link href={`/products/${p.id}`} className="flex justify-between px-4 py-3 hover:bg-gray-50">
                  <span>{productName(p)}</span>
                  <span className="text-sm text-muted">{formatMoney(p.sellPrice)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {q.length >= 2 && units.length === 0 && products.length === 0 && <p className="text-muted">Nothing found.</p>}
    </>
  );
}
