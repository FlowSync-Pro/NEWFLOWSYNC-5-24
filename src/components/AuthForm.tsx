"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, setPassword, requestPasswordReset, resetPasswordWithToken, type AuthState, type ForgotState } from "@/app/actions/auth";

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

export function AuthPanel() {
  return (
    <div>
      <SignIn />
      <p className="mt-5 border-t border-border pt-5 text-center text-sm text-muted">
        New driver?{" "}
        <Link href="/pricing" className="font-medium text-accent hover:underline">
          Get listed for $17 →
        </Link>
      </p>
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
