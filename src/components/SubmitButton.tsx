"use client";

import { useFormPending } from "./ActionForm";

export function SubmitButton({
  children,
  className = "btn btn-primary",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pending = useFormPending();
  return (
    <button className={className} disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}
