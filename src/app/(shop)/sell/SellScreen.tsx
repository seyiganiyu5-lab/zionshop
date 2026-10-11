"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSale, searchSellable, type Sellable } from "./actions";

type CartLine =
  | { kind: "unit"; key: string; unitId: string; name: string; imei: string; price: number }
  | { kind: "accessory"; key: string; productId: string; name: string; price: number; quantity: number; available: number };

const conditionLabel = { NEW: "New", USED: "Used", REFURBISHED: "Refurbished" } as const;

export function SellScreen({ currency }: { currency: string }) {
  const router = useRouter();
  const money = useMemo(
    () => new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }),
    [currency],
  );

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Sellable[]>([]);
  const [searching, startSearch] = useTransition();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "CARD">("CASH");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const latestQuery = useRef("");

  useEffect(() => {
    const q = query.trim();
    latestQuery.current = q;
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      startSearch(async () => {
        const found = await searchSellable(q);
        if (latestQuery.current === q) setResults(found);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const inCart = new Set(cart.map((l) => l.key));
  const visible = results.filter((r) => r.kind === "accessory" || !inCart.has(`u:${r.unitId}`));

  function add(item: Sellable) {
    setError(null);
    setCart((c) => {
      if (item.kind === "unit") {
        if (c.some((l) => l.key === `u:${item.unitId}`)) return c;
        return [...c, { kind: "unit", key: `u:${item.unitId}`, unitId: item.unitId, name: item.name, imei: item.imei, price: item.price }];
      }
      const key = `a:${item.productId}`;
      const existing = c.find((l) => l.key === key);
      if (existing && existing.kind === "accessory") {
        return c.map((l) =>
          l.key === key && l.kind === "accessory" ? { ...l, quantity: Math.min(l.quantity + 1, l.available) } : l,
        );
      }
      return [
        ...c,
        { kind: "accessory", key, productId: item.productId, name: item.name, price: item.price, quantity: 1, available: item.available },
      ];
    });
    setQuery("");
    setResults([]);
    searchRef.current?.focus();
  }

  function update(key: string, patch: Partial<{ price: number; quantity: number }>) {
    setCart((c) => c.map((l) => (l.key === key ? ({ ...l, ...patch } as CartLine) : l)));
  }

  const total = cart.reduce((s, l) => s + l.price * (l.kind === "accessory" ? l.quantity : 1), 0);

  function checkout() {
    setError(null);
    startSaving(async () => {
      const result = await createSale({
        paymentMethod,
        customerName,
        customerPhone,
        items: cart.map((l) =>
          l.kind === "unit"
            ? { kind: "unit" as const, unitId: l.unitId, price: l.price }
            : { kind: "accessory" as const, productId: l.productId, quantity: l.quantity, price: l.price },
        ),
      });
      if (result.error) setError(result.error);
      else if (result.saleId) router.push(`/sales/${result.saleId}?new=1`);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="space-y-3">
        <input
          ref={searchRef}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Barcode scanners type the IMEI then press Enter.
            if (e.key === "Enter") {
              e.preventDefault();
              if (visible.length === 1) add(visible[0]);
            }
          }}
          placeholder="IMEI, brand or model…"
          className="input py-3 text-base"
        />
        {query.trim().length >= 2 && (
          <div className="card divide-y divide-gray-100 p-0">
            {visible.length === 0 ? (
              <p className="p-4 text-sm text-muted">{searching ? "Searching…" : "No matching items in stock."}</p>
            ) : (
              visible.map((r) => (
                <button
                  key={r.kind === "unit" ? r.unitId : r.productId}
                  onClick={() => add(r)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                >
                  <span>
                    <span className="font-medium">{r.name}</span>
                    <span className="block text-xs text-muted">
                      {r.kind === "unit" ? (
                        <>
                          <span className="font-mono">{r.imei}</span> · {conditionLabel[r.condition]}
                        </>
                      ) : (
                        `Accessory · ${r.available} in stock`
                      )}
                    </span>
                  </span>
                  <span className="text-sm font-medium">{money.format(r.price)}</span>
                </button>
              ))
            )}
          </div>
        )}

        <div className="card p-0">
          {cart.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">The cart is empty.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {cart.map((l) => (
                <li key={l.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{l.name}</div>
                    {l.kind === "unit" && <div className="font-mono text-xs text-muted">{l.imei}</div>}
                  </div>
                  {l.kind === "accessory" && (
                    <label className="text-xs text-muted">
                      Qty
                      <input
                        type="number"
                        min={1}
                        max={l.available}
                        value={l.quantity}
                        onChange={(e) =>
                          update(l.key, { quantity: Math.max(1, Math.min(l.available, Math.floor(Number(e.target.value) || 1))) })
                        }
                        className="input ml-1 inline-block w-16"
                      />
                    </label>
                  )}
                  <label className="text-xs text-muted">
                    Price
                    <input
                      type="number"
                      min={0}
                      value={l.price}
                      onChange={(e) => update(l.key, { price: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                      className="input ml-1 inline-block w-28"
                    />
                  </label>
                  <button
                    onClick={() => setCart((c) => c.filter((x) => x.key !== l.key))}
                    className="text-sm text-danger hover:underline"
                    aria-label={`Remove ${l.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <aside className="card h-fit space-y-4 lg:sticky lg:top-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">Total</span>
          <span className="text-3xl font-bold">{money.format(total)}</span>
        </div>
        <fieldset>
          <span className="label">Payment</span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["CASH", "Cash"],
                ["TRANSFER", "Transfer"],
                ["CARD", "Card / POS"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPaymentMethod(value)}
                className={`btn ${paymentMethod === value ? "btn-primary" : "btn-secondary"} px-2`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="label">Customer name (optional)</span>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="label">Customer phone (optional)</span>
          <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="input" />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button onClick={checkout} disabled={cart.length === 0 || saving} className="btn btn-primary w-full py-3 text-base">
          {saving ? "Saving…" : "Complete sale"}
        </button>
      </aside>
    </div>
  );
}
