import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/PageHeader";
import { ProductFields } from "@/components/ProductFields";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { productName } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import {
  addUnits,
  deleteProduct,
  receiveAccessories,
  removeUnits,
  restoreProduct,
  setAccessoryQuantity,
  updateProduct,
  updateUnit,
} from "../actions";
import { UnitsTable, type UnitRow } from "./UnitsTable";

async function getProduct(id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      _count: { select: { saleItems: true } },
      units: {
        orderBy: [{ status: "asc" }, { addedAt: "desc" }],
        include: { saleItem: { select: { unitPrice: true, sale: { select: { id: true, number: true, createdAt: true } } } } },
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const product = await getProduct((await params).id);
  return { title: product ? productName(product) : "Zionshop" };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, { t, fmt }] = await Promise.all([getProduct(id), getI18n()]);
  if (!product) notFound();
  const p = t.product;
  const optional = (label: string) => `${label} (${t.common.optional})`;

  const isPhone = product.category === "PHONE";
  const tracksImei = product.trackImei;
  const inStock = product.units.filter((u) => u.status === "IN_STOCK");
  const onHand = tracksImei ? inStock.length : product.quantity;
  const hasSales = product._count.saleItems > 0;
  const deleteAction = (
    <ActionForm
      action={deleteProduct.bind(null, product.id)}
      confirm={hasSales ? p.deleteConfirmSales(onHand) : p.deleteConfirmNoSales(onHand)}
    >
      <button className="btn btn-danger">{p.deleteProduct}</button>
    </ActionForm>
  );
  const unitRows: UnitRow[] = product.units.map((u) => ({
    id: u.id,
    imei: u.imei,
    condition: u.condition,
    costPrice: u.costPrice,
    supplier: u.supplier,
    notes: u.notes,
    sale: u.saleItem
      ? {
          id: u.saleItem.sale.id,
          number: u.saleItem.sale.number,
          price: u.saleItem.unitPrice,
          date: fmt.dateTime(u.saleItem.sale.createdAt),
        }
      : null,
  }));

  return (
    <>
      <PageHeader
        title={productName(product)}
        subtitle={`${p.subtitle(isPhone ? t.common.phone : t.common.accessory, onHand, fmt.money(product.sellPrice))} · ${
          tracksImei ? p.byImei : p.byQuantity
        }`}
        actions={
          <>
            <Link href="/products" className="btn btn-secondary">
              {p.backToStock}
            </Link>
            {!product.archived && (
              <a href="#details" className="btn btn-secondary">
                {p.editDetails}
              </a>
            )}
            {!product.archived && deleteAction}
          </>
        }
      />

      {product.archived && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4">
          <p className="text-sm text-fg-2">{p.archivedBanner}</p>
          <ActionForm action={restoreProduct.bind(null, product.id)}>
            <SubmitButton>{p.restore}</SubmitButton>
          </ActionForm>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="order-2 space-y-6 lg:order-1">
          {tracksImei ? (
            <section className="card">
              <h2 className="mb-3 font-semibold">{p.phones(inStock.length)}</h2>
              {product.units.length === 0 ? (
                <p className="text-sm text-muted">{p.noPhones}</p>
              ) : (
                <UnitsTable units={unitRows} updateUnit={updateUnit} removeUnits={removeUnits.bind(null, product.id)} />
              )}
            </section>
          ) : (
            <section className="card">
              <h2 className="mb-1 font-semibold">{p.stockHeading}</h2>
              <p className="mb-4 text-sm text-muted">{p.accessorySummary(product.quantity, fmt.money(product.costPrice))}</p>
              {!product.archived && (
              <ActionForm action={setAccessoryQuantity.bind(null, product.id)} className="flex flex-wrap items-end gap-2">
                <label className="min-w-48 flex-1">
                  <span className="label">{p.correctCount}</span>
                  <input name="quantity" type="number" min={0} step={1} defaultValue={product.quantity} className="input" />
                </label>
                <SubmitButton className="btn btn-secondary">{p.updateCount}</SubmitButton>
              </ActionForm>
              )}
            </section>
          )}

          <section id="details" className="card scroll-mt-4">
            <h2 className="mb-3 font-semibold">{p.details}</h2>
            <ActionForm action={updateProduct.bind(null, product.id)} className="space-y-4">
              <ProductFields t={t} product={product} />
              {isPhone && (
                <label className="flex items-start gap-2 rounded-lg border border-line p-3 text-sm">
                  <input type="hidden" name="trackImeiShown" value="1" />
                  <input type="checkbox" name="trackImei" defaultChecked={tracksImei} className="mt-0.5 accent-brand" />
                  <span>
                    <span className="font-medium">{p.trackImei}</span>
                    <span className="block text-xs text-muted">{p.trackImeiHelp}</span>
                  </span>
                </label>
              )}
              <SubmitButton>{t.common.save}</SubmitButton>
            </ActionForm>
          </section>

          {!product.archived && (
            <section className="card border-danger/30">
              <h2 className="mb-1 font-semibold">{p.deleteProduct}</h2>
              <p className="mb-3 text-sm text-muted">{hasSales ? p.deleteHelpSales : p.deleteHelpNoSales}</p>
              {deleteAction}
            </section>
          )}
        </div>

        <aside className="order-1 lg:order-2">
          {product.archived ? null : tracksImei ? (
            <ActionForm action={addUnits.bind(null, product.id)} resetOnSuccess className="card space-y-4 lg:sticky lg:top-4">
              <h2 className="font-semibold">{p.addPhones}</h2>
              <label className="block">
                <span className="label">{p.imeiList}</span>
                <textarea name="imeis" rows={4} required placeholder={p.imeiPlaceholder} className="input font-mono" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="label">{p.condition}</span>
                  <select name="condition" className="input" defaultValue="NEW">
                    <option value="NEW">{t.condition.NEW}</option>
                    <option value="USED">{t.condition.USED}</option>
                    <option value="REFURBISHED">{t.condition.REFURBISHED}</option>
                  </select>
                </label>
                <label>
                  <span className="label">{p.costEach}</span>
                  <input name="costPrice" type="number" min={0} step={1} required className="input" />
                </label>
              </div>
              <label className="block">
                <span className="label">{optional(p.supplier)}</span>
                <input name="supplier" maxLength={100} className="input" />
              </label>
              <label className="block">
                <span className="label">{optional(p.notes)}</span>
                <input name="notes" maxLength={300} placeholder={p.notesPlaceholder} className="input" />
              </label>
              <SubmitButton>{p.addToStock}</SubmitButton>
            </ActionForm>
          ) : (
            <ActionForm action={receiveAccessories.bind(null, product.id)} resetOnSuccess className="card space-y-4 lg:sticky lg:top-4">
              <h2 className="font-semibold">{p.receiveStock}</h2>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="label">{p.quantity}</span>
                  <input name="quantity" type="number" min={1} step={1} required className="input" />
                </label>
                <label>
                  <span className="label">{p.costEach}</span>
                  <input name="costPrice" type="number" min={0} step={1} required className="input" />
                </label>
              </div>
              <SubmitButton>{p.addToStock}</SubmitButton>
            </ActionForm>
          )}
        </aside>
      </div>
    </>
  );
}
