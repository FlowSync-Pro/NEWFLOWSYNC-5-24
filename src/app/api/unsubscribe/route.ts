import { NextResponse } from "next/server";
import { optOutOfMarketing, verifyUnsubscribeToken } from "@/lib/marketing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-click unsubscribe from marketing email (fix 7). The link in every
// marketing email's footer is a GET; mail apps (Gmail, Yahoo) use a POST to
// the same URL from the List-Unsubscribe header. Both work without signing in.
// Only marketing email stops — account and payment emails continue.

async function handle(req: Request): Promise<string | null> {
  const userId = verifyUnsubscribeToken(new URL(req.url).searchParams.get("t"));
  if (!userId) return null;
  await optOutOfMarketing(userId);
  return userId;
}

export async function GET(req: Request) {
  const ok = await handle(req);
  return NextResponse.redirect(new URL(`/unsubscribed?status=${ok ? "ok" : "invalid"}`, req.url), 303);
}

export async function POST(req: Request) {
  const ok = await handle(req);
  return ok ? new NextResponse("Unsubscribed", { status: 200 }) : new NextResponse("Invalid link", { status: 400 });
}
