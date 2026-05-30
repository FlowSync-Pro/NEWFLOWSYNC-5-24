import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { pnlProActive } from "@/lib/subscription";

export const runtime = "nodejs";

// Cloud-saved P&L data for P&L Tracker Pro subscribers. Free/anonymous users keep
// using localStorage on the client — this route only serves entitled accounts.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ entitled: false }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !pnlProActive(user.pnlSubStatus)) {
    return NextResponse.json({ entitled: false });
  }
  return NextResponse.json({ entitled: true, txs: user.pnlData ?? [] });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !pnlProActive(user.pnlSubStatus)) {
    return NextResponse.json({ error: "not subscribed" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const txs = Array.isArray(body?.txs) ? body.txs : [];
  await prisma.user.update({ where: { id: user.id }, data: { pnlData: txs } });
  return NextResponse.json({ ok: true });
}
