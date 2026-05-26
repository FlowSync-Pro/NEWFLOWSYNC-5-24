import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { serviceToEnum } from "@/lib/enums";
import { sendDriverWelcomeEmail, sendBookingPaidEmail, sendBookingReceiptEmail, sendPremiumUpgradeEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
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
    else await fulfillCheckout(session);
  }

  return NextResponse.json({ received: true });
}

async function fulfillUpgrade(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  // Idempotent on the Stripe session id.
  const already = await prisma.payment.findUnique({ where: { stripeSessionId: session.id } });
  if (already) return;

  const profile = await prisma.driverProfile.findUnique({
    where: { userId },
    include: { user: true },
  });
  if (!profile) return;

  await prisma.driverProfile.update({ where: { id: profile.id }, data: { tier: "PREMIUM" } });
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

  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
  await sendPremiumUpgradeEmail({
    to: profile.user.email,
    firstName: profile.firstName,
    servicesUrl: `${base}/account/services`,
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
  await sendBookingPaidEmail({
    to: booking.driverProfile.user.email,
    driverFirstName: booking.driverProfile.firstName,
    customerName: booking.customer.name ?? "A customer",
    amountCents: amount,
  });
  await sendBookingReceiptEmail({
    to: booking.customer.email,
    customerName: booking.customer.name ?? "there",
    driverName,
    amountCents: amount,
  });
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
    await sendDriverWelcomeEmail({
      to: email,
      firstName: md.firstName || "there",
      tempPassword,
      signInUrl: `${base}/signin`,
    });
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
}
