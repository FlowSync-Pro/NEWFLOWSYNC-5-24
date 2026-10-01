import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { serviceToEnum, serviceFromEnum } from "@/lib/enums";
import { attributeReferral } from "@/lib/referrals";
import { alertOwner, alertIfEmailFailed } from "@/lib/alerts";
import { sendCapiPurchase } from "@/lib/meta-capi";
import { sendDriverWelcomeEmail, sendBookingPaidEmail, sendBookingReceiptEmail, sendCheckoutRecoveryEmail, sendFleetWelcomeEmail, sendPremiumUpgradeEmail, sendPurchaseConfirmationEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { FLEET, isPremiumTier } from "@/lib/pricing";
import { recoveryText } from "@/lib/recovery";
import type { ServiceId } from "@/lib/services";

export const runtime = "nodejs";

const SERVICE_IDS: ServiceId[] = [
  "grocery", "food", "furniture", "courier", "pharmacy", "senior", "moving", "auto-parts",
];

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return new NextResponse("Stripe not configured", { status: 503 });

  const sig = req.headers.get("stripe-signature") ?? "";
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, secret);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.metadata?.type === "booking") await fulfillBooking(session);
    else if (session.metadata?.type === "upgrade") await fulfillUpgrade(session);
    else if (session.metadata?.type === "pnl-sub") await fulfillPnlSubscription(session);
    else if (session.metadata?.type === "fleet") await fulfillFleet(session);
    else await fulfillCheckout(session);
  } else if (event.type === "checkout.session.expired") {
    await handleAbandonedCheckout(event.data.object);
  } else if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await syncPnlSubscription(event.data.object as Stripe.Subscription);
  } else if (event.type === "charge.refunded") {
    await recordRefund(event.data.object as Stripe.Charge);
  }

  return NextResponse.json({ received: true });
}

/**
 * A charge was refunded (from the Stripe Dashboard or the API). Record it and
 * tell the owner — nothing else. Fully refunded → the matching Payment becomes
 * REFUNDED, so it stops counting as a sale and as "paid" (a driver whose only
 * payment was refunded no longer gets the Tier 1 guides). Premium tier, fleet
 * membership, the listing, the account and every bit of data are untouched:
 * the owner decides those in /admin. A partial refund leaves the Payment PAID
 * and is reported for the owner to judge. Needs the `charge.refunded` event
 * enabled on the webhook endpoint in the Stripe Dashboard.
 */
async function recordRefund(charge: Stripe.Charge) {
  const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : (charge.payment_intent?.id ?? null);
  const payment = pi
    ? await prisma.payment.findUnique({
        where: { stripePaymentIntentId: pi },
        include: {
          user: { select: { email: true, name: true, fleetJoinedAt: true, driverProfile: { select: { firstName: true, lastName: true, tier: true } } } },
        },
      })
    : null;
  const amounts = `$${(charge.amount_refunded / 100).toFixed(2)} of $${(charge.amount / 100).toFixed(2)}`;

  if (!payment) {
    await alertOwner(
      `💸 Refund in Stripe (${amounts}) for a payment FlowSync has no record of.\n` +
        `Email: ${charge.billing_details?.email ?? charge.receipt_email ?? "(none)"}\nPayment intent: ${pi ?? "(none)"}\n\nNothing was changed.`,
    );
    return;
  }
  if (payment.status === "REFUNDED") return; // retried event: already recorded and reported

  // `refunded` is true only once the whole charge has been refunded.
  const full = charge.refunded;
  if (full) await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });

  const u = payment.user;
  const name = (u.driverProfile ? `${u.driverProfile.firstName} ${u.driverProfile.lastName}`.trim() : "") || u.name || u.email;
  const still = [isPremiumTier(u.driverProfile?.tier) ? "on Premium" : "", u.fleetJoinedAt ? "in the Curri fleet" : ""].filter(Boolean);
  await alertOwner(
    `💸 ${full ? "Refund" : "Partial refund"}: ${amounts} (${payment.type === "BOOKING" ? "a customer's booking with this driver" : `${payment.type.toLowerCase()} payment`})\n` +
      `Account: ${name}\nEmail: ${u.email}\n\n` +
      (full
        ? "The payment is now marked REFUNDED, so it no longer counts as a sale or as paid."
        : "The payment is still marked PAID. Decide whether that's right.") +
      `\nNothing else was changed${still.length ? ` — they are still ${still.join(" and ")}` : ""}. If they should lose access, change it in /admin.`,
  );
}

// A new buyer opened Stripe Checkout and didn't pay within the hour. If Stripe
// kept their email (it does once they've typed it, with recovery enabled), send
// the recovery email and ping the owner with a ready-to-send text — a personal
// text within the hour is the highest-converting follow-up we have.
async function handleAbandonedCheckout(session: Stripe.Checkout.Session) {
  const md = session.metadata ?? {};
  const product = md.type === "listing" ? "listing" : md.type === "fleet" && md.standalone === "1" ? "fleet" : null;
  if (!product) return; // signed-in upgrades etc. are followed up in-app, not here

  const email = (session.customer_details?.email ?? session.customer_email ?? md.email ?? "").toLowerCase();
  const phone = session.customer_details?.phone ?? null;
  if (!email && !phone) return;

  const firstName = md.firstName || session.customer_details?.name?.split(" ")[0] || "";
  const amount = (session.amount_total ?? 0) / 100;
  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
  const resumeUrl = product === "listing" ? `${base}/pricing?resume=1` : `${base}/#curri-fleet`;

  // Someone who already has a paid account doesn't need a recovery nudge.
  if (email) {
    const paid = await prisma.payment.findFirst({ where: { status: "PAID", user: { email } }, select: { id: true } });
    if (paid) return;
    await alertIfEmailFailed(await sendCheckoutRecoveryEmail({ to: email, firstName, product, resumeUrl }));
  }

  await alertOwner(
    `🛒 Abandoned checkout (${product}, $${amount.toFixed(0)})\n` +
      `Name: ${firstName || "(not given)"}\nEmail: ${email || "(not given)"}\nPhone: ${phone || "(not given)"}\n\n` +
      (phone ? `Text them now:\n"${recoveryText(product, firstName)}"` : `Recovery email ${email ? "sent" : "not possible (no email)"}.`),
  );
}

// Reads `current_period_end` defensively — its exact location shifts across Stripe
// API versions, so we never hard-depend on the field type.
function subPeriodEnd(sub: Stripe.Subscription): Date | null {
  const ts = (sub as unknown as { current_period_end?: number }).current_period_end;
  return typeof ts === "number" ? new Date(ts * 1000) : null;
}

// P&L Tracker Pro is retired (no new checkouts), but a checkout opened before that
// can still complete — record it so the driver gets what they started. No email:
// the old one promised a $17/mo plan we no longer sell.
async function fulfillPnlSubscription(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  const subId = typeof session.subscription === "string" ? session.subscription : null;
  let status = "trialing";
  let periodEnd: Date | null = null;

  const stripe = getStripe();
  if (stripe && subId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      status = sub.status;
      periodEnd = subPeriodEnd(sub);
    } catch {
      // Keep the optimistic "trialing" default if the lookup fails.
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { pnlSubId: subId, pnlSubStatus: status, pnlSubCurrentPeriodEnd: periodEnd },
  });
}

// Keep the user's entitlement in sync as the subscription trials → renews → cancels.
async function syncPnlSubscription(sub: Stripe.Subscription) {
  const existing = await prisma.user.findFirst({ where: { pnlSubId: sub.id } });
  if (!existing) return;
  await prisma.user.update({
    where: { id: existing.id },
    data: { pnlSubStatus: sub.status, pnlSubCurrentPeriodEnd: subPeriodEnd(sub) },
  });
}

/** "JOHN  SMITH" → { firstName: "John", lastName: "Smith" }. Empty input → empty parts. */
function nameParts(raw: string | null | undefined): { firstName: string; lastName: string } {
  const words = (raw ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return { firstName: words[0] ?? "", lastName: words.slice(1).join(" ") };
}

/**
 * A driver paid for Premium (or the fleet, which includes Premium) before
 * creating a driver profile. That is the normal path: the pricing-page checkout
 * doesn't ask for a name, and offer page A comes straight after payment, before
 * sign-in and /account/setup. Previously the upgrade was dropped here, so the
 * driver paid for Premium but stayed on Verified.
 *
 * Creates a minimal profile on the PREMIUM tier, named from the account (if the
 * buyer gave a name) or else the cardholder name Stripe collected. The driver
 * can correct the name and pick a service under /account/edit, which already
 * prompts for a missing service. Upsert, so a profile created at the same
 * moment by /account/setup is upgraded rather than duplicated.
 *
 * Returns null only if the user row itself no longer exists.
 */
async function ensurePremiumProfile(userId: string, cardholderName: string | null | undefined) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!user) return null;
  const fromAccount = nameParts(user.name);
  const fromCard = nameParts(cardholderName);
  const chosen = fromAccount.firstName ? fromAccount : fromCard;
  return prisma.driverProfile.upsert({
    where: { userId },
    create: {
      userId,
      firstName: chosen.firstName || "Driver",
      lastName: chosen.lastName,
      tier: "PREMIUM",
      listedAt: new Date(),
    },
    update: { tier: "PREMIUM" },
    include: { user: true },
  });
}

async function fulfillUpgrade(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  // Idempotent on the Stripe session id.
  const already = await prisma.payment.findUnique({ where: { stripeSessionId: session.id } });
  if (already) return;

  // Always record the payment first so a successful charge is never lost, even
  // if the profile is missing (e.g. deleted between checkout start and webhook).
  await prisma.payment.create({
    data: {
      userId,
      type: "LISTING",
      amount: session.amount_total ?? 9700,
      currency: session.currency ?? "usd",
      status: "PAID",
      bumps: [],
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
    },
  });

  let profile = await prisma.driverProfile.findUnique({
    where: { userId },
    include: { user: true },
  });
  if (profile) {
    await prisma.driverProfile.update({ where: { id: profile.id }, data: { tier: "PREMIUM" } });
  } else {
    // Paid before finishing setup (the normal offer-page-A path). Create the
    // profile on Premium rather than dropping the upgrade.
    profile = await ensurePremiumProfile(userId, session.customer_details?.name);
    if (!profile) {
      // Payment recorded above; the account itself is gone. Flag for manual follow-up.
      console.error(`fulfillUpgrade: paid upgrade for user ${userId}, but the account no longer exists (session ${session.id})`);
      return;
    }
    console.log(`fulfillUpgrade: created a Premium profile for user ${userId}, who paid before finishing setup (session ${session.id})`);
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
  await alertIfEmailFailed(await sendPremiumUpgradeEmail({
    to: profile.user.email,
    firstName: profile.firstName,
    accountUrl: `${base}/account`,
    // Personalization: names what's already on the profile (read-only).
    city: profile.city,
    vehicleYear: profile.vehicleYear,
    vehicleMakeModel: profile.vehicleMakeModel,
    vehicleType: profile.vehicleType,
    serviceId: serviceFromEnum(profile.primaryService),
    // Offer page B follows every Premium purchase; the email repeats it for
    // anyone who closed the tab. The page enforces the 24h window itself.
    fleetOfferUrl: `${base}/welcome/fleet-offer?session_id=${encodeURIComponent(session.id)}`,
  }));

  // Server-side Purchase event to Meta (CAPI). Same event_id as the browser
  // pixel that fires on /signin?checkout=success&upgraded=1 -> Meta dedupes
  // into one Purchase per upgrade.
  await sendCapiPurchase({
    eventId: session.id,
    email: profile.user.email,
    value: (session.amount_total ?? 9700) / 100,
    currency: session.currency ?? "usd",
    firstName: profile.firstName,
    lastName: profile.lastName,
    sourceUrl: `${base}/welcome/premium-offer`,
  });
}

// Curri fleet invite — any of the three ways it's bought:
//   - homepage/pricing page, no account yet ($297; metadata.standalone = "1")
//   - post-checkout offer right after the $17 listing ($97; metadata.userId)
//   - signed-in driver from the fleet guide ($297; metadata.userId)
// A homepage buyer gets a full account + listing created here, exactly like a
// listing purchase, so one payment covers both. Everyone gets fleetJoinedAt set,
// a FLEET payment recorded, the fleet next-steps email, and the owner gets a
// alert email (lib/alerts.ts) because the carrier-account add and Stripe link are manual.
async function fulfillFleet(session: Stripe.Checkout.Session) {
  const already = await prisma.payment.findUnique({ where: { stripeSessionId: session.id } });
  if (already) return;

  const md = session.metadata ?? {};
  const email = (session.customer_details?.email ?? md.email ?? "").toLowerCase();
  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;

  let user = md.userId
    ? await prisma.user.findUnique({ where: { id: md.userId }, include: { driverProfile: true } })
    : null;
  if (!user && email) {
    user = await prisma.user.findUnique({ where: { email }, include: { driverProfile: true } });
  }

  // Brand-new buyer from the homepage → create the account + temp password.
  let tempPassword: string | null = null;
  if (!user) {
    if (!email) return;
    tempPassword = generateTempPassword();
    user = await prisma.user.create({
      data: {
        email,
        name: md.firstName ? `${md.firstName} ${md.lastName ?? ""}`.trim() : null,
        role: "DRIVER",
        hashedPassword: hashPassword(tempPassword),
        mustResetPassword: true,
        emailVerified: new Date(),
        ...(md.firstName
          ? { driverProfile: { create: { firstName: md.firstName, lastName: md.lastName ?? "", phone: md.phone || session.customer_details?.phone || null, listedAt: new Date() } } }
          : {}),
      },
      include: { driverProfile: true },
    });
  }

  // Record the payment first so a successful charge is never lost.
  await prisma.payment.create({
    data: {
      userId: user.id,
      type: "FLEET",
      amount: session.amount_total ?? FLEET.price * 100,
      currency: session.currency ?? "usd",
      status: "PAID",
      bumps: [],
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
    },
  });

  if (!user.fleetJoinedAt) {
    await prisma.user.update({ where: { id: user.id }, data: { fleetJoinedAt: new Date() } });
  }
  // The fleet includes everything in Premium (every fleet surface says so), so
  // a fleet purchase also makes the driver Premium: badge, placement, website
  // link. And a homepage buyer's $297 includes the listing; make sure they're
  // listed. Normal fulfilment writes on this buyer's own profile only.
  if (user.driverProfile) {
    const data: { listedAt?: Date; tier?: "PREMIUM" } = {};
    if (!user.driverProfile.listedAt) data.listedAt = new Date();
    if (user.driverProfile.tier !== "PREMIUM") data.tier = "PREMIUM";
    if (Object.keys(data).length) {
      await prisma.driverProfile.update({ where: { id: user.driverProfile.id }, data });
    }
  } else {
    // Bought the fleet on offer page B before finishing setup: create the
    // profile on Premium (fleet includes Premium) instead of leaving none.
    const created = await ensurePremiumProfile(user.id, session.customer_details?.name);
    if (created) user.driverProfile = created;
  }

  const firstName = user.driverProfile?.firstName || md.firstName || user.name?.split(" ")[0] || "there";

  if (tempPassword) {
    const welcome = await sendDriverWelcomeEmail({
      to: user.email,
      firstName,
      tempPassword,
      signInUrl: `${base}/signin`,
    });
    if (!welcome.sent) {
      await alertOwner(
        `⚠️ FlowSync: welcome email FAILED to send (fleet $297 buyer).\n\n` +
          `Driver: ${firstName} ${md.lastName ?? ""}\nEmail: ${user.email}\n\n` +
          `They have paid but may not be able to sign in. Reach out to them.`,
      );
    }
  }

  await alertIfEmailFailed(await sendFleetWelcomeEmail({
    to: user.email,
    firstName,
    fleetUrl: `${base}/account/curri-fleet`,
    city: user.driverProfile?.city,
    vehicleYear: user.driverProfile?.vehicleYear,
    vehicleMakeModel: user.driverProfile?.vehicleMakeModel,
    vehicleType: user.driverProfile?.vehicleType,
  }));

  // The carrier-account add and the Stripe Connect link are manual steps.
  await alertOwner(
    `🚚 New Curri fleet member: ${firstName} ${user.driverProfile?.lastName ?? md.lastName ?? ""}\n` +
      `Email: ${user.email}\nPaid: $${((session.amount_total ?? 0) / 100).toFixed(2)} (${md.source ?? "homepage"})\n\n` +
      `Next: add them on the carrier account and send their Stripe setup link once they reply with their details.`,
  );

  if (md.ref && tempPassword) await attributeReferral(user.id, md.ref);

  await sendCapiPurchase({
    eventId: session.id,
    email: user.email,
    value: (session.amount_total ?? 0) / 100,
    currency: session.currency ?? "usd",
    firstName,
    lastName: user.driverProfile?.lastName || md.lastName || undefined,
    sourceUrl: `${base}/account/curri-fleet`,
  });
}

async function fulfillBooking(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) return;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { driverProfile: { include: { user: true } }, customer: true },
  });
  if (!booking || booking.status === "PAID") return; // idempotent

  const amount = session.amount_total ?? booking.quoteAmount ?? 0;
  await prisma.booking.update({ where: { id: bookingId }, data: { status: "PAID" } });
  await prisma.payment.create({
    data: {
      userId: booking.driverProfile.userId,
      type: "BOOKING",
      amount,
      currency: session.currency ?? "usd",
      status: "PAID",
      bookingId: booking.id,
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
    },
  });

  const driverName = `${booking.driverProfile.firstName} ${booking.driverProfile.lastName}`.trim();
  await alertIfEmailFailed(await sendBookingPaidEmail({
    to: booking.driverProfile.user.email,
    driverFirstName: booking.driverProfile.firstName,
    customerName: booking.customer.name ?? "A customer",
    amountCents: amount,
  }));
  await alertIfEmailFailed(await sendBookingReceiptEmail({
    to: booking.customer.email,
    customerName: booking.customer.name ?? "there",
    driverName,
    amountCents: amount,
  }));
}

async function fulfillCheckout(session: Stripe.Checkout.Session) {
  // Idempotent: skip if we've already recorded this session.
  const already = await prisma.payment.findUnique({ where: { stripeSessionId: session.id } });
  if (already) return;

  const md = session.metadata ?? {};
  const email = (session.customer_details?.email ?? md.email ?? "").toLowerCase();
  if (!email) return;

  const bumps = md.bumps ? md.bumps.split(",").filter(Boolean) : [];
  const primaryService = SERVICE_IDS.includes(md.primaryService as ServiceId)
    ? (md.primaryService as ServiceId)
    : null;
  const tierEnum = md.tier === "premium" ? "PREMIUM" : "STANDARD";

  let user = await prisma.user.findUnique({ where: { email }, include: { driverProfile: true } });

  // New paying customer → create the account + temp password and email it.
  // A profile is created here if we have the info; otherwise the driver completes
  // it on first sign-in (/account → /account/setup).
  if (!user) {
    const tempPassword = generateTempPassword();
    user = await prisma.user.create({
      data: {
        email,
        name: md.firstName ? `${md.firstName} ${md.lastName ?? ""}`.trim() : null,
        role: "DRIVER",
        hashedPassword: hashPassword(tempPassword),
        mustResetPassword: true,
        emailVerified: new Date(),
        ...(md.firstName && primaryService
          ? {
              driverProfile: {
                create: {
                  firstName: md.firstName,
                  lastName: md.lastName ?? "",
                  // Stripe Checkout collects a phone (abandoned-checkout follow-up);
                  // keep it on the profile so the owner can text new drivers.
                  phone: session.customer_details?.phone ?? null,
                  primaryService: serviceToEnum(primaryService),
                  tier: tierEnum,
                  listedAt: new Date(),
                },
              },
            }
          : {}),
      },
      include: { driverProfile: true },
    });
    const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
    const welcome = await sendDriverWelcomeEmail({
      to: email,
      firstName: md.firstName || "there",
      tempPassword,
      signInUrl: `${base}/signin`,
      // The one-time-offer page identifies the driver by this paid listing
      // session, so the email's upgrade button works without signing in.
      upgradeUrl: `${base}/welcome/premium-offer?session_id=${encodeURIComponent(session.id)}`,
      // Only a Verified buyer gets the offer chain; a Premium buyer (tier
      // "premium") is sent to offer page B by the checkout success URL instead.
      fleetOfferUrl: tierEnum === "PREMIUM" ? undefined : `${base}/welcome/fleet-offer?session_id=${encodeURIComponent(session.id)}`,
      serviceId: primaryService,
    });
    // A paying driver whose welcome email didn't send can't sign in. That used
    // to fail silently; now it alerts the owner (lib/alerts.ts: email to
    // ADMIN_EMAILS, plus the server log in case email itself is down) so they
    // can reach out before the driver gives up or asks for a refund.
    if (!welcome.sent) {
      await alertOwner(
        `⚠️ FlowSync: welcome email FAILED to send.\n\n` +
          `Driver: ${md.firstName || "(no name)"} ${md.lastName ?? ""}\n` +
          `Email: ${email}\n` +
          `Paid: $${((session.amount_total ?? 0) / 100).toFixed(2)}\n\n` +
          `They have paid but may not be able to sign in. Reach out to them, ` +
          `and check the Resend dashboard / RESEND_* env vars.`,
      );
    }
  } else {
    // Existing account (admin-added, imported, or a returning buyer). No new
    // password is made, so the welcome email doesn't apply — but they still
    // need to know the payment landed, how to sign in, and the 24h offer links.
    // Offers are skipped for anyone already on Premium or in the fleet.
    const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
    const offersApply = tierEnum === "STANDARD" && !isPremiumTier(user.driverProfile?.tier) && !user.fleetJoinedAt;
    const sid = encodeURIComponent(session.id);
    await alertIfEmailFailed(await sendPurchaseConfirmationEmail({
      to: email,
      firstName: user.driverProfile?.firstName || md.firstName || user.name?.split(" ")[0] || "there",
      amountCents: session.amount_total ?? 0,
      needsPassword: user.mustResetPassword,
      signInUrl: `${base}/signin`,
      forgotPasswordUrl: `${base}/forgot-password`,
      upgradeUrl: offersApply ? `${base}/welcome/premium-offer?session_id=${sid}` : undefined,
      fleetOfferUrl: offersApply ? `${base}/welcome/fleet-offer?session_id=${sid}` : undefined,
    }));
  }

  if (user.driverProfile) {
    const data: { listedAt?: Date; tier?: "PREMIUM" } = {};
    if (!user.driverProfile.listedAt) data.listedAt = new Date();
    if (tierEnum === "PREMIUM" && user.driverProfile.tier !== "PREMIUM") data.tier = "PREMIUM";
    if (Object.keys(data).length) {
      await prisma.driverProfile.update({ where: { id: user.driverProfile.id }, data });
    }
  }

  await prisma.payment.create({
    data: {
      userId: user.id,
      type: "LISTING",
      amount: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
      status: "PAID",
      bumps,
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
    },
  });

  // Credit the referrer (if this driver came through a referral link).
  if (md.ref) await attributeReferral(user.id, md.ref);

  // Server-side Purchase event to Meta (CAPI). Same event_id as the browser
  // pixel that fires on /welcome/premium-offer -> Meta dedupes into one event.
  await sendCapiPurchase({
    eventId: session.id,
    email,
    value: (session.amount_total ?? 0) / 100,
    currency: session.currency ?? "usd",
    firstName: md.firstName || undefined,
    lastName: md.lastName || undefined,
    sourceUrl: `${process.env.NEXT_PUBLIC_SITE_URL || SITE_URL}/welcome/premium-offer`,
  });
}
