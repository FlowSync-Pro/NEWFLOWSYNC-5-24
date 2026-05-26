import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getBump, isPremiumTier, TIERS, type TierId } from "@/lib/pricing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ configured: false });

  const body = await req.json().catch(() => ({}));
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  // Self-serve upgrade: a signed-in Standard driver pays $97 to go Premium.
  if (body.intent === "upgrade") {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Please sign in to upgrade." }, { status: 401 });
    const profile = await prisma.driverProfile.findUnique({
      where: { userId: session.userId },
      include: { user: true },
    });
    if (!profile) return NextResponse.json({ error: "Complete your profile first." }, { status: 400 });
    if (isPremiumTier(profile.tier)) return NextResponse.json({ error: "You're already on Premium." }, { status: 400 });

    const upgrade = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: { currency: "usd", unit_amount: TIERS.premium.price * 100, product_data: { name: "FlowSync Premium upgrade" } },
          quantity: 1,
        },
      ],
      customer_email: profile.user.email,
      metadata: { type: "upgrade", userId: session.userId },
      success_url: `${base}/account/services?upgraded=1`,
      cancel_url: `${base}/account/services`,
    });
    return NextResponse.json({ url: upgrade.url });
  }

  // Booking payment: customer pays a driver's quote.
  if (typeof body.bookingId === "string" && body.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: body.bookingId },
      include: { driverProfile: true },
    });
    if (!booking || !booking.quoteAmount || booking.status !== "QUOTED") {
      return NextResponse.json({ error: "This booking can't be paid right now." }, { status: 400 });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: booking.quoteAmount,
            product_data: { name: `Booking with ${booking.driverProfile.firstName}` },
          },
          quantity: 1,
        },
      ],
      metadata: { type: "booking", bookingId: booking.id },
      success_url: `${base}/book/${booking.id}/pay?status=paid`,
      cancel_url: `${base}/book/${booking.id}/pay`,
    });
    return NextResponse.json({ url: session.url });
  }
  const bumps: string[] = Array.isArray(body.bumps) ? body.bumps.filter((id: unknown) => typeof id === "string" && getBump(id)) : [];
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const primaryService = typeof body.primaryService === "string" ? body.primaryService : "";
  const tierId: TierId = body.tier === "premium" ? "premium" : "standard";
  const tier = TIERS[tierId];

  const priced = [
    { name: `FlowSync ${tier.name} listing`, amount: tier.price * 100 },
    ...bumps.map((id) => {
      const b = getBump(id)!;
      return { name: b.name, amount: b.price * 100 };
    }),
  ];

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: priced.map((item) => ({
      price_data: { currency: "usd", unit_amount: item.amount, product_data: { name: item.name } },
      quantity: 1,
    })),
    customer_email: email || undefined,
    metadata: { type: "listing", tier: tierId, bumps: bumps.join(","), firstName, lastName, primaryService },
    success_url: `${base}/signin?checkout=success`,
    cancel_url: `${base}/pricing?checkout=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
