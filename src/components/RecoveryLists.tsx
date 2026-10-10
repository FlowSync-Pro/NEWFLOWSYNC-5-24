"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAskedToStop, sendFleetInviteEmails } from "@/app/actions/admin";

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
  /** The driver's user id — enables "Asked to stop". Rows without an account (abandoned checkouts) have none. */
  userId?: string;
  /** The day the group's batch email ("Send all") went to them, e.g. "Oct 9". Replaces the Email button. */
  emailedOn?: string;
  /** The day they asked for no more messages (User.marketingOptOutAt). Hides every send button. */
  stoppedOn?: string;
}

export interface SendAllInfo {
  /** What the button sends, in the owner's words, e.g. "the fleet invite email". */
  what: string;
  /** Drivers ready for it right now: haven't had it, not stopped, free of the 48h gap. */
  ready: number;
  /** Drivers who already got it. */
  sentSoFar: number;
  /** Sent per round; the button keeps going round by round until nobody is left. */
  batch: number;
  /** Set when nothing can be sent (marketing email switched off). */
  disabledReason?: string;
}

export interface RecoveryGroup {
  key: string;
  title: string;
  blurb: string;
  rows: RecoveryRow[];
  /** The group's one batch email, sent to everyone at once from the page. Only the fleet invite today. */
  sendAll?: SendAllInfo;
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

// 30 rounds × 40 = 1,200 drivers in one sitting — far above the list, so the
// loop only ever ends because nobody is left (or a round sent nothing).
const MAX_ROUNDS = 30;

interface Progress { sent: number; skipped: number; remaining: number; reasons: Record<string, number>; done: boolean }

/**
 * "Send all": the fleet invite email to every driver who hasn't had it, in
 * rounds of `batch` (each round is one server action, kept under the page's
 * time limit). Who got it is remembered in the database (EmailLog), so a second
 * click, another day, or the /admin/fleet-invite page can never send it twice.
 */
function SendAllCard({ info }: { info: SendAllInfo }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const n = info.ready;

  function sendAll() {
    if (!confirm(`Email ${info.what} to all ${n} driver${n === 1 ? "" : "s"} who haven't had it yet? Each driver gets it once, ever. This can't be undone.`)) return;
    setError(null);
    setProgress({ sent: 0, skipped: 0, remaining: n, reasons: {}, done: false });
    start(async () => {
      let sent = 0, skipped = 0, remaining = n;
      const reasons: Record<string, number> = {};
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const r = await sendFleetInviteEmails();
        if (!r.ok) { setError(r.error ?? "Couldn't send."); break; }
        sent += r.result.sent;
        skipped += r.result.skipped;
        remaining = r.result.remaining;
        for (const [why, count] of Object.entries(r.result.reasons)) reasons[why] = (reasons[why] ?? 0) + count;
        setProgress({ sent, skipped, remaining, reasons, done: false });
        if (remaining === 0) break;
        if (r.result.sent === 0) {
          // A whole round went nowhere (e.g. the email service refusing): stop
          // rather than loop over the same drivers.
          setError("The last round couldn't send anything, so I stopped. The reasons are listed below — reload and try again later.");
          break;
        }
      }
      setProgress((p) => (p ? { ...p, done: true } : p));
      router.refresh();
    });
  }

  return (
    <div className="card mt-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Send all — {info.what}</p>
          <p className="mt-0.5 text-xs text-muted">
            {`${n} driver${n === 1 ? "" : "s"} ready right now · ${info.sentSoFar} already got it.`}{" "}
            Each driver gets it once, ever; unsubscribed, refunded, fleet and bike / scooter drivers are skipped automatically.
            Rows below show <span className="text-accent">Emailed</span> once it has gone out.
          </p>
        </div>
        <button
          type="button"
          onClick={sendAll}
          disabled={pending || n === 0 || !!info.disabledReason}
          className="btn-primary rounded-full px-5 py-2.5 text-sm disabled:opacity-60"
        >
          {pending ? "Sending…" : n === 0 ? "Nobody's ready right now" : `Send all (${n})`}
        </button>
      </div>
      {info.disabledReason && <p className="mt-3 text-sm text-red-400">{info.disabledReason}</p>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {progress && (
        <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3 text-sm">
          <p>
            {progress.done
              ? `Done: sent ${progress.sent}, skipped ${progress.skipped}${progress.remaining ? `, ${progress.remaining} still waiting` : ""}.`
              : `Sending… ${progress.sent} sent so far, ${progress.remaining} to go. Keep this page open.`}
          </p>
          {Object.keys(progress.reasons).length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-muted">
              {Object.entries(progress.reasons).map(([why, count]) => (
                <li key={why}>{`${count} skipped — ${why}`}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Marks a driver as "asked to stop": no more email from the site, and a red marker on every tab. */
function StopButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function stop() {
    if (!confirm(`Mark ${name || "this driver"} as "asked to stop"? The site will never email them again and they're marked on this page so you don't text them either. This can't be undone from here.`)) return;
    setError(null);
    start(async () => {
      const r = await markAskedToStop(userId);
      if (!r.ok) { setError(r.error ?? "Couldn't save that."); return; }
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={stop} disabled={pending} className="rounded-full border border-border px-4 py-2 text-xs text-muted hover:text-foreground disabled:opacity-60">
        {pending ? "Saving…" : "Asked to stop"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </>
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
          {g.sendAll && <SendAllCard info={g.sendAll} />}
          {g.rows.length === 0 ? (
            <p className="card mt-3 p-5 text-sm text-muted">Nobody here right now.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {g.rows.map((r) => {
                const sms = smsHref(r.phone, r.text);
                const mail = mailHref(r.email, r.mailSubject, r.text);
                const smsFollow = r.followUp ? smsHref(r.phone, r.followUp) : null;
                const mailFollow = r.followUp ? mailHref(r.email, `Re: ${r.mailSubject}`, r.followUp) : null;
                const stopped = !!r.stoppedOn;
                return (
                  <div key={r.id} className={`card p-4${stopped ? " opacity-70" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{r.name || "(no name)"}</p>
                        <p className="truncate text-xs text-muted">
                          {r.email ?? "no email"}{r.phone ? ` · ${r.phone}` : " · no phone"}
                        </p>
                        <p className="mt-1 text-xs text-muted">{r.meta}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {stopped ? (
                          <span className="rounded-full border border-red-400/40 bg-red-400/10 px-3 py-1.5 text-xs font-medium text-red-300">
                            Asked to stop · {r.stoppedOn} — don&apos;t contact
                          </span>
                        ) : (
                          <>
                            {sms && <a href={sms} className="rounded-full border border-accent/40 bg-accent-soft px-4 py-2 text-xs font-medium text-accent">Text</a>}
                            {r.emailedOn ? (
                              <span className="rounded-full border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent">Emailed {r.emailedOn}</span>
                            ) : (
                              mail && <a href={mail} className="rounded-full border border-border px-4 py-2 text-xs text-muted hover:text-foreground">Email</a>
                            )}
                            <CopyButton value={r.text} />
                            {r.link && <a href={r.link.href} className="rounded-full border border-border px-4 py-2 text-xs text-muted hover:text-foreground">{r.link.label}</a>}
                            {r.userId && <StopButton userId={r.userId} name={r.name} />}
                          </>
                        )}
                      </div>
                    </div>
                    {!stopped && (
                      <>
                        <p className="mt-3 whitespace-pre-line rounded-lg border border-border bg-surface-2 p-3 text-xs leading-relaxed text-muted">{r.text}</p>
                        {r.followUp && (
                          <details className="mt-2 rounded-lg border border-border">
                            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted">Follow-up — send 2 days later, only if they haven&apos;t replied</summary>
                            <div className="border-t border-border p-3">
                              <p className="whitespace-pre-line text-xs leading-relaxed text-muted">{r.followUp}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {smsFollow && <a href={smsFollow} className="rounded-full border border-accent/40 bg-accent-soft px-4 py-2 text-xs font-medium text-accent">Text follow-up</a>}
                                {mailFollow && <a href={mailFollow} className="rounded-full border border-border px-4 py-2 text-xs text-muted hover:text-foreground">Email follow-up</a>}
                                <CopyButton value={r.followUp} />
                              </div>
                            </div>
                          </details>
                        )}
                      </>
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
