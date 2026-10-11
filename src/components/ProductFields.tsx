import type { Dictionary } from "@/lib/i18n/en";

type ProductValues = {
  brand: string;
  model: string;
  storage: string | null;
  color: string | null;
  sellPrice: number;
  lowStockThreshold: number;
};

export function ProductFields({ t, product }: { t: Dictionary; product?: ProductValues }) {
  const p = t.product;
  const optional = (label: string) => `${label} (${t.common.optional})`;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label>
        <span className="label">{p.brand}</span>
        <input name="brand" required maxLength={60} defaultValue={product?.brand} placeholder={p.brandPlaceholder} className="input" />
      </label>
      <label>
        <span className="label">{p.model}</span>
        <input name="model" required maxLength={100} defaultValue={product?.model} placeholder={p.modelPlaceholder} className="input" />
      </label>
      <label>
        <span className="label">{optional(p.storage)}</span>
        <input name="storage" maxLength={30} defaultValue={product?.storage ?? ""} placeholder="128GB" className="input" />
      </label>
      <label>
        <span className="label">{optional(p.color)}</span>
        <input name="color" maxLength={30} defaultValue={product?.color ?? ""} className="input" />
      </label>
      <label>
        <span className="label">{p.sellPrice}</span>
        <input name="sellPrice" type="number" min={0} step={1} required defaultValue={product?.sellPrice} className="input" />
      </label>
      <label>
        <span className="label">{p.lowStock}</span>
        <input
          name="lowStockThreshold"
          type="number"
          min={0}
          step={1}
          required
          defaultValue={product?.lowStockThreshold ?? 2}
          className="input"
        />
      </label>
    </div>
  );
}
