import type { DispatchLane } from "@prisma/client";
import { prisma } from "./db";
import { createLoad, rankCandidates, transitionLoad, vehicleClassFromCurriText, vehicleClassLabel } from "./dispatch";
import { notifyOwner, verdictLine } from "./dispatch-notify";
import { parseDollars } from "./payouts";

// The intake door (docs/DISPATCH-INTAKE.md): an agent that reads Curri's
// emails posts them here. It only ever creates loads as NEW or mirrors what
// Curri said about a load we already have. It never assigns, never claims.

export const INTAKE_ACTOR = "intake";

export type IntakePayload =
  | {
      kind: "opportunity";
      /** Curri delivery id or the View-delivery URL — used to de-duplicate and to match later events. */
      curriRef: string;
      rush?: boolean;
      /** ISO or "today at 10:00AM (Fri 6/5)" is the agent's job to convert; we need ISO. */
      pickupAt?: string;
      /** "Santa Fe Springs", "Santa Fe Springs, CA" or a ZIP. */
      pickupCity: string;
      dropoffCity: string;
      /** Curri's wording, e.g. "box truck-sized vehicle" or "Sprinter Van with a Liftgate". */
      vehicle: string;
      /** Curri's "(28 mi)". */
      miles?: number;
      lane?: DispatchLane;
      listed?: string;
      notes?: string;
    }
  | {
      kind: "event";
      type: "bid_placed" | "won" | "lost" | "underbid";
      curriRef: string;
      amount?: string;
      driverName?: string;
      pickupCity?: string;
      dropoffCity?: string;
      vehicle?: string;
      rush?: boolean;
    };

export type IntakeResult = { ok: true; loadId: string; status: string; duplicate?: boolean; covered?: string[] } | { ok: false; error: string };

/** Curri refs come as ids or URLs; keep the stable part. */
export function normalizeCurriRef(ref: string): string {
  const s = ref.trim();
  const m = /\/([A-Za-z0-9_-]{6,})\/?(?:[?#].*)?$/.exec(s);
  return (m ? m[1] : s).slice(0, 120);
}

async function findByRef(curriRef: string) {
  return prisma.dispatchLoad.findFirst({ where: { curriRef, createdAt: { gte: new Date(Date.now() - 48 * 3_600_000) } }, orderBy: { createdAt: "desc" } });
}

export async function ingest(payload: IntakePayload): Promise<IntakeResult> {
  if (payload.kind === "opportunity") return ingestOpportunity(payload);
  if (payload.kind === "event") return ingestEvent(payload);
  return { ok: false, error: "kind must be \"opportunity\" or \"event\"." };
}

async function ingestOpportunity(p: Extract<IntakePayload, { kind: "opportunity" }>): Promise<IntakeResult> {
  if (!p.curriRef?.trim()) return { ok: false, error: "curriRef is required." };
  const curriRef = normalizeCurriRef(p.curriRef);
  const existing = await findByRef(curriRef);
  if (existing) return { ok: true, loadId: existing.id, status: existing.status, duplicate: true };

  const vehicleClass = vehicleClassFromCurriText(p.vehicle);
  if (!vehicleClass) return { ok: false, error: `Couldn't read the vehicle from "${p.vehicle}".` };
  const rush = !!p.rush;
  const pickupAt = !rush && p.pickupAt ? new Date(p.pickupAt) : null;
  if (!rush && (!pickupAt || Number.isNaN(pickupAt.getTime()))) return { ok: false, error: "pickupAt (ISO) is required unless rush is true." };
  const listedCents = p.listed?.trim() ? parseDollars(p.listed) : null;
  const liftgate = /liftgate/i.test(p.vehicle) ? "Liftgate required" : null;

  const r = await createLoad(
    {
      curriRef,
      lane: p.lane === "BID" ? "BID" : "CLAIM",
      rush,
      pickupAt,
      pickupAddress: "",
      pickupZip: p.pickupCity,
      dropoffAddress: "",
      dropoffZip: p.dropoffCity,
      vehicleClass,
      listedCents,
      tripMiles: typeof p.miles === "number" ? p.miles : null,
      notes: [liftgate, p.notes?.trim()].filter(Boolean).join(" · "),
    },
    INTAKE_ACTOR,
  );
  if (!r.ok) return r;

  const load = await prisma.dispatchLoad.findUnique({ where: { id: r.id } });
  const candidates = load ? await rankCandidates(load) : [];
  const covered = candidates.filter((c) => c.covered);
  if (load) {
    await notifyOwner(verdictLine({
      loadId: load.id, rush: load.rush, pickupLabel: load.pickupZip, dropoffLabel: load.dropoffZip,
      vehicle: vehicleClassLabel(load.vehicleClass), tripMiles: load.tripMiles, listedCents: load.listedCents,
      covered: covered.map((c) => ({ name: c.name, miles: c.milesToPickup })),
    }));
  }
  return { ok: true, loadId: r.id, status: "NEW", covered: covered.map((c) => c.name) };
}

async function ingestEvent(p: Extract<IntakePayload, { kind: "event" }>): Promise<IntakeResult> {
  if (!p.curriRef?.trim()) return { ok: false, error: "curriRef is required." };
  const curriRef = normalizeCurriRef(p.curriRef);
  const load = await findByRef(curriRef);
  const amountCents = p.amount?.trim() ? parseDollars(p.amount) : null;
  const where = [p.pickupCity, p.dropoffCity].filter(Boolean).join(" → ") || curriRef;

  if (p.type === "underbid") {
    await notifyOwner(`⚠️ UNDERBID on ${where}${amountCents ? ` — beat ${(amountCents / 100).toFixed(2)} or claim now` : ""}${load ? `\n${process.env.NEXT_PUBLIC_SITE_URL || ""}/admin/dispatch/${load.id}` : ""}`);
    if (load) await prisma.dispatchEvent.create({ data: { loadId: load.id, actorId: INTAKE_ACTOR, note: `Curri: underbid${amountCents ? ` — now $${(amountCents / 100).toFixed(2)}` : ""}` } });
    return load ? { ok: true, loadId: load.id, status: load.status } : { ok: false, error: "No load with that curriRef in the last 48 h (noted the owner anyway)." };
  }

  if (!load) return { ok: false, error: "No load with that curriRef in the last 48 h." };

  const note = `Curri email: ${p.type.replace("_", " ")}${amountCents ? ` $${(amountCents / 100).toFixed(2)}` : ""}${p.driverName ? ` · driver ${p.driverName}` : ""}`;
  if (p.type === "bid_placed") {
    if (load.status === "ASSIGNED") {
      const r = await transitionLoad(load.id, "PLACED", INTAKE_ACTOR, { bidCents: amountCents, note });
      if (!r.ok) return r;
    } else {
      await prisma.dispatchEvent.create({ data: { loadId: load.id, actorId: INTAKE_ACTOR, note: `${note} (load is ${load.status}; not changed)` } });
    }
  } else if (p.type === "won") {
    const from = load.status;
    if (from === "ASSIGNED" || from === "PLACED") {
      const r = await transitionLoad(load.id, "AWARDED", INTAKE_ACTOR, { note });
      if (!r.ok) return r;
    } else {
      await prisma.dispatchEvent.create({ data: { loadId: load.id, actorId: INTAKE_ACTOR, note: `${note} (load is ${from}; not changed)` } });
    }
    await notifyOwner(`🏁 WON ${where} — assign the driver in the Curri portal if you haven't. ${process.env.NEXT_PUBLIC_SITE_URL || ""}/admin/dispatch/${load.id}`);
  } else if (p.type === "lost") {
    if (load.status === "PLACED" || load.status === "ASSIGNED") {
      const r = await transitionLoad(load.id, load.status === "ASSIGNED" ? "CANCELLED" : "LOST", INTAKE_ACTOR, { note: load.status === "ASSIGNED" ? "Curri: assigned to another courier before we placed" : note });
      if (!r.ok) return r;
    } else {
      await prisma.dispatchEvent.create({ data: { loadId: load.id, actorId: INTAKE_ACTOR, note: `${note} (load is ${load.status}; not changed)` } });
    }
  }
  const fresh = await prisma.dispatchLoad.findUnique({ where: { id: load.id }, select: { status: true } });
  return { ok: true, loadId: load.id, status: fresh?.status ?? load.status };
}
