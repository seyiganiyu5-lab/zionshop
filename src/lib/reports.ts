import "server-only";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { productName, shopName } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/en";
import { getStockRows } from "@/lib/stock";
import { asShopWallClock, shopDateString } from "@/lib/time";

type Kind = "text" | "money" | "int" | "pct" | "date";
type Column = { header: string; kind?: Kind; width?: number };

const formats: Record<Kind, string | undefined> = {
  text: undefined,
  money: "#,##0",
  int: "0",
  pct: "0.0%",
  date: "dd/mm/yyyy hh:mm",
};

function newWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = shopName;
  wb.created = new Date();
  return wb;
}

/** A sheet with a styled, frozen, filterable header row. */
function addTable(wb: ExcelJS.Workbook, name: string, columns: Column[], rows: unknown[][]) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((c) => ({
    header: c.header,
    width: c.width ?? Math.max(12, c.header.length + 2),
    style: formats[c.kind ?? "text"] ? { numFmt: formats[c.kind ?? "text"] } : {},
  }));
  rows.forEach((r) => ws.addRow(r));
  styleHeader(ws.getRow(1));
  if (rows.length > 0) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
  row.alignment = { vertical: "middle" };
  row.height = 20;
}

/** Two-column label/value sheet, with optional extra tables underneath. */
function addSummary(wb: ExcelJS.Workbook, name: string, title: string, lines: [string, unknown, Kind?][]) {
  const ws = wb.addWorksheet(name);
  ws.columns = [{ width: 34 }, { width: 22 }, { width: 18 }];
  const head = ws.addRow([title]);
  head.font = { bold: true, size: 14 };
  ws.addRow([]);
  for (const [label, value, kind] of lines) {
    const row = ws.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    const fmt = kind && formats[kind];
    if (fmt) row.getCell(2).numFmt = fmt;
  }
  return ws;
}

const margin = (profit: number, revenue: number) => (revenue > 0 ? profit / revenue : 0);

export async function buildSalesReport(t: Dictionary, currency: string, from: Date, to: Date) {
  const r = t.reports;
  const c = r.cols;
  const sales = await db.sale.findMany({
    where: { createdAt: { gte: from, lt: to } },
    orderBy: { createdAt: "asc" },
    include: { items: { include: { product: true, unit: true } } },
  });

  const lastDay = shopDateString(new Date(to.getTime() - 1));
  const periodLabel = `${shopDateString(from)} → ${lastDay}`;
  const wb = newWorkbook();

  let revenue = 0;
  let cost = 0;
  let itemsSold = 0;
  const byPayment = new Map<string, { count: number; revenue: number }>();
  const byProduct = new Map<string, { name: string; units: number; revenue: number; cost: number }>();
  const saleRows: unknown[][] = [];
  const itemRows: unknown[][] = [];

  for (const s of sales) {
    const saleCost = s.items.reduce((sum, i) => sum + i.costPrice * i.quantity, 0);
    revenue += s.total;
    cost += saleCost;
    const pay = byPayment.get(s.paymentMethod) ?? { count: 0, revenue: 0 };
    byPayment.set(s.paymentMethod, { count: pay.count + 1, revenue: pay.revenue + s.total });
    const when = asShopWallClock(s.createdAt);

    saleRows.push([
      s.number,
      when,
      s.customerName ?? "",
      s.customerPhone ?? "",
      t.payment[s.paymentMethod],
      s.items.map((i) => `${i.quantity > 1 ? `${i.quantity} × ` : ""}${productName(i.product)}`).join(", "),
      s.total,
      saleCost,
      s.total - saleCost,
    ]);

    for (const i of s.items) {
      itemsSold += i.quantity;
      const name = productName(i.product);
      const line = i.unitPrice * i.quantity;
      const lineCost = i.costPrice * i.quantity;
      itemRows.push([
        s.number,
        when,
        name,
        i.unit?.imei ?? "",
        i.unit ? t.condition[i.unit.condition] : "",
        i.quantity,
        i.unitPrice,
        i.costPrice,
        line,
        line - lineCost,
      ]);
      const p = byProduct.get(i.productId) ?? { name, units: 0, revenue: 0, cost: 0 };
      byProduct.set(i.productId, { name, units: p.units + i.quantity, revenue: p.revenue + line, cost: p.cost + lineCost });
    }
  }

  const summary = addSummary(wb, r.sheets.summary, `${shopName} · ${r.salesTitle}`, [
    [r.summary.period, periodLabel],
    [r.summary.generated, asShopWallClock(new Date()), "date"],
    [r.currency(currency), ""],
    [r.summary.salesCount, sales.length, "int"],
    [r.summary.itemsSold, itemsSold, "int"],
    [r.summary.revenue, revenue, "money"],
    [r.summary.cost, cost, "money"],
    [r.summary.profit, revenue - cost, "money"],
    [r.summary.margin, margin(revenue - cost, revenue), "pct"],
  ]);
  summary.addRow([]);
  const payHead = summary.addRow([r.summary.byPayment, c.count, c.revenue]);
  styleHeader(payHead);
  for (const method of ["CASH", "TRANSFER", "CARD"] as const) {
    const p = byPayment.get(method) ?? { count: 0, revenue: 0 };
    const row = summary.addRow([t.payment[method], p.count, p.revenue]);
    row.getCell(3).numFmt = formats.money!;
  }

  addTable(
    wb,
    r.sheets.sales,
    [
      { header: c.saleNo, kind: "int", width: 9 },
      { header: c.date, kind: "date", width: 17 },
      { header: c.customer, width: 20 },
      { header: c.customerPhone, width: 16 },
      { header: c.payment, width: 16 },
      { header: c.items, width: 50 },
      { header: c.total, kind: "money", width: 14 },
      { header: c.cost, kind: "money", width: 14 },
      { header: c.profit, kind: "money", width: 14 },
    ],
    saleRows,
  );

  addTable(
    wb,
    r.sheets.items,
    [
      { header: c.saleNo, kind: "int", width: 9 },
      { header: c.date, kind: "date", width: 17 },
      { header: c.product, width: 36 },
      // Text, so Excel doesn't turn a 15-digit IMEI into 3.57E+14.
      { header: c.imei, width: 18 },
      { header: c.condition, width: 14 },
      { header: c.quantity, kind: "int", width: 10 },
      { header: c.unitPrice, kind: "money", width: 14 },
      { header: c.unitCost, kind: "money", width: 14 },
      { header: c.total, kind: "money", width: 14 },
      { header: c.profit, kind: "money", width: 14 },
    ],
    itemRows,
  );

  addTable(
    wb,
    r.sheets.products,
    [
      { header: c.product, width: 40 },
      { header: c.unitsSold, kind: "int", width: 14 },
      { header: c.revenue, kind: "money", width: 16 },
      { header: c.cost, kind: "money", width: 14 },
      { header: c.profit, kind: "money", width: 14 },
      { header: c.margin, kind: "pct", width: 10 },
    ],
    [...byProduct.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .map((p) => [p.name, p.units, p.revenue, p.cost, p.revenue - p.cost, margin(p.revenue - p.cost, p.revenue)]),
  );

  return {
    buffer: await wb.xlsx.writeBuffer(),
    filename: `zionshop-sales-${shopDateString(from)}_${lastDay}.xlsx`,
  };
}

export async function buildStockReport(t: Dictionary, currency: string) {
  const r = t.reports;
  const c = r.cols;
  const [rows, phones] = await Promise.all([
    getStockRows(),
    db.unit.findMany({
      where: { status: "IN_STOCK", product: { archived: false } },
      include: { product: true },
      orderBy: [{ product: { brand: "asc" } }, { product: { model: "asc" } }, { addedAt: "asc" }],
    }),
  ]);
  const wb = newWorkbook();

  const totals = rows.reduce(
    (acc, p) => ({
      units: acc.units + p.onHand,
      cost: acc.cost + p.stockCost,
      value: acc.value + p.onHand * p.sellPrice,
    }),
    { units: 0, cost: 0, value: 0 },
  );

  addSummary(wb, r.sheets.summary, `${shopName} · ${r.stockTitle}`, [
    [r.summary.generated, asShopWallClock(new Date()), "date"],
    [r.currency(currency), ""],
    [r.summary.products, rows.length, "int"],
    [r.summary.units, totals.units, "int"],
    [r.summary.stockCost, totals.cost, "money"],
    [r.summary.stockValue, totals.value, "money"],
    [r.summary.potentialProfit, totals.value - totals.cost, "money"],
    [r.summary.lowItems, rows.filter((p) => p.isLow).length, "int"],
  ]);

  addTable(
    wb,
    r.sheets.stock,
    [
      { header: c.product, width: 36 },
      { header: c.brand, width: 12 },
      { header: c.model, width: 20 },
      { header: c.storage, width: 10 },
      { header: c.color, width: 14 },
      { header: c.type, width: 12 },
      { header: c.tracking, width: 18 },
      { header: c.onHand, kind: "int", width: 10 },
      { header: c.unitCost, kind: "money", width: 14 },
      { header: c.sellPrice, kind: "money", width: 14 },
      { header: c.stockCost, kind: "money", width: 18 },
      { header: c.stockValue, kind: "money", width: 18 },
      { header: c.potentialProfit, kind: "money", width: 16 },
      { header: c.lowStock, width: 11 },
    ],
    rows.map((p) => [
      productName(p),
      p.brand,
      p.model,
      p.storage ?? "",
      p.color ?? "",
      p.category === "PHONE" ? t.common.phone : t.common.accessory,
      p.trackImei ? t.product.byImei : t.product.byQuantity,
      p.onHand,
      p.onHand > 0 ? Math.round(p.stockCost / p.onHand) : p.costPrice,
      p.sellPrice,
      p.stockCost,
      p.onHand * p.sellPrice,
      p.onHand * p.sellPrice - p.stockCost,
      p.isLow ? r.yes : r.no,
    ]),
  );

  addTable(
    wb,
    r.sheets.phones,
    [
      { header: c.product, width: 36 },
      { header: c.imei, width: 18 },
      { header: c.condition, width: 14 },
      { header: c.unitCost, kind: "money", width: 14 },
      { header: c.sellPrice, kind: "money", width: 14 },
      { header: c.supplier, width: 22 },
      { header: c.notes, width: 30 },
      { header: c.added, kind: "date", width: 17 },
    ],
    phones.map((u) => [
      productName(u.product),
      u.imei,
      t.condition[u.condition],
      u.costPrice,
      u.product.sellPrice,
      u.supplier ?? "",
      u.notes ?? "",
      asShopWallClock(u.addedAt),
    ]),
  );

  return {
    buffer: await wb.xlsx.writeBuffer(),
    filename: `zionshop-stock-${shopDateString(new Date())}.xlsx`,
  };
}
