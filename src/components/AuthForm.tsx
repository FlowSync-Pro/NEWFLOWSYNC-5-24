"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, register, setPassword, requestPasswordReset, resetPasswordWithToken, type AuthState, type ForgotState } from "@/app/actions/auth";
import { SERVICES } from "@/lib/services";

const inputCls =
  "w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition-colors focus:border-accent";

function SignIn() {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  return (
    <form action={action} className="space-y-3">
      <input name="email" type="email" placeholder="Email" autoComplete="email" required className={inputCls} />
      <input name="password" type="password" placeholder="Password" autoComplete="current-password" required className={inputCls} />
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full rounded-full px-6 py-3 text-sm disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="pt-1 text-center">
        <Link href="/forgot-password" className="text-sm text-muted hover:text-accent">Forgot password?</Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestPasswordReset, {});
  if (state.sent) {
    return (
      <div className="text-center">
        <p className="font-semibold text-accent">Check your email</p>
        <p className="mt-2 text-sm text-muted">If an account exists for that address, we&apos;ve sent a password reset link. It expires in 1 hour.</p>
        <Link href="/signin" className="btn-ghost mt-5 inline-flex rounded-full px-6 py-2.5 text-sm">Back to sign in</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <input name="email" type="email" placeholder="Your account email" autoComplete="email" required className={inputCls} />
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full rounded-full px-6 py-3 text-sm disabled:opacity-60">
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="pt-1 text-center">
        <Link href="/signin" className="text-sm text-muted hover:text-accent">Back to sign in</Link>
      </p>
    </form>
  );
}

export function TokenResetForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPasswordWithToken, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />
      <input name="password" type="password" placeholder="New password" autoComplete="new-password" required className={inputCls} />
      <input name="confirm" type="password" placeholder="Confirm new password" autoComplete="new-password" required className={inputCls} />
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full rounded-full px-6 py-3 text-sm disabled:opacity-60">
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}

function Register() {
  const [state, action, pending] = useActionState<AuthState, FormData>(register, {});
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input name="firstName" placeholder="First name" autoComplete="given-name" required className={inputCls} />
        <input name="lastName" placeholder="Last name" autoComplete="family-name" required className={inputCls} />
      </div>
      <input name="email" type="email" placeholder="Email" autoComplete="email" required className={inputCls} />
      <select name="primaryService" defaultValue="" required className={inputCls}>
        <option value="" disabled>Main service…</option>
        {SERVICES.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <input name="password" type="password" placeholder="Create a password (8+ characters)" autoComplete="new-password" required className={inputCls} />
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full rounded-full px-6 py-3 text-sm disabled:opacity-60">
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

export function AuthPanel() {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-full border border-border bg-surface-2 p-1">
        {(["signin", "register"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${
              mode === m ? "bg-accent text-[#04130a]" : "text-muted hover:text-foreground"
            }`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      {mode === "signin" ? <SignIn /> : <Register />}
    </div>
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
