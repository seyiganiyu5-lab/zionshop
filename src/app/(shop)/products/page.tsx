import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { formatMoney, productName } from "@/lib/format";
import { getStockRows } from "@/lib/stock";

export const metadata: Metadata = { title: "Stock" };
export const dynamic = "force-dynamic";

const filters = [
  { key: "all", label: "All" },
  { key: "phones", label: "Phones" },
  { key: "accessories", label: "Accessories" },
  { key: "low", label: "Low stock" },
] as const;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show = "all" } = await searchParams;
  const category = show === "phones" ? "PHONE" : show === "accessories" ? "ACCESSORY" : undefined;
  let rows = await getStockRows(category ? { category } : {});
  if (show === "low") rows = rows.filter((r) => r.isLow);

  const totalUnits = rows.reduce((s, r) => s + r.onHand, 0);
  const totalCost = rows.reduce((s, r) => s + r.stockCost, 0);

  return (
    <>
      <PageHeader
        title="Stock"
        subtitle={`${totalUnits} items on hand · ${formatMoney(totalCost)} at cost`}
        actions={
          <Link href="/products/new" className="btn btn-primary">
            + New product
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/products" : `/products?show=${f.key}`}
            className={`badge px-3 py-1 text-sm ${show === f.key ? "bg-brand text-white" : "bg-white text-gray-700 ring-1 ring-gray-200"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto p-0">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-muted">
            Nothing here yet. <Link href="/products/new" className="text-brand underline">Add your first product</Link>.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th className="text-right">Selling price</th>
                <th className="text-right">On hand</th>
                <th className="text-right">Stock cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td>
                    <Link href={`/products/${r.id}`} className="font-medium text-brand hover:underline">
                      {productName(r)}
                    </Link>
                  </td>
                  <td className="text-muted">{r.category === "PHONE" ? "Phone" : "Accessory"}</td>
                  <td className="text-right">{formatMoney(r.sellPrice)}</td>
                  <td className="text-right">
                    <span className={r.isLow ? "font-semibold text-warning" : ""}>{r.onHand}</span>
                    {r.isLow && <span className="ml-1 badge bg-amber-100 text-amber-800">Low</span>}
                  </td>
                  <td className="text-right">{formatMoney(r.stockCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
