"use client";

import { useState, useTransition } from "react";
import { sendReadinessNudgeOnTelegram } from "@/app/actions/admin";
import CopyTextButton from "@/components/CopyTextButton";

const smsHref = (phone: string, body: string) => `sms:${phone.replace(/[^+\d]/g, "")}?&body=${encodeURIComponent(body)}`;

/** Fleet readiness: a driver's nudge with Copy, Text (phone) and Send on Telegram (linked drivers). */
export default function ReadinessNudge({ userId, nudge, firstName, phone, onTelegram }: { userId: string; nudge: string; firstName: string; phone: string | null; onTelegram: boolean }) {
  const [pending, start] = useTransition();
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const who = firstName.trim() || "them";

  function send() {
    if (!confirm(`Send this to ${who} from the FlowSync bot on Telegram now?`)) return;
    setError(null);
    start(async () => {
      const r = await sendReadinessNudgeOnTelegram(userId);
      if (!r.ok) { setError(r.error); return; }
      setSentAt(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-sm">{nudge}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {onTelegram && (
          <button type="button" onClick={send} disabled={pending || !!sentAt} className="btn-primary rounded-full px-5 py-2.5 text-sm disabled:opacity-60">
            {pending ? "Sending…" : sentAt ? `Sent on Telegram ✓ ${sentAt}` : "Send on Telegram"}
          </button>
        )}
        <CopyTextButton value={nudge} label="Copy text" />
        {phone && <a href={smsHref(phone, nudge)} className="btn-ghost rounded-full px-5 py-2.5 text-sm">{`Text ${who}`}</a>}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
