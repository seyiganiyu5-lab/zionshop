export function saleProfit(items: { quantity: number; unitPrice: number; costPrice: number }[]) {
  return items.reduce((s, i) => s + (i.unitPrice - i.costPrice) * i.quantity, 0);
}
