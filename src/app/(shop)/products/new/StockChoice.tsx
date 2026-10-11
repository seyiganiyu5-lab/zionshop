"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";

/** Type, tracking choice and starting stock for a new product. */
export function StockChoice() {
  const { t } = useI18n();
  const p = t.product;
  const [category, setCategory] = useState<"PHONE" | "ACCESSORY">("PHONE");
  const [trackImei, setTrackImei] = useState(true);
  const counted = category === "ACCESSORY" || !trackImei;

  return (
    <div className="space-y-4">
      <fieldset>
        <span className="label">{p.type}</span>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="category"
              value="PHONE"
              checked={category === "PHONE"}
              onChange={() => setCategory("PHONE")}
              className="accent-brand"
            />
            {t.common.phone}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="category"
              value="ACCESSORY"
              checked={category === "ACCESSORY"}
              onChange={() => setCategory("ACCESSORY")}
              className="accent-brand"
            />
            {t.common.accessory}
          </label>
        </div>
      </fieldset>

      {category === "PHONE" && (
        <label className="flex items-start gap-2 rounded-lg border border-line p-3 text-sm">
          <input
            type="checkbox"
            name="trackImei"
            checked={trackImei}
            onChange={(e) => setTrackImei(e.target.checked)}
            className="mt-0.5 accent-brand"
          />
          <span>
            <span className="font-medium">{p.trackImei}</span>
            <span className="block text-xs text-muted">{p.trackImeiHelp}</span>
          </span>
        </label>
      )}

      {counted ? (
        <fieldset className="rounded-lg border border-line p-3">
          <legend className="px-1 text-sm font-medium">{p.startingStock}</legend>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="label">{p.quantity}</span>
              <input name="quantity" type="number" min={0} step={1} defaultValue={0} className="input" />
            </label>
            <label>
              <span className="label">{p.costEach}</span>
              <input name="costPrice" type="number" min={0} step={1} defaultValue={0} className="input" />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted">{p.startingStockHelp}</p>
        </fieldset>
      ) : (
        <p className="text-sm text-muted">{p.imeiNext}</p>
      )}
    </div>
  );
}
