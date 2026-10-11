"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action={action} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Zionshop</h1>
          <p className="text-sm text-muted">Sign in to manage your stock.</p>
        </div>
        <label className="block">
          <span className="label">Password</span>
          <input name="password" type="password" required autoFocus className="input" />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
