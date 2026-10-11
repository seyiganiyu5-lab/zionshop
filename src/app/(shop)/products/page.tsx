import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { productName } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { getStockRows } from "@/lib/stock";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.stock.title };
}

const filterKeys = ["all", "phones", "accessories", "low"] as const;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { t, fmt } = await getI18n();
  const { show = "all" } = await searchParams;
  const category = show === "phones" ? "PHONE" : show === "accessories" ? "ACCESSORY" : undefined;
  let rows = await getStockRows(category ? { category } : {});
  if (show === "low") rows = rows.filter((r) => r.isLow);

  const totalUnits = rows.reduce((s, r) => s + r.onHand, 0);
  const totalCost = rows.reduce((s, r) => s + r.stockCost, 0);

  return (
    <>
      <PageHeader
        title={t.stock.title}
        subtitle={t.stock.summary(totalUnits, fmt.money(totalCost))}
        actions={
          <Link href="/products/new" className="btn btn-primary">
            {t.common.newProduct}
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {filterKeys.map((key) => (
          <Link key={key} href={key === "all" ? "/products" : `/products?show=${key}`} className={show === key ? "pill-active" : "pill"}>
            {t.stock.filters[key]}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto p-0">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-muted">
            {t.stock.empty}{" "}
            <Link href="/products/new" className="link">
              {t.stock.addFirst}
            </Link>
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t.stock.product}</th>
                <th>{t.stock.type}</th>
                <th className="text-right">{t.stock.sellPrice}</th>
                <th className="text-right">{t.stock.onHand}</th>
                <th className="text-right">{t.stock.stockCost}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="row-hover">
                  <td>
                    <Link href={`/products/${r.id}`} className="link font-medium">
                      {productName(r)}
                    </Link>
                  </td>
                  <td className="text-muted">{r.category === "PHONE" ? t.common.phone : t.common.accessory}</td>
                  <td className="text-right">{fmt.money(r.sellPrice)}</td>
                  <td className="text-right whitespace-nowrap">
                    <span className={r.isLow ? "font-semibold text-warning" : ""}>{r.onHand}</span>
                    {r.isLow && <span className="ml-1 badge badge-warning">{t.stock.low}</span>}
                  </td>
                  <td className="text-right">{fmt.money(r.stockCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
