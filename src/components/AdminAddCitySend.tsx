"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendAddCityEmails } from "@/app/actions/admin";
import type { AddCityBatchResult } from "@/lib/add-city-email";

/** Admin-only: sends the "Add your city" email to the next batch of listed drivers without a city. */
export default function AdminAddCitySend({ waiting, batch }: { waiting: number; batch: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<AddCityBatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const n = Math.min(waiting, batch);

  function send() {
    if (!confirm(`Email the next ${n} driver${n === 1 ? "" : "s"} now? This can't be undone.`)) return;
    setError(null);
    start(async () => {
      const r = await sendAddCityEmails();
      if (!r.ok) { setError(r.error ?? "Couldn't send."); return; }
      setResult(r.result);
      router.refresh();
    });
  }

  return (
    <div className="card p-6">
      <p className="text-sm text-muted">{`${waiting} driver${waiting === 1 ? "" : "s"} still waiting for this email.`}</p>
      <button type="button" onClick={send} disabled={pending || waiting === 0} className="btn-primary mt-4 rounded-full px-6 py-3 text-sm disabled:opacity-60">
        {pending ? "Sending…" : waiting === 0 ? "Everyone has it" : `Send to the next ${n}`}
      </button>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {result && (
        <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4 text-sm">
          <p>{`Sent ${result.sent}, skipped ${result.skipped}. ${result.remaining} still waiting.`}</p>
          {Object.keys(result.reasons).length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-muted">
              {Object.entries(result.reasons).map(([why, count]) => (
                <li key={why}>{`${count} skipped — ${why}`}</li>
              ))}
            </ul>
          )}
          {result.remaining > 0 && <p className="mt-2 text-muted">Click again for the next batch. Anyone skipped for the 48-hour gap is retried next time.</p>}
        </div>
      )}
    </div>
  );
}
