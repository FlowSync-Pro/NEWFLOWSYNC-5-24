import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { CORE_OFFER, getBump } from "@/lib/pricing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ configured: false });

  const body = await req.json().catch(() => ({}));
  const bumps: string[] = Array.isArray(body.bumps) ? body.bumps.filter((id: unknown) => typeof id === "string" && getBump(id)) : [];
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const primaryService = typeof body.primaryService === "string" ? body.primaryService : "";

  const priced = [
    { name: CORE_OFFER.name, amount: CORE_OFFER.price * 100 },
    ...bumps.map((id) => {
      const b = getBump(id)!;
      return { name: b.name, amount: b.price * 100 };
    }),
  ];

  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: priced.map((item) => ({
      price_data: { currency: "usd", unit_amount: item.amount, product_data: { name: item.name } },
      quantity: 1,
    })),
    customer_email: email || undefined,
    metadata: { type: "listing", bumps: bumps.join(","), firstName, lastName, primaryService },
    success_url: `${base}/signin?checkout=success`,
    cancel_url: `${base}/pricing?checkout=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
