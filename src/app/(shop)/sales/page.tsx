import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { productName } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { saleProfit } from "@/lib/sales";
import { startOfShopDay } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.sales.title };
}

const ranges = [
  { key: "today", days: 1 },
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "all", days: null },
] as const;

const PAGE_LIMIT = 200;

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { t, fmt } = await getI18n();
  const { range: rangeKey = "7d" } = await searchParams;
  const range = ranges.find((r) => r.key === rangeKey) ?? ranges[1];
  const since = range.days ? new Date(startOfShopDay().getTime() - (range.days - 1) * 86_400_000) : undefined;
  const where = since ? { createdAt: { gte: since } } : {};

  const [sales, totals, items] = await Promise.all([
    db.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_LIMIT,
      include: { items: { include: { product: true } } },
    }),
    db.sale.aggregate({ where, _sum: { total: true }, _count: { _all: true } }),
    db.saleItem.findMany({ where: { sale: where }, select: { quantity: true, unitPrice: true, costPrice: true } }),
  ]);

  return (
    <>
      <PageHeader
        title={t.sales.title}
        actions={
          <Link href="/sell" className="btn btn-primary">
            {t.common.newSale}
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {ranges.map((r) => (
          <Link key={r.key} href={`/sales?range=${r.key}`} className={r.key === range.key ? "pill-active" : "pill"}>
            {t.sales.ranges[r.key]}
          </Link>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label={t.sales.count} value={String(totals._count._all)} />
        <Stat label={t.sales.revenue} value={fmt.money(totals._sum.total ?? 0)} />
        <Stat label={t.sales.profit} value={fmt.money(saleProfit(items))} />
      </div>

      <div className="card overflow-x-auto p-0">
        {sales.length === 0 ? (
          <p className="p-6 text-center text-muted">{t.sales.none}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t.sales.date}</th>
                <th>{t.sales.items}</th>
                <th>{t.sell.payment}</th>
                <th className="text-right">{t.sales.total}</th>
                <th className="text-right">{t.sales.profit}</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="row-hover">
                  <td>
                    <Link href={`/sales/${s.id}`} className="link font-medium">
                      #{s.number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{fmt.dateTime(s.createdAt)}</td>
                  <td>
                    {s.items.map((i) => (
                      <div key={i.id}>
                        {i.quantity > 1 && `${i.quantity} × `}
                        {productName(i.product)}
                      </div>
                    ))}
                    {s.customerName && <div className="text-xs text-muted">{s.customerName}</div>}
                  </td>
                  <td>{t.payment[s.paymentMethod]}</td>
                  <td className="text-right">{fmt.money(s.total)}</td>
                  <td className="text-right">{fmt.money(saleProfit(s.items))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {totals._count._all > PAGE_LIMIT && <p className="mt-2 text-sm text-muted">{t.sales.limited(PAGE_LIMIT)}</p>}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="text-sm text-muted">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
