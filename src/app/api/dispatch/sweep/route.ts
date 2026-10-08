import { NextResponse } from "next/server";
import { sweepAndNotifyNoTakers } from "@/lib/dispatch";
import { intakeKeyRejection } from "@/lib/intake-auth";

// The once-a-minute tick (docs/DISPATCH-INTAKE.md): the portal bot calls this
// so the owner hears "NO TAKER" soon after an offer window closes, even when no
// new load or Telegram tap arrives to trigger the sweep. Bearer
// DISPATCH_INTAKE_KEY. Only notes and pings — never assigns, never claims.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rejected = intakeKeyRejection(req, "sweep");
  if (rejected) return rejected;
  return NextResponse.json({ ok: true, noTaker: await sweepAndNotifyNoTakers() });
}
