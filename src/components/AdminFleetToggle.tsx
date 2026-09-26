"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFleetJoined } from "@/app/actions/admin";

/** Admin-only: shows a driver's Curri fleet status and lets the owner mark
 * drivers who paid the joining fee outside Stripe. */
export default function AdminFleetToggle({ driverProfileId, fleetJoinedAt }: { driverProfileId: string; fleetJoinedAt: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const joined = !!fleetJoinedAt;

  function toggle() {
    const next = !joined;
    if (!next && !confirm("Remove this driver's fleet membership? Their payment record stays; only the joined date is cleared.")) return;
    setError(null);
    start(async () => {
      const r = await setFleetJoined(driverProfileId, next);
      if (!r.ok) { setError(r.error ?? "Couldn't update."); return; }
      router.refresh();
    });
  }

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
      <div>
        <p className="font-semibold">Curri fleet</p>
        <p className="mt-1 text-sm text-muted">
          {joined ? `Member since ${new Date(fleetJoinedAt!).toLocaleDateString()}` : "Not a fleet member"}
        </p>
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
          joined ? "border border-border text-muted hover:text-foreground" : "btn-primary"
        }`}
      >
        {pending ? "Saving…" : joined ? "Remove from fleet" : "Mark as fleet member"}
      </button>
    </div>
  );
}
