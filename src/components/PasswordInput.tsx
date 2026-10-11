"use client";

import { useState, type InputHTMLAttributes } from "react";
import { useI18n } from "./I18nProvider";

/** A password field with an eye button to show or hide what's typed. */
export function PasswordInput({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const label = visible ? t.common.hidePassword : t.common.showPassword;

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        // Never let the browser autocorrect or capitalise a visible password.
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`input pr-11 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {visible ? (
            <>
              <path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c6.5 0 10 8 10 8a17.7 17.7 0 0 1-2.4 3.5M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20" />
            </>
          ) : (
            <>
              <path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8-10-8-10-8z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
