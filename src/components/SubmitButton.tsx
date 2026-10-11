"use client";

import { useFormPending } from "./ActionForm";
import { useI18n } from "./I18nProvider";

export function SubmitButton({
  children,
  className = "btn btn-primary",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pending = useFormPending();
  const { t } = useI18n();
  return (
    <button className={className} disabled={pending}>
      {pending ? t.common.saving : children}
    </button>
  );
}
