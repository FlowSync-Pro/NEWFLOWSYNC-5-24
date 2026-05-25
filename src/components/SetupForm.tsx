"use client";

import { useActionState } from "react";
import { completeDriverProfile, type SetupState } from "@/app/actions/profile";
import { SERVICES } from "@/lib/services";

const inputCls =
  "w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition-colors focus:border-accent";

export default function SetupForm({ defaultFirst = "", defaultLast = "" }: { defaultFirst?: string; defaultLast?: string }) {
  const [state, action, pending] = useActionState<SetupState, FormData>(completeDriverProfile, {});
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input name="firstName" defaultValue={defaultFirst} placeholder="First name" required className={inputCls} />
        <input name="lastName" defaultValue={defaultLast} placeholder="Last name" required className={inputCls} />
      </div>
      <select name="primaryService" defaultValue="" required className={inputCls}>
        <option value="" disabled>Your main service…</option>
        {SERVICES.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full rounded-full px-6 py-3 text-sm disabled:opacity-60">
        {pending ? "Setting up…" : "Continue"}
      </button>
    </form>
  );
}
