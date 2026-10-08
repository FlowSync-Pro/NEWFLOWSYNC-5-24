"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { assignDispatchLoad, offerDispatchLoad, respondDispatchOffer, sendToActiveDrivers, setDispatchLane, transitionDispatchLoad } from "@/app/actions/dispatch";
import { ptDate, ptTime } from "@/lib/pt-time";

export interface PanelLoad {
  id: string;
  status: "NEW" | "OFFERED" | "ASSIGNED" | "PLACED" | "AWARDED" | "LOST" | "IN_PROGRESS" | "DELIVERED" | "CANCELLED";
  lane: "CLAIM" | "BID";
  rush: boolean;
  pickupAt: string;
  pickupAddress: string;
  pickupZip: string;
  dropoffAddress: string;
  dropoffZip: string;
  tripMiles: number | null;
  vehicleLabel: string;
  listedCents: number | null;
  bidCents: number | null;
  notes: string | null;
  curriRef: string | null;
  assigned: { profileId: string; name: string; phone: string | null; email: string } | null;
  payoutId: string | null;
}
export interface PanelCandidate {
  profileId: string;
  name: string;
  phone: string | null;
  vehicleLabel: string;
  baseZip: string | null;
  milesToPickup: number | null;
  minutesToPickup: number | null;
  onDuty: boolean;
  onTelegram: boolean;
  covered: boolean;
  /** Activated, right vehicle, not busy — can be assigned once they've said yes. */
  assignable: boolean;
  reasons: string[];
}
export interface PanelOffer { id: string; profileId: string; name: string; response: "PENDING" | "ACCEPTED" | "PASSED" | "EXPIRED"; expiresAt: string }
export interface PanelEvent { id: string; at: string; actor: string; from: string | null; to: string | null; note: string | null }
export type PanelBid = { suggested: number; floor: number; worthIt: number; costPerMile: number; costPerMileSource: string; deadheadMiles: number; hours: number; forName: string } | null;

const $ = (c: number | null) => (c === null ? "—" : `$${(c / 100).toFixed(2)}`);

export default function DispatchLoadPanel({ load, candidates, offers, events, bid }: { load: PanelLoad; candidates: PanelCandidate[]; offers: PanelOffer[]; events: PanelEvent[]; bid: PanelBid }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [picked, setPicked] = useState<string[]>(candidates.filter((c) => c.covered).slice(0, 3).map((c) => c.profileId));
  const [bidInput, setBidInput] = useState(bid ? String(bid.suggested) : "");
  const [note, setNote] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string } | { ok: true } | { ok: false; error: string }>, okText: string) => {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: (r as { error?: string }).error ?? "Couldn't do that." });
      router.refresh();
    });
  };
  const covered = candidates.filter((c) => c.covered);
  const pendingOffers = offers.filter((o) => o.response === "PENDING");
  const open = !["LOST", "DELIVERED", "CANCELLED"].includes(load.status);
  const btn = "rounded-full px-4 py-2 text-sm disabled:opacity-60";
  const ghost = `${btn} border border-border text-muted hover:text-foreground`;
  const primary = `${btn} btn-primary`;
  const input = "rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

  return (
    <>
      {/* Verdict */}
      <section className={`mt-6 rounded-2xl border p-6 ${load.assigned ? "border-accent/40 bg-accent-soft" : covered.length ? "card" : "border-red-400/40 bg-red-400/10"}`}>
        {load.assigned ? (
          <>
            <h2 className="text-lg font-bold tracking-tight text-accent">{load.assigned.name} is on this load</h2>
            <p className="mt-1 text-sm text-foreground/90">{load.status === "ASSIGNED" ? (load.lane === "CLAIM" ? "Claim it in the Curri portal now, then tap “Claimed in Curri”." : "Place the bid in the Curri portal, then record it below.") : `Status: ${load.status.replace("_", " ").toLowerCase()}.`}</p>
          </>
        ) : covered.length ? (
          <>
            <h2 className="text-lg font-bold tracking-tight">{pendingOffers.length ? `Waiting for an Accept — offered to ${pendingOffers.length}` : `${covered.length} Active driver${covered.length === 1 ? "" : "s"} in range`}</h2>
            <p className="mt-1 text-sm text-muted">Don&apos;t claim in Curri until a driver accepts. {covered.filter((c) => !c.onTelegram).length ? `${covered.filter((c) => !c.onTelegram).length} matching driver(s) aren't on Telegram — text them.` : ""}</p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold tracking-tight text-red-300">Not covered — do not claim</h2>
            <p className="mt-1 text-sm text-foreground/90">No Active driver fits this load. If you reach someone by phone, use “Assign — confirmed by phone” below.</p>
          </>
        )}
        {bid && (
          <p className="mt-3 text-sm text-muted">
            Suggested bid for {bid.forName}: <strong className="text-foreground">${bid.suggested}</strong> · cost floor ${bid.floor} · worth it at ${bid.worthIt} · {bid.costPerMile}/mi ({bid.costPerMileSource}) · {bid.deadheadMiles} mi deadhead · {bid.hours} h
            {load.listedCents !== null && <> · listed {$(load.listedCents)}</>}
          </p>
        )}
      </section>

      {/* Status + actions */}
      <section className="card mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Status: {load.status.replace("_", " ")}</p>
            {load.assigned && <p className="mt-1 text-sm text-muted">Driver: <Link href={`/admin/drivers/${load.assigned.profileId}`} className="text-foreground hover:text-accent">{load.assigned.name}</Link>{load.assigned.phone ? ` · ${load.assigned.phone}` : ""} · {load.assigned.email}</p>}
            {load.bidCents !== null && <p className="mt-1 text-sm text-muted">Bid placed: {$(load.bidCents)}</p>}
          </div>
          {open && (
            <div className="flex flex-wrap items-center gap-2">
              {(load.status === "NEW" || load.status === "OFFERED") && (
                <button type="button" className={ghost} disabled={pending} onClick={() => run(() => setDispatchLane(load.id, load.lane === "CLAIM" ? "BID" : "CLAIM"), load.lane === "CLAIM" ? "Switched to the bid lane." : "Switched to the claim lane.")}>
                  {load.lane === "CLAIM" ? "Switch to bid lane" : "Switch to claim lane"}
                </button>
              )}
              {(load.status === "ASSIGNED" || load.status === "OFFERED") && (
                <button type="button" className={ghost} disabled={pending} onClick={() => run(() => transitionDispatchLoad(load.id, "NEW"), "Unassigned — back to new.")}>Unassign</button>
              )}
              {load.status === "ASSIGNED" && load.lane === "CLAIM" && (
                <button type="button" className={primary} disabled={pending} onClick={() => run(() => transitionDispatchLoad(load.id, "AWARDED", { note: "Claimed in Curri" }), "Marked claimed in Curri.")}>Claimed in Curri</button>
              )}
              {load.status === "ASSIGNED" && load.lane === "BID" && (
                <>
                  <input value={bidInput} onChange={(e) => setBidInput(e.target.value)} inputMode="decimal" placeholder="Bid $" className={`${input} w-28`} />
                  <button type="button" className={primary} disabled={pending} onClick={() => run(() => transitionDispatchLoad(load.id, "PLACED", { bid: bidInput }), "Bid recorded.")}>Bid placed</button>
                </>
              )}
              {load.status === "PLACED" && (
                <>
                  <button type="button" className={primary} disabled={pending} onClick={() => run(() => transitionDispatchLoad(load.id, "AWARDED"), "Awarded.")}>Awarded</button>
                  <button type="button" className={ghost} disabled={pending} onClick={() => run(() => transitionDispatchLoad(load.id, "LOST"), "Marked lost.")}>Lost</button>
                </>
              )}
              {load.status === "AWARDED" && (
                <button type="button" className={ghost} disabled={pending} onClick={() => run(() => transitionDispatchLoad(load.id, "IN_PROGRESS"), "In progress.")}>Driver started</button>
              )}
              {(load.status === "AWARDED" || load.status === "IN_PROGRESS") && load.assigned && (
                <Link
                  href={`/admin/drivers/${load.assigned.profileId}?loadId=${load.id}&loadAmount=${load.bidCents ?? load.listedCents ?? ""}&loadNote=${encodeURIComponent(`Curri ${load.curriRef ?? ""} ${load.pickupZip} → ${load.dropoffZip}`.trim())}&loadDate=${ptDate(load.pickupAt)}`}
                  className={primary}
                >
                  Delivered → log payout
                </Link>
              )}
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason" className={`${input} w-36`} />
              <button type="button" className={`${btn} text-muted hover:text-red-300`} disabled={pending} onClick={() => run(() => transitionDispatchLoad(load.id, "CANCELLED", { note }), "Cancelled.")}>Cancel load</button>
            </div>
          )}
        </div>
        {load.payoutId && <p className="mt-2 text-sm text-accent">Payout logged for this load.</p>}
        {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-accent" : "text-red-400"}`}>{msg.text}</p>}
      </section>

      {/* Offers */}
      {offers.length > 0 && (
        <section className="card mt-6 p-6">
          <h2 className="text-lg font-bold tracking-tight">Offers</h2>
          <p className="mt-1 text-xs text-muted">Sent on Telegram; drivers tap Accept or Pass. For anyone you texted instead, record their answer here. First accept wins.</p>
          <ul className="mt-3 divide-y divide-border text-sm">
            {offers.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{o.name} <span className="text-muted">· {o.response.toLowerCase()}{o.response === "PENDING" ? ` · expires ${ptTime(o.expiresAt)}` : ""}</span></span>
                {o.response === "PENDING" && load.status === "OFFERED" && (
                  <span className="flex gap-2">
                    <button type="button" className={primary} disabled={pending} onClick={() => run(() => respondDispatchOffer(load.id, o.id, "ACCEPTED"), `${o.name} accepted — assigned.`)}>Accepted</button>
                    <button type="button" className={ghost} disabled={pending} onClick={() => run(() => respondDispatchOffer(load.id, o.id, "PASSED"), `${o.name} passed.`)}>Passed</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Candidates */}
      <section className="card mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight">Drivers, nearest first</h2>
          {open && (load.status === "NEW" || load.status === "OFFERED") && (
            <span className="flex flex-wrap gap-2">
              <button type="button" className={primary} disabled={pending || covered.length === 0} onClick={() => run(() => sendToActiveDrivers(load.id), "Sent to every Active driver in range.")}>
                Send to all Active in range
              </button>
              <button type="button" className={ghost} disabled={pending || picked.length === 0} onClick={() => run(() => offerDispatchLoad(load.id, picked), `Offered to ${picked.length}.`)}>
                Offer to {picked.length} selected
              </button>
            </span>
          )}
        </div>
        {candidates.length === 0 && <p className="mt-2 text-sm text-muted">No fleet drivers yet.</p>}
        <ul className="mt-3 divide-y divide-border text-sm">
          {candidates.map((c) => (
            <li key={c.profileId} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="flex items-center gap-3">
                {open && (load.status === "NEW" || load.status === "OFFERED") && (
                  <input type="checkbox" checked={picked.includes(c.profileId)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c.profileId] : p.filter((x) => x !== c.profileId)))} />
                )}
                <div>
                  <span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${c.covered ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"}`}>{c.covered ? "match" : c.onDuty ? "active" : "inactive"}</span>
                  <Link href={`/admin/drivers/${c.profileId}`} className="font-medium hover:text-accent">{c.name}</Link>
                  <span className="ml-2 text-muted">{c.vehicleLabel}{c.baseZip ? ` · ${c.baseZip}` : ""}{c.phone ? ` · ${c.phone}` : ""}{c.onTelegram ? "" : " · not on Telegram"}</span>
                  {c.reasons.length > 0 && <p className="mt-0.5 text-xs text-muted">{c.reasons.join(" · ")}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{c.milesToPickup === null ? "? mi" : `${c.milesToPickup} mi`}</span>
                {c.minutesToPickup !== null && <span className="text-xs text-muted">~{c.minutesToPickup} min</span>}
                {open && (load.status === "NEW" || load.status === "OFFERED") && (
                  <button
                    type="button"
                    className={ghost}
                    disabled={pending || !c.assignable}
                    title={c.assignable ? "Only after the driver said yes to this load by phone" : "Not activated, wrong vehicle, or busy"}
                    onClick={() => { if (confirm(`Did ${c.name} confirm this load with you by phone?`)) run(() => assignDispatchLoad(load.id, c.profileId), `Assigned to ${c.name}.`); }}
                  >
                    Assign — confirmed by phone
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Log */}
      <section className="card mt-6 p-6">
        <h2 className="text-lg font-bold tracking-tight">Log</h2>
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {events.map((e) => (
            <li key={e.id}>{ptTime(e.at)} · {e.actor} · {e.from && e.to ? `${e.from} → ${e.to}` : e.to ?? ""}{e.note ? ` · ${e.note}` : ""}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
