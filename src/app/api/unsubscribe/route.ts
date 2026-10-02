import { NextResponse } from "next/server";
import { optOutOfMarketing, verifyUnsubscribeToken } from "@/lib/marketing";
import { unsubscribeLead, verifyLeadUnsubscribeToken } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-click unsubscribe from marketing email (fix 7). The link in every
// marketing email's footer is a GET; mail apps (Gmail, Yahoo) use a POST to
// the same URL from the List-Unsubscribe header. Both work without signing in.
// Only marketing email stops — account and payment emails continue.

// Quiz leads (no account) carry an `l` token instead of `t`.
async function handle(req: Request): Promise<string | null> {
  const params = new URL(req.url).searchParams;
  const leadId = verifyLeadUnsubscribeToken(params.get("l"));
  if (leadId) {
    await unsubscribeLead(leadId);
    return leadId;
  }
  const userId = verifyUnsubscribeToken(params.get("t"));
  if (!userId) return null;
  await optOutOfMarketing(userId);
  return userId;
}

export async function GET(req: Request) {
  const ok = await handle(req);
  const lead = new URL(req.url).searchParams.has("l");
  return NextResponse.redirect(new URL(`/unsubscribed?status=${ok ? "ok" : "invalid"}${ok && lead ? "&who=lead" : ""}`, req.url), 303);
}

export async function POST(req: Request) {
  const ok = await handle(req);
  return ok ? new NextResponse("Unsubscribed", { status: 200 }) : new NextResponse("Invalid link", { status: 400 });
}
