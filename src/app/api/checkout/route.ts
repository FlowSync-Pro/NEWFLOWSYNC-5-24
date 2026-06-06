import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getBump, isPremiumTier, PNL_PRO, TIERS, type TierId } from "@/lib/pricing";
import { pnlProActive } from "@/lib/subscription";

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

  // Post-payment one-time offer: a driver who just paid $17 takes the $97
  // Premium upgrade. No sign-in required — we identify them via the just-
  // completed listing Stripe session id.
  if (body.intent === "oto-upgrade" && typeof body.session_id === "string" && body.session_id) {
    // Verify the original listing session is real and paid.
    let original: import("stripe").default.Checkout.Session;
    try {
      original = await stripe.checkout.sessions.retrieve(body.session_id);
    } catch {
      return NextResponse.json({ error: "Invalid checkout session." }, { status: 400 });
    }
    if (original.payment_status !== "paid" || original.metadata?.type !== "listing") {
      return NextResponse.json({ error: "Original payment not found." }, { status: 400 });
    }
    const email = (original.customer_details?.email ?? "").toLowerCase();
    if (!email) return NextResponse.json({ error: "Could not identify your account." }, { status: 400 });

    // The listing webhook is async — give it a moment to create the user.
    let user = await prisma.user.findUnique({ where: { email }, include: { driverProfile: true } });
    for (let i = 0; i < 5 && !user; i++) {
      await new Promise((r) => setTimeout(r, 500));
      user = await prisma.user.findUnique({ where: { email }, include: { driverProfile: true } });
    }
    if (!user) {
      return NextResponse.json(
        { error: "Your account is still being set up. Please try again in a moment from your account." },
        { status: 503 },
      );
    }
    if (user.driverProfile && isPremiumTier(user.driverProfile.tier)) {
      return NextResponse.json({ error: "You're already on Premium." }, { status: 400 });
    }

    const oto = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: { currency: "usd", unit_amount: TIERS.premium.price * 100, product_data: { name: "FlowSync Premium upgrade" } },
          quantity: 1,
        },
      ],
      customer_email: email,
      // Reuses the existing fulfillUpgrade webhook handler.
      metadata: { type: "upgrade", userId: user.id, source: "oto" },
      // Use the NEW upgrade session id (Stripe substitutes it) so signin
      // fires Purchase($97) with a distinct Meta eventID. The original $17
      // Purchase fires on /welcome/premium-offer with its own eventID. Two
      // events, two values, full attribution.
      success_url: `${base}/signin?checkout=success&session_id={CHECKOUT_SESSION_ID}&upgraded=1`,
      cancel_url: `${base}/welcome/premium-offer?session_id=${encodeURIComponent(body.session_id)}`,
    });
    return NextResponse.json({ url: oto.url });
  }

  // P&L Tracker Pro: a signed-in driver starts the $17/mo subscription (1st month free).
  // Subscription mode + a trial collects a card up front by default (card required).
  if (body.intent === "pnl-subscribe") {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Please sign in to subscribe." }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 400 });
    if (pnlProActive(user.pnlSubStatus)) {
      return NextResponse.json({ error: "You already have P&L Tracker Pro." }, { status: 400 });
    }

    // Use a real Price if one is configured; otherwise build the recurring price inline.
    const priceId = process.env.STRIPE_PRICE_PNL_MONTHLY;
    const sub = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        priceId
          ? { price: priceId, quantity: 1 }
          : {
              price_data: {
                currency: "usd",
                unit_amount: PNL_PRO.price * 100,
                recurring: { interval: "month" },
                product_data: { name: PNL_PRO.name },
              },
              quantity: 1,
            },
      ],
      subscription_data: { trial_period_days: PNL_PRO.trialDays },
      customer_email: user.email,
      metadata: { type: "pnl-sub", userId: user.id },
      success_url: `${base}/tools/profit-loss?pro=active`,
      cancel_url: `${base}/account?pro=cancelled`,
    });
    return NextResponse.json({ url: sub.url });
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
  const ref = typeof body.ref === "string" ? body.ref.trim().slice(0, 16) : "";
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
    metadata: { type: "listing", tier: tierId, bumps: bumps.join(","), firstName, lastName, primaryService, ref },
    // Send paid drivers to a dedicated post-payment Premium upsell before they
    // see their welcome email. They can take it or skip to sign in.
    success_url: `${base}/welcome/premium-offer?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/pricing?checkout=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
