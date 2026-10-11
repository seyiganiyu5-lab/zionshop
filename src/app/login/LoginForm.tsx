"use client";

import { startTransition, useActionState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { PasswordInput } from "@/components/PasswordInput";
import { login } from "./actions";

export function LoginForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(login, null);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        // Submitted by hand so the fields keep their values between steps.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <label className="block">
        <span className="label">{t.auth.username}</span>
        <input
          name="username"
          required
          autoFocus
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={100}
          className="input"
        />
      </label>
      <label className="block">
        <span className="label">{t.auth.password}</span>
        <PasswordInput name="password" required autoComplete="current-password" maxLength={1000} />
      </label>
      {state?.needCode && (
        <label className="block">
          <span className="label">{t.auth.code}</span>
          <input
            name="code"
            required
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            className="input text-center font-mono text-lg tracking-[0.4em]"
          />
          <span className="mt-1 block text-xs text-muted">{t.auth.codeHelp}</span>
        </label>
      )}
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? t.auth.signingIn : t.auth.signIn}
      </button>
    </form>
  );
}
