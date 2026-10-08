"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelPayout, logDeliveryForDriver, payPayoutNow, setPayPlan } from "@/app/actions/admin";
import { FLEET } from "@/lib/pricing";

export interface PayoutRow {
  id: string;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  loadCents: number;
  feePercent: number;
  netCents: number;
  note: string | null;
  deliveredOn: string;
  paidAt: string | null;
  failureReason: string | null;
}

const $ = (c: number) => `$${(c / 100).toFixed(2)}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_CLS: Record<PayoutRow["status"], string> = {
  PENDING: "bg-surface-2 text-muted",
  PAID: "bg-accent-soft text-accent",
  FAILED: "bg-red-400/15 text-red-300",
  CANCELLED: "bg-surface-2 text-muted line-through",
};

/** Admin-only, fleet members: pay plan, "Log delivery", and this driver's payouts. */
export default function AdminPayouts({
  driverProfileId,
  payPlan,
  connectReady,
  payouts,
  initial,
}: {
  driverProfileId: string;
  payPlan: "STANDARD" | "FASTER";
  connectReady: boolean;
  payouts: PayoutRow[];
  /** Pre-filled from a dispatch load's "Delivered → log payout" link. */
  initial?: { loadId: string; amount: string; note: string; deliveredOn: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [deliveredOn, setDeliveredOn] = useState(initial?.deliveredOn || today());
  const [note, setNote] = useState(initial?.note ?? "");
  const [loadId, setLoadId] = useState(initial?.loadId);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const feePercent = payPlan === "FASTER" ? FLEET.fastPayoutFeePercent : FLEET.dispatchFeePercent;
  const cents = /^\d+(\.\d{1,2})?$/.test(amount.trim()) ? Math.round(parseFloat(amount) * 100) : 0;
  const feeCents = Math.round((cents * feePercent) / 100);
  const netCents = cents - feeCents;

  function changePlan(plan: "STANDARD" | "FASTER") {
    setMsg(null);
    start(async () => {
      const r = await setPayPlan(driverProfileId, plan);
      if (!r.ok) { setMsg({ ok: false, text: r.error ?? "Couldn't update." }); return; }
      router.refresh();
    });
  }

  function log(payNow: boolean) {
    setMsg(null);
    if (payNow && !confirm(`Send ${$(netCents)} to this driver now? (load ${$(cents)}, ${feePercent}% fee)`)) return;
    start(async () => {
      const r = await logDeliveryForDriver(driverProfileId, { amount, deliveredOn, note, payNow, dispatchLoadId: loadId });
      if (!r.ok) { setMsg({ ok: false, text: r.error }); return; }
      if (r.pay) {
        setMsg(r.pay.ok ? { ok: true, text: `Logged and paid ${$(r.pay.netCents)}.` } : { ok: false, text: `Logged, but not paid: ${r.pay.error}` });
      } else {
        setMsg({ ok: true, text: `Logged ${$(r.netCents)} net — pays with the next Friday run.` });
      }
      setAmount(""); setNote(""); setLoadId(undefined);
      router.refresh();
    });
  }

  function payNow(id: string, net: number) {
    if (!confirm(`Send ${$(net)} to this driver now?`)) return;
    setMsg(null);
    start(async () => {
      const r = await payPayoutNow(id);
      setMsg(r.ok ? { ok: true, text: r.alreadyPaid ? "Already paid." : `Paid ${$(r.netCents)}.` } : { ok: false, text: r.error });
      router.refresh();
    });
  }

  function cancel(id: string) {
    if (!confirm("Cancel this logged delivery? It stays in the list as cancelled.")) return;
    setMsg(null);
    start(async () => {
      const r = await cancelPayout(id);
      if (!r.ok) setMsg({ ok: false, text: r.error ?? "Couldn't cancel." });
      router.refresh();
    });
  }

  const totalPending = payouts.filter((p) => p.status === "PENDING").reduce((s, p) => s + p.netCents, 0);

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Fleet payouts</p>
          {loadId && <p className="mt-1 text-xs text-accent">Pre-filled from the dispatch load — check the amount, then log it.</p>}
          <p className="mt-1 text-sm text-muted">
            {connectReady ? "Stripe ready — transfers will go through." : "Stripe not ready yet — you can log deliveries, but paying waits until the driver finishes Stripe setup."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Pay plan</span>
          {(["STANDARD", "FASTER"] as const).map((plan) => (
            <button
              key={plan}
              type="button"
              disabled={pending}
              onClick={() => plan !== payPlan && changePlan(plan)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${plan === payPlan ? "bg-accent text-[#04130a]" : "border border-border text-muted hover:text-foreground"}`}
            >
              {plan === "STANDARD" ? `Standard · Friday · ${FLEET.dispatchFeePercent}%` : `Faster · 1–2 days · ${FLEET.fastPayoutFeePercent}%`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_2fr]">
        <label className="text-xs text-muted">
          Load amount (what Curri paid)
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="145.00" className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent" />
        </label>
        <label className="text-xs text-muted">
          Delivered on
          <input type="date" value={deliveredOn} max={today()} onChange={(e) => setDeliveredOn(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent" />
        </label>
        <label className="text-xs text-muted">
          Note (load ref / route, shown on the receipt)
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Curri #48213 · Fresno → Clovis" className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {cents > 0 ? <>Fee {feePercent}% = {$(feeCents)} · <strong className="text-foreground">Driver gets {$(netCents)}</strong></> : "Enter a load amount to see the net."}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => log(false)} disabled={pending || cents <= 0} className="rounded-full border border-border px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-60">
            Log for Friday
          </button>
          <button type="button" onClick={() => log(true)} disabled={pending || cents <= 0 || !connectReady} className="btn-primary rounded-full px-5 py-2 text-sm disabled:opacity-60">
            {pending ? "Working…" : "Log and pay now"}
          </button>
        </div>
      </div>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-accent" : "text-red-400"}`}>{msg.text}</p>}

      {payouts.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Payouts</p>
            {totalPending > 0 && <p className="text-xs text-muted">Pending: {$(totalPending)}</p>}
          </div>
          <ul className="mt-2 divide-y divide-border text-sm">
            {payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_CLS[p.status]}`}>{p.status}</span>
                  <span className="text-muted">{day(p.deliveredOn)}</span>
                  {p.note && <span className="ml-2 text-muted">· {p.note}</span>}
                  {p.failureReason && <p className="mt-0.5 text-xs text-red-300">{p.failureReason}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">load {$(p.loadCents)} · {p.feePercent}%</span>
                  <span className="font-semibold">{$(p.netCents)}</span>
                  {(p.status === "PENDING" || p.status === "FAILED") && (
                    <>
                      <button type="button" onClick={() => payNow(p.id, p.netCents)} disabled={pending || !connectReady} className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:text-foreground disabled:opacity-60">
                        {p.status === "FAILED" ? "Retry" : "Pay now"}
                      </button>
                      <button type="button" onClick={() => cancel(p.id)} disabled={pending} className="text-xs text-muted hover:text-red-300 disabled:opacity-60">Cancel</button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
