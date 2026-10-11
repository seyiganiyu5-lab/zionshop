type ProductValues = {
  brand: string;
  model: string;
  storage: string | null;
  color: string | null;
  sellPrice: number;
  lowStockThreshold: number;
};

export function ProductFields({ product }: { product?: ProductValues }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label>
        <span className="label">Brand</span>
        <input name="brand" required defaultValue={product?.brand} placeholder="Apple, Samsung, Tecno…" className="input" />
      </label>
      <label>
        <span className="label">Model / name</span>
        <input name="model" required defaultValue={product?.model} placeholder="iPhone 15, Galaxy A15, 20W charger…" className="input" />
      </label>
      <label>
        <span className="label">Storage (optional)</span>
        <input name="storage" defaultValue={product?.storage ?? ""} placeholder="128GB" className="input" />
      </label>
      <label>
        <span className="label">Colour (optional)</span>
        <input name="color" defaultValue={product?.color ?? ""} placeholder="Black" className="input" />
      </label>
      <label>
        <span className="label">Selling price</span>
        <input name="sellPrice" type="number" min={0} step={1} required defaultValue={product?.sellPrice} className="input" />
      </label>
      <label>
        <span className="label">Warn me when stock falls to</span>
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
