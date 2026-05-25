import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { serviceToEnum } from "@/lib/enums";
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
    await fulfillCheckout(event.data.object);
  }

  return NextResponse.json({ received: true });
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

  let user = await prisma.user.findUnique({ where: { email }, include: { driverProfile: true } });

  // Create the account if it's a new paying customer with enough info for a profile.
  if (!user && md.firstName && primaryService) {
    const tempPassword = generateTempPassword();
    user = await prisma.user.create({
      data: {
        email,
        name: `${md.firstName} ${md.lastName ?? ""}`.trim(),
        role: "DRIVER",
        hashedPassword: hashPassword(tempPassword),
        mustResetPassword: true,
        emailVerified: new Date(),
        driverProfile: {
          create: {
            firstName: md.firstName,
            lastName: md.lastName ?? "",
            primaryService: serviceToEnum(primaryService),
            listedAt: new Date(),
          },
        },
      },
      include: { driverProfile: true },
    });
    // TODO(resend): email `tempPassword` + a verification link to the driver.
    console.log(`[stripe] created driver ${email}; temp password=${tempPassword}`);
  }

  if (!user) {
    console.warn(`[stripe] paid session ${session.id} for ${email} but no account could be created (missing profile info).`);
    return;
  }

  if (user.driverProfile && !user.driverProfile.listedAt) {
    await prisma.driverProfile.update({ where: { id: user.driverProfile.id }, data: { listedAt: new Date() } });
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
