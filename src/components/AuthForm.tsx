"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, setPassword, type AuthState } from "@/app/actions/auth";

const inputCls =
  "w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition-colors focus:border-accent";

export function SignInForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  return (
    <form action={action} className="space-y-3">
      <input name="email" type="email" placeholder="Email" autoComplete="email" required className={inputCls} />
      <input name="password" type="password" placeholder="Password" autoComplete="current-password" required className={inputCls} />
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full rounded-full px-6 py-3 text-sm disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="pt-1 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="text-accent hover:underline">Become a driver</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(setPassword, {});
  return (
    <form action={action} className="space-y-3">
      <input name="password" type="password" placeholder="New password" autoComplete="new-password" required className={inputCls} />
      <input name="confirm" type="password" placeholder="Confirm new password" autoComplete="new-password" required className={inputCls} />
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full rounded-full px-6 py-3 text-sm disabled:opacity-60">
        {pending ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}
