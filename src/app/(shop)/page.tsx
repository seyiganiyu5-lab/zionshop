import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney, productName } from "@/lib/format";
import { saleProfit } from "@/lib/sales";
import { getStockRows } from "@/lib/stock";
import { startOfShopDay } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = startOfShopDay();
  const monthAgo = new Date(today.getTime() - 29 * 86_400_000);

  const [stock, todayItems, todaySales, monthItems, recent] = await Promise.all([
    getStockRows(),
    db.saleItem.findMany({ where: { sale: { createdAt: { gte: today } } }, select: { quantity: true, unitPrice: true, costPrice: true } }),
    db.sale.count({ where: { createdAt: { gte: today } } }),
    db.saleItem.findMany({ where: { sale: { createdAt: { gte: monthAgo } } }, select: { quantity: true, unitPrice: true, costPrice: true } }),
    db.sale.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { items: { include: { product: true } } } }),
  ]);

  const revenue = (items: typeof todayItems) => items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const phonesInStock = stock.filter((s) => s.category === "PHONE").reduce((s, r) => s + r.onHand, 0);
  const stockCost = stock.reduce((s, r) => s + r.stockCost, 0);
  const low = stock.filter((s) => s.isLow);

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <Link href="/products/new" className="btn btn-secondary">
              + Product
            </Link>
            <Link href="/sell" className="btn btn-primary">
              + New sale
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Today's sales" value={formatMoney(revenue(todayItems))} note={`${todaySales} sale${todaySales === 1 ? "" : "s"}`} />
        <Stat label="Today's profit" value={formatMoney(saleProfit(todayItems))} />
        <Stat label="Last 30 days" value={formatMoney(revenue(monthItems))} note={`${formatMoney(saleProfit(monthItems))} profit`} />
        <Stat label="Phones in stock" value={String(phonesInStock)} note={`${formatMoney(stockCost)} total stock at cost`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Running low</h2>
            <Link href="/products?show=low" className="text-sm text-brand hover:underline">
              See all
            </Link>
          </div>
          {low.length === 0 ? (
            <p className="text-sm text-muted">Nothing is running low.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {low.slice(0, 8).map((p) => (
                <li key={p.id} className="flex justify-between py-2 text-sm">
                  <Link href={`/products/${p.id}`} className="hover:underline">
                    {productName(p)}
                  </Link>
                  <span className={p.onHand === 0 ? "font-semibold text-danger" : "font-semibold text-warning"}>
                    {p.onHand === 0 ? "Out of stock" : `${p.onHand} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent sales</h2>
            <Link href="/sales" className="text-sm text-brand hover:underline">
              See all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">
              No sales yet. <Link href="/sell" className="text-brand underline">Record one</Link>.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent.map((s) => (
                <li key={s.id} className="py-2 text-sm">
                  <Link href={`/sales/${s.id}`} className="flex justify-between gap-3 hover:underline">
                    <span className="min-w-0 truncate">
                      #{s.number} · {s.items.map((i) => productName(i.product)).join(", ")}
                    </span>
                    <span className="font-medium whitespace-nowrap">{formatMoney(s.total)}</span>
                  </Link>
                  <div className="text-xs text-muted">{formatDateTime(s.createdAt)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card">
      <div className="text-sm text-muted">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {note && <div className="text-xs text-muted">{note}</div>}
    </div>
  );
}
