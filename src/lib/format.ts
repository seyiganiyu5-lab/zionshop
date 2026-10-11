const currency = process.env.NEXT_PUBLIC_CURRENCY || "NGN";

const money = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency,
  maximumFractionDigits: 0,
});

export function formatMoney(amount: number) {
  return money.format(amount);
}

const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: process.env.SHOP_TIMEZONE || "Africa/Lagos",
});

export function formatDateTime(date: Date) {
  return dateTime.format(date);
}

export const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "Zionshop";

export function productName(p: {
  brand: string;
  model: string;
  storage?: string | null;
  color?: string | null;
}) {
  return [p.brand, p.model, p.storage, p.color].filter(Boolean).join(" ");
}

export const conditionLabel = {
  NEW: "New",
  USED: "Used",
  REFURBISHED: "Refurbished",
} as const;

export const paymentLabel = {
  CASH: "Cash",
  TRANSFER: "Bank transfer",
  CARD: "Card / POS",
} as const;
