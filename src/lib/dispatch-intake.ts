import type { DispatchLane } from "@prisma/client";
import { prisma } from "./db";
import { autoOffer, createLoad, OFFER_MINUTES, OFFER_MINUTES_RUSH, transitionLoad, vehicleClassFromCurriText, vehicleClassLabel } from "./dispatch";
import { notifyOffersWithdrawn, notifyOwner, verdictLine } from "./dispatch-notify";
import { parseDollars } from "./payouts";

// The intake door (docs/DISPATCH-INTAKE.md): agents that watch Curri — the
// email reader, and the owner's portal-feed bot ("Curri Dispatch") — post
// loads here. It only ever creates loads (then auto-offers them to Active
// drivers) or mirrors what Curri said about a load we already have. It never
// assigns, never claims.

export const INTAKE_ACTOR = "intake";

export type IntakePayload =
  | {
      kind: "opportunity";
      /** Curri delivery id or the View-delivery URL — used to de-duplicate and to match later events. */
      curriRef: string;
      rush?: boolean;
      /** ISO or "today at 10:00AM (Fri 6/5)" is the agent's job to convert; we need ISO. */
      pickupAt?: string;
      /** "Santa Fe Springs", "Santa Fe Springs, CA" or a ZIP. Optional when the address ends in the city. */
      pickupCity?: string;
      dropoffCity?: string;
      /** Full street address when the source has it (the portal feed does), e.g. "Eagle Roofing Products, 2352 N Locust Ave, Rialto". */
      pickupAddress?: string;
      dropoffAddress?: string;
      /** Curri's wording, e.g. "box truck-sized vehicle" or "Sprinter Van with a Liftgate". */
      vehicle: string;
      /** Curri's "(28 mi)". */
      miles?: number;
      lane?: DispatchLane;
      /** Listed price — dollars as text ("162.77") or a number. `pay` is accepted as the same thing. */
      listed?: string | number;
      pay?: string | number;
      /** "Liftgate", "Priority: rush" … — added to the driver notes. */
      accessories?: string;
      notes?: string;
      /** Where the agent saw it: "email" or "portal". Logged only. */
      source?: string;
    }
  | {
      kind: "event";
      /** "gone" = the load left Curri's feed (taken by someone, or withdrawn). */
      type: "bid_placed" | "won" | "lost" | "underbid" | "gone";
      curriRef: string;
      amount?: string;
      driverName?: string;
      pickupCity?: string;
      dropoffCity?: string;
      vehicle?: string;
      rush?: boolean;
    };

export type IntakeResult = { ok: true; loadId: string; status: string; duplicate?: boolean; covered?: string[]; offered?: number } | { ok: false; error: string };

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

/** Text or number dollars → cents; null when absent; NaN-safe. */
function dollarsToCents(v: string | number | undefined | null): number | null | "bad" {
  if (v === undefined || v === null || v === "") return null;
  const c = parseDollars(typeof v === "number" ? v.toFixed(2) : v);
  return c === null ? "bad" : c;
}

/**
 * The location key for the board: the city given, else the tail of the
 * address — "…, Rialto" → "Rialto", "…, Santa Ana, CA 92704" → "92704".
 */
export function locationFrom(city: string | undefined, address: string | undefined): string {
  if (city?.trim()) return city.trim();
  const a = (address ?? "").trim();
  if (!a) return "";
  const zip = /\b(\d{5})(?:-\d{4})?\s*$/.exec(a);
  if (zip) return zip[1];
  const parts = a.split(",").map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 2 && /^[A-Za-z]{2}$/.test(parts[parts.length - 1])) return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
  return parts[parts.length - 1] ?? "";
}

async function ingestOpportunity(p: Extract<IntakePayload, { kind: "opportunity" }>): Promise<IntakeResult> {
  if (!p.curriRef?.trim()) return { ok: false, error: "curriRef is required." };
  const pickupKey = locationFrom(p.pickupCity, p.pickupAddress);
  const dropoffKey = locationFrom(p.dropoffCity, p.dropoffAddress);
  if (!pickupKey || !dropoffKey) return { ok: false, error: "Send pickupCity/dropoffCity or addresses that end in the city." };
  const curriRef = normalizeCurriRef(p.curriRef);
  const existing = await findByRef(curriRef);
  if (existing) return { ok: true, loadId: existing.id, status: existing.status, duplicate: true };

  const vehicleClass = vehicleClassFromCurriText(p.vehicle);
  if (!vehicleClass) return { ok: false, error: `Couldn't read the vehicle from "${p.vehicle}".` };
  const rush = !!p.rush || /priority:\s*rush/i.test(p.accessories ?? "");
  const pickupAt = !rush && p.pickupAt ? new Date(p.pickupAt) : null;
  if (!rush && (!pickupAt || Number.isNaN(pickupAt.getTime()))) return { ok: false, error: "pickupAt (ISO) is required unless rush is true." };
  const listed = dollarsToCents(p.listed ?? p.pay);
  if (listed === "bad") return { ok: false, error: "listed/pay must be a dollar amount, e.g. 162.77." };
  const listedCents = listed;
  const liftgate = /liftgate/i.test(`${p.vehicle} ${p.accessories ?? ""}`) ? "Liftgate required" : null;
  const extras = (p.accessories ?? "").replace(/accessories:\s*/i, "").replace(/priority:\s*rush/i, "").replace(/liftgate/i, "").replace(/[·,\s]+$|^[·,\s]+/g, "").trim();

  const r = await createLoad(
    {
      curriRef,
      lane: p.lane === "BID" ? "BID" : "CLAIM",
      rush,
      pickupAt,
      pickupAddress: p.pickupAddress?.trim() ?? "",
      pickupZip: pickupKey,
      dropoffAddress: p.dropoffAddress?.trim() ?? "",
      dropoffZip: dropoffKey,
      vehicleClass,
      listedCents,
      tripMiles: typeof p.miles === "number" ? p.miles : null,
      notes: [liftgate, extras || null, p.notes?.trim()].filter(Boolean).join(" · "),
    },
    INTAKE_ACTOR,
  );
  if (!r.ok) return r;
  if (p.source) await prisma.dispatchEvent.create({ data: { loadId: r.id, actorId: INTAKE_ACTOR, note: `Source: ${String(p.source).slice(0, 40)}` } });

  // Offer it straight away to every matching Active driver on Telegram (owner decision 2026-10-08).
  const offers = await autoOffer(r.id, INTAKE_ACTOR);
  const load = await prisma.dispatchLoad.findUnique({ where: { id: r.id } });
  if (load) {
    await notifyOwner(verdictLine({
      loadId: load.id, rush: load.rush, pickupLabel: load.pickupZip, dropoffLabel: load.dropoffZip,
      vehicle: vehicleClassLabel(load.vehicleClass), tripMiles: load.tripMiles, listedCents: load.listedCents,
      offeredTo: offers.offeredTo, notOnTelegram: offers.notOnTelegram,
      offerMinutes: load.rush ? OFFER_MINUTES_RUSH : OFFER_MINUTES,
    }));
  }
  return { ok: true, loadId: r.id, status: load?.status ?? "NEW", covered: [...offers.offeredTo, ...offers.notOnTelegram].map((c) => c.name), offered: offers.offeredTo.length };
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

  if (p.type === "gone") {
    // A load also leaves the feed when WE claim it, so only withdraw loads nobody
    // has accepted yet. Once a driver is on it, just note it.
    if (load.status === "NEW" || load.status === "OFFERED") {
      const open = await prisma.dispatchOffer.findMany({ where: { loadId: load.id, response: "PENDING" }, select: { id: true } });
      const r = await transitionLoad(load.id, "CANCELLED", INTAKE_ACTOR, { note: "Left the Curri feed before anyone accepted (another carrier took it, or it was withdrawn)" });
      if (!r.ok) return r;
      await notifyOffersWithdrawn(load.id, open.map((o) => o.id));
    } else {
      await prisma.dispatchEvent.create({ data: { loadId: load.id, actorId: INTAKE_ACTOR, note: `Left the Curri feed (load is ${load.status.toLowerCase()} — likely our claim)` } });
    }
    const fresh = await prisma.dispatchLoad.findUnique({ where: { id: load.id }, select: { status: true } });
    return { ok: true, loadId: load.id, status: fresh?.status ?? load.status };
  }

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
