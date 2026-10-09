"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendFleetInviteEmails } from "@/app/actions/admin";
import type { FleetInviteBatchResult } from "@/lib/fleet-invite-email";

/** Admin-only: sends the Curri fleet invite to the next batch of paid, non-fleet drivers. */
export default function AdminFleetInviteSend({ waiting, batch }: { waiting: number; batch: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<FleetInviteBatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const n = Math.min(waiting, batch);

  function send() {
    if (!confirm(`Email the fleet invite to the next ${n} driver${n === 1 ? "" : "s"} now? This can't be undone.`)) return;
    setError(null);
    start(async () => {
      const r = await sendFleetInviteEmails();
      if (!r.ok) { setError(r.error ?? "Couldn't send."); return; }
      setResult(r.result);
      router.refresh();
    });
  }

  return (
    <div className="card p-6">
      <p className="text-sm text-muted">{`${waiting} driver${waiting === 1 ? "" : "s"} ready for this email right now.`}</p>
      <button type="button" onClick={send} disabled={pending || waiting === 0} className="btn-primary mt-4 rounded-full px-6 py-3 text-sm disabled:opacity-60">
        {pending ? "Sending…" : waiting === 0 ? "Nobody's ready right now" : `Send to the next ${n}`}
      </button>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {result && (
        <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4 text-sm">
          <p>{`Sent ${result.sent}, skipped ${result.skipped}. ${result.remaining} still ready.`}</p>
          {Object.keys(result.reasons).length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-muted">
              {Object.entries(result.reasons).map(([why, count]) => (
                <li key={why}>{`${count} skipped — ${why}`}</li>
              ))}
            </ul>
          )}
          {result.remaining > 0 && <p className="mt-2 text-muted">Click again for the next batch.</p>}
        </div>
      )}
    </div>
  );
}
