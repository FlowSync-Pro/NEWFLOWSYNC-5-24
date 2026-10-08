import { NextResponse } from "next/server";
import { safeSecretEqual } from "./telegram-utils";

// Bearer DISPATCH_INTAKE_KEY check shared by the intake door and the sweep tick.
// Without the key configured it refuses everything (fails closed).
export function intakeKeyRejection(req: Request, tag: string): NextResponse | null {
  const key = process.env.DISPATCH_INTAKE_KEY?.trim();
  if (!key) return NextResponse.json({ ok: false, error: "Intake isn't configured." }, { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!given || !safeSecretEqual(given, key)) {
    console.warn(`[${tag}] rejected: bad key`);
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  return null;
}
