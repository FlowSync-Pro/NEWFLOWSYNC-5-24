"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { serviceFromEnum } from "@/lib/enums";
import { getService } from "@/lib/services";
import { SITE_URL } from "@/lib/site";
import { sendBookingRequestEmail, sendQuoteEmail } from "@/lib/email";

function baseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
}

export interface RequestState {
  ok?: boolean;
  error?: string;
}

/** A customer requests a quote from a driver (public — no login required). */
export async function requestBooking(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const driverProfileId = String(formData.get("driverProfileId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const details = String(formData.get("details") ?? "").trim();
  if (!driverProfileId || !name || !email || !details) return { error: "Please fill in every field." };

  const driver = await prisma.driverProfile.findUnique({
    where: { id: driverProfileId },
    include: { user: true },
  });
  if (!driver) return { error: "That driver is no longer available." };
  // Drivers who haven't picked a primary service aren't bookable (the public
  // profile won't render either) — guard here in case the URL is hit directly.
  if (!driver.primaryService) return { error: "That driver isn't accepting bookings yet." };

  // Lightweight customer record (keyed by email) to own the booking. Never
  // mutate an existing driver/admin account that happens to share this email —
  // only refresh the name on an existing CUSTOMER record.
  const existing = await prisma.user.findUnique({ where: { email } });
  const customer = existing
    ? existing.role === "CUSTOMER"
      ? await prisma.user.update({ where: { email }, data: { name } })
      : existing
    : await prisma.user.create({ data: { email, name, role: "CUSTOMER" } });

  await prisma.booking.create({
    data: { customerId: customer.id, driverProfileId, service: driver.primaryService, details, status: "REQUESTED" },
  });

  const svc = getService(serviceFromEnum(driver.primaryService));
  await sendBookingRequestEmail({
    to: driver.user.email,
    driverFirstName: driver.firstName,
    customerName: name,
    service: svc?.name ?? "delivery",
    details,
    bookingsUrl: `${baseUrl()}/account/bookings`,
  });

  return { ok: true };
}

/** Driver sends a quote for one of their bookings. */
export async function sendQuote(bookingId: string, amountDollars: number): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!amountDollars || amountDollars <= 0) return { ok: false, error: "Enter a valid amount." };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { driverProfile: { include: { user: true } }, customer: true },
  });
  if (!booking || booking.driverProfile.userId !== session.userId) return { ok: false, error: "Booking not found." };
  // Only quote requests that haven't been paid yet. Re-quoting a PAID booking
  // would reset it to QUOTED and let the customer be charged a second time.
  if (booking.status !== "REQUESTED" && booking.status !== "QUOTED") {
    return { ok: false, error: "This booking can no longer be quoted." };
  }

  const amountCents = Math.round(amountDollars * 100);
  await prisma.booking.update({ where: { id: bookingId }, data: { quoteAmount: amountCents, status: "QUOTED" } });

  await sendQuoteEmail({
    to: booking.customer.email,
    customerName: booking.customer.name ?? "there",
    driverName: `${booking.driverProfile.firstName} ${booking.driverProfile.lastName}`.trim(),
    amountCents,
    payUrl: `${baseUrl()}/book/${booking.id}/pay`,
  });

  revalidatePath("/account/bookings");
  return { ok: true };
}
