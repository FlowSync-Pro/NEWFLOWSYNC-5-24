"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDriverCurriActivated } from "@/app/actions/dispatch";
import { ptDay } from "@/lib/pt-time";

/** Admin: whether the owner has added this driver on the Curri carrier account (a hard filter for dispatch). */
export default function AdminCurriActivation({ driverProfileId, activatedAt }: { driverProfileId: string; activatedAt: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const on = !!activatedAt;
  function toggle() {
    if (on && !confirm("Mark this driver as NOT activated on Curri? They'll stop appearing as a dispatch candidate.")) return;
    setError(null);
    start(async () => {
      try { await setDriverCurriActivated(driverProfileId, !on); router.refresh(); } catch { setError("Couldn't update."); }
    });
  }
  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
      <div>
        <p className="font-semibold">Curri carrier account</p>
        <p className="mt-1 text-sm text-muted">{on ? `Activated ${ptDay(activatedAt!)} — eligible for dispatch` : "Not activated yet — won't be offered loads"}</p>
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
      <button type="button" onClick={toggle} disabled={pending} className={`rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-60 ${on ? "border border-border text-muted hover:text-foreground" : "btn-primary"}`}>
        {pending ? "Saving…" : on ? "Mark not activated" : "Mark activated on Curri"}
      </button>
    </div>
  );
}
