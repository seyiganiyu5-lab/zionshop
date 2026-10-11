"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ActionForm, type FormResult } from "@/components/ActionForm";
import { useI18n } from "@/components/I18nProvider";
import { SubmitButton } from "@/components/SubmitButton";

export type UnitRow = {
  id: string;
  imei: string;
  condition: "NEW" | "USED" | "REFURBISHED";
  costPrice: number;
  supplier: string | null;
  notes: string | null;
  sale: { id: string; number: number; price: number; date: string } | null;
};

type Action = (prev: FormResult, formData: FormData) => Promise<FormResult>;

export function UnitsTable({
  units,
  updateUnit,
  removeUnits,
}: {
  units: UnitRow[];
  updateUnit: (unitId: string, prev: FormResult, formData: FormData) => Promise<FormResult>;
  removeUnits: Action;
}) {
  const { t, fmt } = useI18n();
  const p = t.product;
  const bulkFormId = useId();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const inStockIds = units.filter((u) => !u.sale).map((u) => u.id);
  const allSelected = inStockIds.length > 0 && inStockIds.every((id) => selected.has(id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // A removed phone disappears from the list, so drop it from the selection too.
  const visibleSelected = [...selected].filter((id) => inStockIds.includes(id));

  return (
    <>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  aria-label={p.selectAll}
                  title={p.selectAll}
                  checked={allSelected}
                  disabled={inStockIds.length === 0}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(inStockIds))}
                  className="accent-brand"
                />
              </th>
              <th>{p.imei}</th>
              <th>{p.condition}</th>
              <th className="text-right">{p.cost}</th>
              <th>{p.status}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) =>
              editing === u.id ? (
                <tr key={u.id} className="bg-surface-2">
                  <td colSpan={6}>
                    <ActionForm action={updateUnit.bind(null, u.id)} onSuccess={() => setEditing(null)} className="grid gap-3 py-2 sm:grid-cols-2 lg:grid-cols-3">
                      <label>
                        <span className="label">{p.imei}</span>
                        <input name="imei" required defaultValue={u.imei} inputMode="numeric" maxLength={20} className="input font-mono" />
                      </label>
                      <label>
                        <span className="label">{p.condition}</span>
                        <select name="condition" defaultValue={u.condition} className="input">
                          <option value="NEW">{t.condition.NEW}</option>
                          <option value="USED">{t.condition.USED}</option>
                          <option value="REFURBISHED">{t.condition.REFURBISHED}</option>
                        </select>
                      </label>
                      <label>
                        <span className="label">{p.costEach}</span>
                        <input name="costPrice" type="number" min={0} step={1} required defaultValue={u.costPrice} className="input" />
                      </label>
                      <label>
                        <span className="label">
                          {p.supplier} ({t.common.optional})
                        </span>
                        <input name="supplier" maxLength={100} defaultValue={u.supplier ?? ""} className="input" />
                      </label>
                      <label className="lg:col-span-2">
                        <span className="label">
                          {p.notes} ({t.common.optional})
                        </span>
                        <input name="notes" maxLength={300} defaultValue={u.notes ?? ""} className="input" />
                      </label>
                      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
                        <SubmitButton>{p.saveUnit}</SubmitButton>
                        <button type="button" onClick={() => setEditing(null)} className="btn btn-secondary">
                          {p.cancel}
                        </button>
                      </div>
                    </ActionForm>
                  </td>
                </tr>
              ) : (
                <tr key={u.id} className={selected.has(u.id) ? "bg-brand-soft" : undefined}>
                  <td>
                    {!u.sale && (
                      <input
                        type="checkbox"
                        name="unitId"
                        value={u.id}
                        form={bulkFormId}
                        checked={selected.has(u.id)}
                        onChange={() => toggle(u.id)}
                        aria-label={u.imei}
                        className="accent-brand"
                      />
                    )}
                  </td>
                  <td className="font-mono">
                    {u.imei}
                    {(u.supplier || u.notes) && (
                      <div className="font-sans text-xs text-muted">
                        {[u.supplier && p.from(u.supplier), u.notes].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </td>
                  <td>{t.condition[u.condition]}</td>
                  <td className="text-right">{fmt.money(u.costPrice)}</td>
                  <td>
                    {u.sale ? (
                      <Link href={`/sales/${u.sale.id}`} className="link text-sm">
                        {p.soldFor(u.sale.number, fmt.money(u.sale.price))}
                        <div className="text-xs text-muted">{u.sale.date}</div>
                      </Link>
                    ) : (
                      <span className="badge badge-success">{t.common.inStock}</span>
                    )}
                  </td>
                  <td className="text-right">
                    {u.sale ? (
                      <span className="text-xs text-muted" title={p.soldLocked}>
                        🔒
                      </span>
                    ) : (
                      <button type="button" onClick={() => setEditing(u.id)} className="link text-sm">
                        {p.edit}
                      </button>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {inStockIds.length > 0 && (
        <ActionForm id={bulkFormId} action={removeUnits} onSuccess={() => setSelected(new Set())} confirm={p.removeSelectedConfirm(visibleSelected.length)} className="mt-3">
          <button className="btn btn-danger" disabled={visibleSelected.length === 0}>
            {p.removeSelected(visibleSelected.length)}
          </button>
        </ActionForm>
      )}
    </>
  );
}
