import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { FLEET, getBump, isPremiumTier, listingPrice, PNL_PRO, premiumUpgradePrice, TIERS, type TierId } from "@/lib/pricing";
import { pnlProActive } from "@/lib/subscription";

export const runtime = "nodejs";

const fleetLineItem = (unitAmount: number) => ({
  price_data: { currency: "usd", unit_amount: unitAmount, product_data: { name: FLEET.name } },
  quantity: 1,
});

// The fleet fee is refundable until activation and non-refundable after. That
// only holds up in a dispute if the buyer agreed to it on the checkout page,
// so Stripe shows a required terms checkbox (it links to the Terms of Service
// URL set in the Stripe Dashboard → Settings → Public details). If that URL
// isn't configured yet Stripe rejects the option; we fall back to a plain
// checkout rather than block the sale, and log loudly so it gets fixed.
type SessionParams = Stripe.Checkout.SessionCreateParams;
type Extra = { name: string; params: Partial<SessionParams> };

// Abandoned-checkout recovery for NEW buyers (listing + homepage fleet):
//  - the session expires after 60 minutes instead of Stripe's 24-hour default,
//    so the `checkout.session.expired` webhook (which emails the buyer and pings
//    the owner to text them) fires while they're still warm;
//  - Stripe's recovery flag makes it keep the email the buyer typed on the
//    Checkout page, which is what the follow-up needs;
//  - a phone field on the Checkout page, because the owner's best-converting
//    follow-up is a personal text. (Owner-approved new personal-data field.)
const RECOVERY_EXTRA = (): Extra => ({
  name: "abandoned-checkout recovery (expiry + recovery + phone)",
  params: {
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    after_expiration: { recovery: { enabled: true, allow_promotion_codes: false } },
    phone_number_collection: { enabled: true },
  },
});

const CONSENT_EXTRA: Extra = {
  name: "fleet refund-terms checkbox (needs the Terms of Service URL in Stripe → Settings → Public details)",
  params: {
    consent_collection: { terms_of_service: "required" },
    custom_text: {
      terms_of_service_acceptance: {
        message: `I understand the fleet joining fee is ${FLEET.refundShort.replace("Fully refundable", "fully refundable").replace(/\.$/, "")}.`,
      },
    },
  },
};

// Never let a nice-to-have block a sale. Try the session with every extra;
// if Stripe rejects it, drop the last extra and try again, down to a plain
// session. Each rejection is logged with the extra's name so it can be fixed
// (Vercel → Logs). Only a plain session failing surfaces to the buyer.
async function createSession(stripe: Stripe, base: SessionParams, extras: Extra[]) {
  for (let n = extras.length; n >= 0; n--) {
    const merged = Object.assign({}, base, ...extras.slice(0, n).map((e) => e.params)) as SessionParams;
    try {
      return await stripe.checkout.sessions.create(merged);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (n === 0) throw e;
      console.error(`[checkout] Stripe rejected "${extras[n - 1].name}" — retrying without it. Stripe said: ${msg}`);
    }
  }
  throw new Error("unreachable");
}

const createListingSession = (stripe: Stripe, base: SessionParams) => createSession(stripe, base, [RECOVERY_EXTRA()]);
const createFleetSession = (stripe: Stripe, base: SessionParams, opts: { recovery?: boolean } = {}) =>
  createSession(stripe, base, opts.recovery ? [RECOVERY_EXTRA(), CONSENT_EXTRA] : [CONSENT_EXTRA]);

// Any failure here used to become a bare 500 and a generic "temporarily
// unavailable" message. Now the real reason is logged and returned, so the
// owner can read it on the page instead of guessing.
export async function POST(req: Request) {
  try {
    return await handleCheckout(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[checkout] failed:", msg);
    return NextResponse.json({ error: `Stripe error: ${msg}` }, { status: 500 });
  }
}

async function handleCheckout(req: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ configured: false });

  const body = await req.json().catch(() => ({}));
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  // Curri fleet invite, full price, for a signed-in driver (one who passed on
  // the $97 post-checkout offer, or an existing driver joining later).
  if (body.intent === "fleet") {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Please sign in to join the fleet." }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 400 });
    if (user.fleetJoinedAt) return NextResponse.json({ error: "You're already in the fleet." }, { status: 400 });

    const fleet = await createFleetSession(stripe, {
      mode: "payment",
      line_items: [fleetLineItem(FLEET.price * 100)],
      customer_email: user.email,
      metadata: { type: "fleet", userId: user.id, source: "account" },
      // Session id in the URL so the fleet page fires the browser Purchase pixel
      // with the same eventID the webhook sends to CAPI (one event, not two).
      success_url: `${base}/account/curri-fleet?joined=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/account/curri-fleet`,
    });
    return NextResponse.json({ url: fleet.url });
  }

  // Curri fleet invite from the homepage: no account yet. $197 buys the invite
  // AND creates their full FlowSync account + listing (the webhook handles it
  // exactly like a listing purchase, then marks the fleet membership).
  if (body.intent === "fleet-standalone") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const firstName = typeof body.firstName === "string" ? body.firstName.trim().slice(0, 60) : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim().slice(0, 60) : "";
    const ref = typeof body.ref === "string" ? body.ref.trim().slice(0, 16) : "";
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    if (!firstName) return NextResponse.json({ error: "Enter your first name." }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email }, select: { fleetJoinedAt: true } });
    if (existing?.fleetJoinedAt) {
      return NextResponse.json({ error: "That email is already in the fleet — sign in to see your fleet guide." }, { status: 400 });
    }

    const fleet = await createFleetSession(stripe, {
      mode: "payment",
      line_items: [fleetLineItem(FLEET.price * 100)],
      customer_email: email,
      metadata: { type: "fleet", standalone: "1", firstName, lastName, email, ref },
      // Same post-payment landing as the listing: on-screen activation if the
      // account is brand new, plus the Purchase pixel with this session's id.
      success_url: `${base}/signin?checkout=success&session_id={CHECKOUT_SESSION_ID}&fleet=1`,
      cancel_url: `${base}/#curri-fleet`,
    }, { recovery: true });
    return NextResponse.json({ url: fleet.url });
  }

  // Post-payment one-time offer for the fleet: $97 instead of $197, offered
  // exactly once, right after the $17 listing. Identified by the just-completed
  // listing Stripe session, same as the Premium OTO below.
  if (body.intent === "oto-fleet" && typeof body.session_id === "string" && body.session_id) {
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

    let user = await prisma.user.findUnique({ where: { email } });
    for (let i = 0; i < 5 && !user; i++) {
      await new Promise((r) => setTimeout(r, 500));
      user = await prisma.user.findUnique({ where: { email } });
    }
    if (!user) {
      return NextResponse.json(
        { error: "Your account is still being set up. Please try again in a moment from your account." },
        { status: 503 },
      );
    }
    if (user.fleetJoinedAt) return NextResponse.json({ error: "You're already in the fleet." }, { status: 400 });

    const fleet = await createFleetSession(stripe, {
      mode: "payment",
      line_items: [fleetLineItem(FLEET.addOnPrice * 100)],
      customer_email: email,
      metadata: { type: "fleet", userId: user.id, source: "oto" },
      success_url: `${base}/signin?checkout=success&session_id={CHECKOUT_SESSION_ID}&fleet=1`,
      cancel_url: `${base}/welcome/premium-offer?session_id=${encodeURIComponent(body.session_id)}`,
    });
    return NextResponse.json({ url: fleet.url });
  }

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
          price_data: { currency: "usd", unit_amount: premiumUpgradePrice() * 100, product_data: { name: "FlowSync Premium upgrade" } },
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
          price_data: { currency: "usd", unit_amount: premiumUpgradePrice() * 100, product_data: { name: "FlowSync Premium upgrade" } },
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
  // The listing has a dated price increase; charge what the site shows right now.
  const tierAmount = tierId === "standard" ? listingPrice() : tier.price;

  const priced = [
    { name: `FlowSync ${tier.name} listing`, amount: tierAmount * 100 },
    ...bumps.map((id) => {
      const b = getBump(id)!;
      return { name: b.name, amount: b.price * 100 };
    }),
  ];

  const session = await createListingSession(stripe, {
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
