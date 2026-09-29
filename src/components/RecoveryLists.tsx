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
  mailSubject: string;
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
                const smsHref = r.phone ? `sms:${r.phone.replace(/[^+\d]/g, "")}?&body=${encodeURIComponent(r.text)}` : null;
                const mailHref = r.email ? `mailto:${r.email}?subject=${encodeURIComponent(r.mailSubject)}&body=${encodeURIComponent(r.text)}` : null;
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
                        {smsHref && <a href={smsHref} className="rounded-full border border-accent/40 bg-accent-soft px-4 py-2 text-xs font-medium text-accent">Text</a>}
                        {mailHref && <a href={mailHref} className="rounded-full border border-border px-4 py-2 text-xs text-muted hover:text-foreground">Email</a>}
                        <CopyButton value={r.text} />
                      </div>
                    </div>
                    <p className="mt-3 rounded-lg border border-border bg-surface-2 p-3 text-xs leading-relaxed text-muted">{r.text}</p>
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
