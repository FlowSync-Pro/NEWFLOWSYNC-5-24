import { NextResponse } from "next/server";
import { ingest, type IntakePayload } from "@/lib/dispatch-intake";
import { sweepAndNotifyNoTakers } from "@/lib/dispatch";
import { intakeKeyRejection } from "@/lib/intake-auth";

// The intake door for agents that read Curri's emails (docs/DISPATCH-INTAKE.md).
// Bearer DISPATCH_INTAKE_KEY. Creates loads as NEW or mirrors Curri's bid
// placed / won / lost / underbid emails onto loads we already have. Never
// assigns, never claims. Without the key configured it refuses everything.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 16 * 1024;

export async function POST(req: Request) {
  const rejected = intakeKeyRejection(req, "intake");
  if (rejected) return rejected;
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BYTES) return NextResponse.json({ ok: false, error: "Payload too large." }, { status: 413 });
  let body: IntakePayload;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  try {
    const r = await ingest(body);
    await sweepAndNotifyNoTakers(); // free "nobody accepted" check on every call
    console.log(`[intake] ${body.kind}${"type" in body ? `/${body.type}` : ""} ${body.curriRef ?? ""} → ${r.ok ? `${r.status} ${r.loadId}${r.duplicate ? " (duplicate)" : ""}` : r.error}`);
    return NextResponse.json(r, { status: r.ok ? 200 : 422 });
  } catch (e) {
    console.error("[intake] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "Intake failed." }, { status: 500 });
  }
}
