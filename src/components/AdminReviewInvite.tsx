"use client";

import { useState, useTransition } from "react";
import { sendReviewInvite } from "@/app/actions/admin";

export interface AdminReviewInviteProps {
  driverProfileId: string;
  driverFirstName: string;
  /** The driver's existing review status, if they have one. */
  reviewStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  verifiedLoadCount: number;
}

/**
 * "Send review invite" — admin-only. Emails the driver a signed review link and
 * shows the same link here so the owner can text it instead (his preferred
 * channel). Reviews stay locked for anyone without a link.
 */
export default function AdminReviewInvite({ driverProfileId, driverFirstName, reviewStatus, verifiedLoadCount }: AdminReviewInviteProps) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ inviteUrl: string; emailSent: boolean; expiresInDays: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function go() {
    setError(null);
    setCopied(false);
    start(async () => {
      const r = await sendReviewInvite(driverProfileId);
      if (!r.ok || !r.inviteUrl) {
        setError(r.error ?? "Couldn't create the invite.");
        return;
      }
      setResult({ inviteUrl: r.inviteUrl, emailSent: !!r.emailSent, expiresInDays: r.expiresInDays ?? 90 });
    });
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const statusLabel =
    reviewStatus === "APPROVED" ? "Review published" :
    reviewStatus === "PENDING" ? "Review waiting for your approval" :
    reviewStatus === "REJECTED" ? "Review was rejected — they can edit and resubmit" :
    "No review yet";

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Review invite</p>
          <p className="mt-1 text-sm text-muted">
            {statusLabel} · {verifiedLoadCount} verified load{verifiedLoadCount === 1 ? "" : "s"} logged
          </p>
          <p className="mt-2 text-xs text-muted">
            Only drivers you invite can leave a review. Send this to {driverFirstName} once they&apos;re
            actively running loads with you. The link is tied to their account and works for 90 days.
          </p>
        </div>
        <button
          type="button"
          onClick={go}
          disabled={pending}
          className="btn-primary rounded-full px-5 py-2.5 text-sm disabled:opacity-60"
        >
          {pending ? "Sending…" : result ? "Send again" : reviewStatus ? "Send edit link" : "Send review invite"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {result && (
        <div className="mt-4 rounded-xl border border-accent/30 bg-accent-soft p-4 text-sm">
          <p className="font-semibold text-accent">
            {result.emailSent ? "Invite emailed." : "Email didn't send (email isn't configured) — text them the link instead."}
          </p>
          <p className="mt-1 text-xs text-muted">Same link, if you&apos;d rather text it. Expires in {result.expiresInDays} days.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-foreground">
              {result.inviteUrl}
            </code>
            <button type="button" onClick={copy} className="btn-ghost rounded-full px-4 py-2 text-xs">
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
