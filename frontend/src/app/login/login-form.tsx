"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";

const initial: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm text-ink-muted">
        Username
        <input
          name="username"
          autoComplete="username"
          required
          className="rounded-md border border-ink-line bg-ink-elevated px-3 py-2 font-mono text-sm text-ink-fg outline-none ring-signal/40 focus:ring-2"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-ink-muted">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-ink-line bg-ink-elevated px-3 py-2 font-mono text-sm text-ink-fg outline-none ring-signal/40 focus:ring-2"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-signal px-4 py-2.5 text-sm font-medium text-ink-bg transition hover:bg-signal-bright disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
