import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/PageHeader";
import { productName } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { getStockRows } from "@/lib/stock";
import { deleteProduct, restoreProduct } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.stock.title };
}

const filterKeys = ["all", "phones", "accessories", "low", "archived"] as const;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { t, fmt } = await getI18n();
  const { show = "all" } = await searchParams;
  const category = show === "phones" ? "PHONE" : show === "accessories" ? "ACCESSORY" : undefined;
  const archived = show === "archived";
  let rows = await getStockRows(archived ? { archived: true } : category ? { category } : {});
  if (show === "low") rows = rows.filter((r) => r.isLow);

  const totalUnits = rows.reduce((s, r) => s + r.onHand, 0);
  const totalCost = rows.reduce((s, r) => s + r.stockCost, 0);

  return (
    <>
      <PageHeader
        title={t.stock.title}
        subtitle={t.stock.summary(totalUnits, fmt.money(totalCost))}
        actions={
          <>
            <a href="/reports/stock" className="btn btn-secondary" download>
              ⬇ Excel
            </a>
            <Link href="/products/new" className="btn btn-primary">
              {t.common.newProduct}
            </Link>
          </>
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
            {archived ? (
              t.stock.archivedEmpty
            ) : (
              <>
                {t.stock.empty}{" "}
                <Link href="/products/new" className="link">
                  {t.stock.addFirst}
                </Link>
              </>
            )}
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
                <th className="text-right">{t.stock.actions}</th>
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
                  <td>
                    <div className="flex justify-end gap-3 text-sm whitespace-nowrap">
                      {archived ? (
                        <ActionForm action={restoreProduct.bind(null, r.id)}>
                          <button className="link">{t.product.restore}</button>
                        </ActionForm>
                      ) : (
                        <>
                          <Link href={`/products/${r.id}#details`} className="link">
                            {t.stock.edit}
                          </Link>
                          <ActionForm
                            action={deleteProduct.bind(null, r.id)}
                            confirm={r.hasSales ? t.product.deleteConfirmSales(r.onHand) : t.product.deleteConfirmNoSales(r.onHand)}
                          >
                            <button className="text-danger hover:underline">{t.common.delete}</button>
                          </ActionForm>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
