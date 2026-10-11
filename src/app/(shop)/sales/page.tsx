import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney, paymentLabel, productName } from "@/lib/format";
import { saleProfit } from "@/lib/sales";
import { startOfShopDay } from "@/lib/time";

export const metadata: Metadata = { title: "Sales" };
export const dynamic = "force-dynamic";

const ranges = [
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "all", label: "All time", days: null },
] as const;

const PAGE_LIMIT = 200;

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
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
  const revenue = totals._sum.total ?? 0;
  const profit = saleProfit(items);

  return (
    <>
      <PageHeader
        title="Sales"
        actions={
          <Link href="/sell" className="btn btn-primary">
            + New sale
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {ranges.map((r) => (
          <Link
            key={r.key}
            href={`/sales?range=${r.key}`}
            className={`badge px-3 py-1 text-sm ${r.key === range.key ? "bg-brand text-white" : "bg-white text-gray-700 ring-1 ring-gray-200"}`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Sales" value={String(totals._count._all)} />
        <Stat label="Revenue" value={formatMoney(revenue)} />
        <Stat label="Profit" value={formatMoney(profit)} />
      </div>

      <div className="card overflow-x-auto p-0">
        {sales.length === 0 ? (
          <p className="p-6 text-center text-muted">No sales in this period.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Items</th>
                <th>Payment</th>
                <th className="text-right">Total</th>
                <th className="text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td>
                    <Link href={`/sales/${s.id}`} className="font-medium text-brand hover:underline">
                      #{s.number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{formatDateTime(s.createdAt)}</td>
                  <td>
                    {s.items.map((i) => (
                      <div key={i.id}>
                        {i.quantity > 1 && `${i.quantity} × `}
                        {productName(i.product)}
                      </div>
                    ))}
                    {s.customerName && <div className="text-xs text-muted">{s.customerName}</div>}
                  </td>
                  <td>{paymentLabel[s.paymentMethod]}</td>
                  <td className="text-right">{formatMoney(s.total)}</td>
                  <td className="text-right">{formatMoney(saleProfit(s.items))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {totals._count._all > PAGE_LIMIT && (
        <p className="mt-2 text-sm text-muted">Showing the latest {PAGE_LIMIT}. Totals above include every sale in the period.</p>
      )}
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
