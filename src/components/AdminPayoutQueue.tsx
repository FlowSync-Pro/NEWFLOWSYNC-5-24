"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cancelPayout, payAllPending, payPayoutNow } from "@/app/actions/admin";

export interface QueueDriver {
  driverProfileId: string | null;
  name: string;
  email: string;
  payPlan: "STANDARD" | "FASTER";
  connectReady: boolean;
  count: number;
  netCents: number;
}

export interface HistoryRow {
  id: string;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  driver: string;
  driverProfileId: string | null;
  loadCents: number;
  feePercent: number;
  netCents: number;
  note: string | null;
  deliveredOn: string;
  paidAt: string | null;
  stripeTransferId: string | null;
  failureReason: string | null;
}

const $ = (c: number) => `$${(c / 100).toFixed(2)}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const STATUS_CLS: Record<HistoryRow["status"], string> = {
  PENDING: "bg-surface-2 text-muted",
  PAID: "bg-accent-soft text-accent",
  FAILED: "bg-red-400/15 text-red-300",
  CANCELLED: "bg-surface-2 text-muted line-through",
};

/** /admin/payouts: the Friday run (every pending payout) plus history with retries. */
export default function AdminPayoutQueue({ queue, history }: { queue: QueueDriver[]; history: HistoryRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; lines: string[] } | null>(null);

  const total = queue.reduce((s, d) => s + d.netCents, 0);
  const count = queue.reduce((s, d) => s + d.count, 0);
  const notReady = queue.filter((d) => !d.connectReady);

  function payAll() {
    if (!confirm(`Send ${$(total)} across ${count} payout${count === 1 ? "" : "s"} to ${queue.length} driver${queue.length === 1 ? "" : "s"} now?`)) return;
    setMsg(null);
    start(async () => {
      const { summary } = await payAllPending();
      const lines = [`Paid ${summary.paid} payout${summary.paid === 1 ? "" : "s"} — ${$(summary.paidCents)}.`];
      for (const f of summary.failed) lines.push(`${f.driver}: ${f.error}`);
      setMsg({ ok: summary.failed.length === 0, lines });
      router.refresh();
    });
  }

  function payOne(id: string, net: number, driver: string) {
    if (!confirm(`Send ${$(net)} to ${driver} now?`)) return;
    setMsg(null);
    start(async () => {
      const r = await payPayoutNow(id);
      setMsg(r.ok ? { ok: true, lines: [r.alreadyPaid ? "Already paid." : `Paid ${$(r.netCents)} to ${driver}.`] } : { ok: false, lines: [r.error] });
      router.refresh();
    });
  }

  function cancel(id: string) {
    if (!confirm("Cancel this logged delivery?")) return;
    setMsg(null);
    start(async () => {
      const r = await cancelPayout(id);
      if (!r.ok) setMsg({ ok: false, lines: [r.error ?? "Couldn't cancel."] });
      router.refresh();
    });
  }

  return (
    <>
      <section className="card mt-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Pending — the Friday run</h2>
            <p className="mt-1 text-sm text-muted">
              {count === 0 ? "Nothing pending." : <>{count} payout{count === 1 ? "" : "s"} · <strong className="text-foreground">{$(total)}</strong> total</>}
            </p>
            {notReady.length > 0 && (
              <p className="mt-1 text-xs text-red-300">
                {notReady.map((d) => d.name).join(", ")} {notReady.length === 1 ? "hasn't" : "haven't"} finished Stripe setup — their payouts will be skipped and stay pending.
              </p>
            )}
          </div>
          <button type="button" onClick={payAll} disabled={pending || count === 0} className="btn-primary rounded-full px-6 py-2.5 text-sm disabled:opacity-60">
            {pending ? "Paying…" : "Pay all pending"}
          </button>
        </div>
        {msg && (
          <div className={`mt-3 text-sm ${msg.ok ? "text-accent" : "text-red-400"}`}>
            {msg.lines.map((l, i) => <p key={i}>{l}</p>)}
          </div>
        )}
        {queue.length > 0 && (
          <ul className="mt-4 divide-y divide-border text-sm">
            {queue.map((d) => (
              <li key={d.email} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  {d.driverProfileId ? <Link href={`/admin/drivers/${d.driverProfileId}`} className="font-medium hover:text-accent">{d.name}</Link> : <span className="font-medium">{d.name}</span>}
                  <span className="ml-2 text-xs text-muted">{d.email} · {d.payPlan === "FASTER" ? "faster" : "standard"}{d.connectReady ? "" : " · Stripe not ready"}</span>
                </div>
                <span>{d.count} × → <strong>{$(d.netCents)}</strong></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mt-6 p-6">
        <h2 className="text-lg font-bold tracking-tight">History</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No payouts logged yet. Log a delivery from a fleet driver&apos;s page.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {history.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_CLS[p.status]}`}>{p.status}</span>
                  {p.driverProfileId ? <Link href={`/admin/drivers/${p.driverProfileId}`} className="hover:text-accent">{p.driver}</Link> : p.driver}
                  <span className="ml-2 text-muted">{day(p.deliveredOn)}{p.note ? ` · ${p.note}` : ""}</span>
                  {p.paidAt && <span className="ml-2 text-xs text-muted">paid {day(p.paidAt)}{p.stripeTransferId ? ` · ${p.stripeTransferId}` : ""}</span>}
                  {p.failureReason && <p className="mt-0.5 text-xs text-red-300">{p.failureReason}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">load {$(p.loadCents)} · {p.feePercent}%</span>
                  <span className="font-semibold">{$(p.netCents)}</span>
                  {(p.status === "PENDING" || p.status === "FAILED") && (
                    <>
                      <button type="button" onClick={() => payOne(p.id, p.netCents, p.driver)} disabled={pending} className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:text-foreground disabled:opacity-60">
                        {p.status === "FAILED" ? "Retry" : "Pay now"}
                      </button>
                      <button type="button" onClick={() => cancel(p.id)} disabled={pending} className="text-xs text-muted hover:text-red-300 disabled:opacity-60">Cancel</button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
