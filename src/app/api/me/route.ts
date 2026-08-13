import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Read-only auth probe for the client-side Navbar. Reports ONLY whether the
// current request carries a valid session, so the navbar can show
// "My account / Sign out" instead of "Sign in / Become a driver" for
// signed-in drivers. It does NOT create, modify, or destroy sessions — it
// just reads the existing cookie via getSession(). No PII is returned.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  return NextResponse.json(
    { authed: !!session },
    { headers: { "cache-control": "no-store, max-age=0" } },
  );
}
