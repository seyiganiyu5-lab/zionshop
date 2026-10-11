export const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "Zionshop";

export function productName(p: {
  brand: string;
  model: string;
  storage?: string | null;
  color?: string | null;
}) {
  return [p.brand, p.model, p.storage, p.color].filter(Boolean).join(" ");
}
