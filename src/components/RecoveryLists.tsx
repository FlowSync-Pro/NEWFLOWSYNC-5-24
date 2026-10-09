"use client";

import { useState } from "react";

export interface RecoveryRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  /** Small grey line: what they abandoned / when / tier. */
  meta: string;
  /** The ready-to-send text message. */
  text: string;
  /** The one follow-up: two days later, only if they haven't replied. None for favors (referral asks). */
  followUp?: string;
  mailSubject: string;
  /** An admin page to act from (e.g. the driver's card with "Reset password"). */
  link?: { href: string; label: string };
}

export interface RecoveryGroup {
  key: string;
  title: string;
  blurb: string;
  rows: RecoveryRow[];
}

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { setDone(false); }
      }}
      className="btn-primary rounded-full px-4 py-2 text-xs"
    >
      {done ? "Copied" : "Copy text"}
    </button>
  );
}

const smsHref = (phone: string | null, body: string) => (phone ? `sms:${phone.replace(/[^+\d]/g, "")}?&body=${encodeURIComponent(body)}` : null);
const mailHref = (email: string | null, subject: string, body: string) =>
  email ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : null;

/** One row per person: who they are, the exact message, and one-tap ways to send it. */
export default function RecoveryLists({ groups }: { groups: RecoveryGroup[] }) {
  const [open, setOpen] = useState<string>(groups.find((g) => g.rows.length > 0)?.key ?? groups[0]?.key ?? "");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setOpen(g.key)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${open === g.key ? "bg-accent text-[#04130a] font-semibold" : "border border-border text-muted hover:text-foreground"}`}
          >
            {g.title} <span className="ml-1 opacity-70">{g.rows.length}</span>
          </button>
        ))}
      </div>

      {groups.filter((g) => g.key === open).map((g) => (
        <div key={g.key}>
          <p className="text-sm text-muted">{g.blurb}</p>
          {g.rows.length === 0 ? (
            <p className="card mt-3 p-5 text-sm text-muted">Nobody here right now.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {g.rows.map((r) => {
                const sms = smsHref(r.phone, r.text);
                const mail = mailHref(r.email, r.mailSubject, r.text);
                const smsFollow = r.followUp ? smsHref(r.phone, r.followUp) : null;
                const mailFollow = r.followUp ? mailHref(r.email, `Re: ${r.mailSubject}`, r.followUp) : null;
                return (
                  <div key={r.id} className="card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{r.name || "(no name)"}</p>
                        <p className="truncate text-xs text-muted">
                          {r.email ?? "no email"}{r.phone ? ` · ${r.phone}` : " · no phone"}
                        </p>
                        <p className="mt-1 text-xs text-muted">{r.meta}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {sms && <a href={sms} className="rounded-full border border-accent/40 bg-accent-soft px-4 py-2 text-xs font-medium text-accent">Text</a>}
                        {mail && <a href={mail} className="rounded-full border border-border px-4 py-2 text-xs text-muted hover:text-foreground">Email</a>}
                        <CopyButton value={r.text} />
                        {r.link && <a href={r.link.href} className="rounded-full border border-border px-4 py-2 text-xs text-muted hover:text-foreground">{r.link.label}</a>}
                      </div>
                    </div>
                    <p className="mt-3 rounded-lg border border-border bg-surface-2 p-3 text-xs leading-relaxed text-muted">{r.text}</p>
                    {r.followUp && (
                      <details className="mt-2 rounded-lg border border-border">
                        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted">Follow-up — send 2 days later, only if they haven&apos;t replied</summary>
                        <div className="border-t border-border p-3">
                          <p className="text-xs leading-relaxed text-muted">{r.followUp}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {smsFollow && <a href={smsFollow} className="rounded-full border border-accent/40 bg-accent-soft px-4 py-2 text-xs font-medium text-accent">Text follow-up</a>}
                            {mailFollow && <a href={mailFollow} className="rounded-full border border-border px-4 py-2 text-xs text-muted hover:text-foreground">Email follow-up</a>}
                            <CopyButton value={r.followUp} />
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
