"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshStripeConnectStatus, sendStripeSetupLink } from "@/app/actions/admin";
import type { ConnectStatus } from "@/lib/stripe-connect";

const LABEL: Record<ConnectStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress — Stripe still needs details",
  ready: "Ready — payouts enabled",
};

/** Admin-only: a fleet driver's Stripe payouts status, with the two buttons
 * that replace the owner's manual "create an Express account and send the
 * link" step. */
export default function AdminStripeConnect({
  driverProfileId,
  status,
  accountId,
  onboardedAt,
  requirementsDue,
}: {
  driverProfileId: string;
  status: ConnectStatus;
  accountId: string | null;
  onboardedAt: string | null;
  requirementsDue: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  function sendLink() {
    setNote(null);
    start(async () => {
      const r = await sendStripeSetupLink(driverProfileId);
      if (!r.ok) { setNote({ ok: false, text: r.error }); return; }
      setNote({
        ok: r.emailSent,
        text: `${r.created ? "Stripe account created. " : ""}${r.emailSent ? "Setup email sent." : "Email didn't send (see the owner alert) — the driver can still open Payouts in their account."}`,
      });
      router.refresh();
    });
  }

  function refresh() {
    setNote(null);
    start(async () => {
      const r = await refreshStripeConnectStatus(driverProfileId);
      if (!r.ok) { setNote({ ok: false, text: r.error }); return; }
      setNote({ ok: true, text: r.sync ? `Stripe says: ${LABEL[r.sync.status]}.` : "Couldn't reach Stripe just now." });
      router.refresh();
    });
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Stripe payouts</p>
          <p className={`mt-1 text-sm ${status === "ready" ? "text-accent" : "text-muted"}`}>{LABEL[status]}</p>
          {accountId && <p className="mt-1 font-mono text-xs text-muted">{accountId}{onboardedAt ? ` · form submitted ${new Date(onboardedAt).toLocaleDateString()}` : ""}</p>}
          {requirementsDue.length > 0 && (
            <p className="mt-1 text-xs text-muted">Stripe is waiting on: {requirementsDue.join(", ")}</p>
          )}
          {note && <p className={`mt-2 text-sm ${note.ok ? "text-accent" : "text-red-400"}`}>{note.text}</p>}
        </div>
        <div className="flex gap-2">
          {accountId && (
            <button type="button" onClick={refresh} disabled={pending} className="rounded-full border border-border px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-60">
              Refresh status
            </button>
          )}
          {status !== "ready" && (
            <button type="button" onClick={sendLink} disabled={pending} className="btn-primary rounded-full px-5 py-2 text-sm disabled:opacity-60">
              {pending ? "Working…" : accountId ? "Resend setup email" : "Send Stripe setup link"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
