"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { adminCreateDriver, type CreateDriverState } from "@/app/actions/admin";
import { SERVICES } from "@/lib/services";

const fieldCls =
  "w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent";

export default function AdminAddDriver() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CreateDriverState, FormData>(adminCreateDriver, {});

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost rounded-full px-5 py-2.5 text-sm">
        + Add driver manually
      </button>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Add a driver manually</h3>
        <button onClick={() => setOpen(false)} className="text-sm text-muted hover:text-foreground">Close</button>
      </div>
      <p className="mt-1 text-sm text-muted">
        Creates a free, verified listing (no payment) and emails the driver a temporary password.
      </p>

      {state.ok ? (
        <div className="mt-4 rounded-xl border border-accent/40 bg-accent-soft p-4 text-sm">
          <p className="font-semibold text-accent">Driver created & listed.</p>
          {state.tempPassword && (
            <p className="mt-1 text-muted">
              Temporary password (relay if email doesn&apos;t arrive):{" "}
              <span className="font-mono font-semibold text-foreground">{state.tempPassword}</span>
            </p>
          )}
          <button
            onClick={() => { setOpen(false); router.refresh(); }}
            className="btn-ghost mt-3 rounded-full px-5 py-2 text-sm"
          >
            Done
          </button>
        </div>
      ) : (
        <form action={action} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input name="firstName" placeholder="First name" required className={fieldCls} />
            <input name="lastName" placeholder="Last name" required className={fieldCls} />
          </div>
          <input name="email" type="email" placeholder="Email" required className={fieldCls} />
          <div className="grid grid-cols-2 gap-3">
            <select name="primaryService" defaultValue="" required className={fieldCls}>
              <option value="" disabled>Main service…</option>
              {SERVICES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select name="tier" defaultValue="STANDARD" className={fieldCls}>
              <option value="STANDARD">Standard (free listing)</option>
              <option value="PREMIUM">Premium (free)</option>
            </select>
          </div>
          {state.error && <p className="text-sm text-red-400">{state.error}</p>}
          <button type="submit" disabled={pending} className="btn-primary w-full rounded-full px-6 py-3 text-sm disabled:opacity-60">
            {pending ? "Creating…" : "Create free listing"}
          </button>
        </form>
      )}
    </div>
  );
}
