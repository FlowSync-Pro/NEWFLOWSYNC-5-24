import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { marketingEnabled } from "@/lib/marketing";
import { runFollowups } from "@/lib/followups";
import { runLeadFollowups } from "@/lib/leads";
import { alertIfPaidUnrecorded } from "@/lib/paid-unrecorded";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daily follow-up run (fix 7), called by Vercel Cron (see vercel.json). Vercel
// sends "Authorization: Bearer <CRON_SECRET>" once CRON_SECRET is set in the
// project's env vars; anything else is refused. With no CRON_SECRET set, the
// route refuses everything (fails closed).
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("Unauthorized", { status: 401 });
  // Safety check, not marketing — runs even when marketing email is off: anyone
  // who paid in the last 2 days but isn't recorded on the site → owner email.
  const paidCheck = await alertIfPaidUnrecorded();
  if (!marketingEnabled()) return NextResponse.json({ ok: true, paidCheck, skipped: "marketing email is off (no postal address set)" });
  return NextResponse.json({ ok: true, paidCheck, results: [...(await runFollowups()), await runLeadFollowups()] });
}
