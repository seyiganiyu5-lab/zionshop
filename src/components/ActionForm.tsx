"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";

export type FormResult = { error?: string; ok?: string } | null;

const PendingContext = createContext(false);

/** True while the surrounding ActionForm is waiting on the server. */
export function useFormPending() {
  return useContext(PendingContext);
}

/** A form wired to a server action, showing its error/success message. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
  id,
  onSuccess,
}: {
  action: (prev: FormResult, formData: FormData) => Promise<FormResult>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
  /** Lets inputs elsewhere on the page join this form via their `form` attribute. */
  id?: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    if (resetOnSuccess) ref.current?.reset();
    onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per result
  }, [state]);

  return (
    <form
      ref={ref}
      id={id}
      className={className}
      onSubmit={(e) => {
        // Submit manually rather than via the form's action prop so React doesn't
        // clear what was typed when the server sends back an error.
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
      {state?.error && <p className="mt-2 text-sm whitespace-pre-line text-danger">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-sm text-success">{state.ok}</p>}
    </form>
  );
}
