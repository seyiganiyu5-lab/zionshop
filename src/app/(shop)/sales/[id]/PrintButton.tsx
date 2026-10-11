"use client";

import { useI18n } from "@/components/I18nProvider";

export function PrintButton() {
  const { t } = useI18n();
  return (
    <button onClick={() => window.print()} className="btn btn-primary">
      {t.receipt.print}
    </button>
  );
}
