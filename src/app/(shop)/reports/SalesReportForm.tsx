"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";

const periods = ["today", "7d", "30d", "month", "lastMonth", "custom"] as const;

export function SalesReportForm({ today }: { today: string }) {
  const { t } = useI18n();
  const r = t.reports;
  const [period, setPeriod] = useState<(typeof periods)[number]>("month");

  return (
    <form method="get" action="/reports/sales" className="space-y-4">
      <label className="block max-w-xs">
        <span className="label">{r.period}</span>
        <select
          name="period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as (typeof periods)[number])}
          className="input"
        >
          {periods.map((p) => (
            <option key={p} value={p}>
              {r.periods[p]}
            </option>
          ))}
        </select>
      </label>
      {period === "custom" && (
        <div className="grid max-w-md grid-cols-2 gap-3">
          <label>
            <span className="label">{r.from}</span>
            <input type="date" name="from" required max={today} defaultValue={today.slice(0, 8) + "01"} className="input" />
          </label>
          <label>
            <span className="label">{r.to}</span>
            <input type="date" name="to" required max={today} defaultValue={today} className="input" />
          </label>
        </div>
      )}
      <button className="btn btn-primary">⬇ {r.download}</button>
    </form>
  );
}
