import { Resend } from "resend";
import { SUPPORT_EMAIL } from "./site";
import { fleetTelegramInviteUrl } from "./telegram-invite";
import { FLEET, GUARANTEE_DAYS, LISTING_INCREASE_DATE_LABEL, LISTING_PRICE_AFTER, listingIncreasePending, listingPrice, OFFER_WINDOW_HOURS, premiumOfferPrice, premiumUpgradePrice } from "./pricing";

// Lazy + graceful: when RESEND_API_KEY isn't set, email sends are skipped (logged)
// so the rest of the flow still works. Swap nothing to go live — just set the keys.
let client: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL;
}

function from(): string {
  return process.env.RESEND_FROM_EMAIL || "FlowSync <hello@flowsyncdriver.com>";
}

async function send(to: string, subject: string, html: string): Promise<{ sent: boolean }> {
  const resend = getResend();
  if (!resend || !process.env.RESEND_FROM_EMAIL) {
    console.log(`[email:skipped] "${subject}" -> ${to}`);
    return { sent: false };
  }
  try {
    // Several emails say "just reply" — replies must land in the inbox a
    // human actually reads, not whatever RESEND_FROM_EMAIL happens to be.
    await resend.emails.send({ from: from(), to, subject, html, replyTo: SUPPORT_EMAIL });
    return { sent: true };
  } catch (e) {
    console.error("[email] send failed:", e);
    return { sent: false };
  }
}

function shell(heading: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#07090b;font-family:Arial,Helvetica,sans-serif;color:#e7ecef">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <div style="font-size:20px;font-weight:800;color:#25e07a;margin-bottom:24px">FlowSync</div>
    <div style="background:#0e1316;border:1px solid #1d262b;border-radius:16px;padding:28px">
      <h1 style="font-size:22px;margin:0 0 12px">${heading}</h1>
      ${body}
    </div>
    <p style="color:#7c8a92;font-size:12px;margin-top:20px">You're receiving this because you signed up at flowsyncdriver.com.</p>
  </div></body></html>`;
}

const escapeHtml = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Owner alert (lib/alerts.ts). Plain and internal: the first line of the
 * message becomes the subject, the whole message the body, line breaks kept.
 * Goes to each recipient (SUPPORT_EMAIL + ADMIN_EMAILS) separately so one bad address can't block
 * the others. Returns true if at least one send succeeded.
 */
export async function sendOwnerAlertEmail(to: string[], message: string): Promise<boolean> {
  const firstLine = message.split("\n").find((l) => l.trim())?.trim() ?? "Alert";
  const subject = `[FlowSync alert] ${firstLine}`.slice(0, 150);
  const html = `<!doctype html><html><body style="margin:0;background:#07090b;font-family:Arial,Helvetica,sans-serif;color:#e7ecef">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px">
    <div style="font-size:13px;font-weight:700;letter-spacing:1px;color:#25e07a;margin-bottom:14px">FLOWSYNC OWNER ALERT</div>
    <div style="background:#0e1316;border:1px solid #1d262b;border-radius:14px;padding:22px;white-space:pre-wrap;line-height:1.6;font-size:15px">${escapeHtml(message)}</div>
    <p style="color:#7c8a92;font-size:12px;margin-top:16px">Sent to the support inbox and the ADMIN_EMAILS addresses. Every alert is also in Vercel → Logs (search "[alert]").</p>
  </div></body></html>`;
  let any = false;
  for (const addr of to) {
    const r = await send(addr, subject, html);
    any = any || r.sent;
  }
  return any;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#25e07a;color:#04130a;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:999px;margin-top:8px">${label}</a>`;
}

// Shared text styles for the longer, story-style emails.
const P = `style="color:#aebac1;line-height:1.65;margin:0 0 14px"`;
const H2 = `style="font-size:17px;color:#e7ecef;margin:26px 0 10px"`;
const LI = `style="color:#aebac1;line-height:1.6;margin:0 0 8px"`;

// ---- Personalization (ported from PR #8) ----------------------------------
// Onboarding emails name the driver's real city / vehicle / service when we
// have them, and fall back to the generic wording when we don't, so a sentence
// never renders half-empty. Read-only: these only format existing profile
// fields into copy.

// Plain-English labels for the service ids (src/lib/services.ts `short`).
const SERVICE_LABELS: Record<string, string> = {
  grocery: "Grocery",
  food: "Food",
  furniture: "Furniture",
  courier: "Courier",
  pharmacy: "Pharmacy",
  senior: "Senior care",
  moving: "Moving",
  "auto-parts": "Auto parts",
};

function serviceLabel(id?: string | null): string | null {
  if (!id) return null;
  return SERVICE_LABELS[id] ?? null;
}

/** Optional driver details used to personalize onboarding emails. */
export interface DriverDetails {
  city?: string | null;
  vehicleYear?: string | null;
  vehicleMakeModel?: string | null;
  vehicleType?: string | null;
  serviceId?: string | null;
}

/** "2022 Mercedes Sprinter" from profile fields; falls back to the vehicle type. */
function vehicleLabel(d: DriverDetails): string | null {
  const combined = [d.vehicleYear?.trim(), d.vehicleMakeModel?.trim()].filter(Boolean).join(" ");
  return combined || d.vehicleType?.trim() || null;
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/** "I've already got your 2022 Sprinter in Tacoma from when you signed up", or the generic line. */
function onFilePhrase(d: DriverDetails): string {
  const vehicle = vehicleLabel(d);
  const city = d.city?.trim() || null;
  const service = serviceLabel(d.serviceId);
  const bits: string[] = [];
  if (vehicle && city) bits.push(`your ${vehicle} in ${city}`);
  else {
    if (vehicle) bits.push(`your ${vehicle}`);
    if (city) bits.push(`your location in ${city}`);
  }
  if (service) bits.push(`your ${service.toLowerCase()} service`);
  if (!bits.length) return "I've already got your vehicle and location from when you signed up";
  return `I've already got ${joinList(bits)} from when you signed up`;
}

/** "your 2022 Sprinter in Tacoma" for the fleet email's confirm-your-details step, or null. */
function knownDetailsPhrase(d: DriverDetails): string | null {
  const vehicle = vehicleLabel(d);
  const city = d.city?.trim() || null;
  if (vehicle && city) return `your ${vehicle} in ${city}`;
  if (vehicle) return `your ${vehicle}`;
  if (city) return `your location in ${city}`;
  return null;
}

/**
 * The $17 buyer's first email. Fires from the Stripe webhook the moment the
 * listing is paid. Three jobs, in order of importance:
 *   1. get them signed in (temp password stays at the very top, unmissable)
 *   2. show them what to do first — the Roadmap is the 30-day plan
 *   3. earn the Premium upgrade with the real story, not a hard sell
 *
 * `upgradeUrl` is the post-checkout one-time-offer page (no sign-in needed) when
 * the caller has the Stripe session id, otherwise it falls back to the account
 * editor where a signed-in driver can upgrade.
 */
export async function sendDriverWelcomeEmail(opts: {
  to: string;
  firstName: string;
  tempPassword: string;
  signInUrl: string;
  upgradeUrl?: string;
  /** Offer page B for a Verified buyer (fleet for $200 more, 24h). */
  fleetOfferUrl?: string;
  /** The service chosen at checkout, e.g. "courier" → "Your FlowSync courier listing is paid for". */
  serviceId?: string | null;
}) {
  const base = new URL(opts.signInUrl).origin;
  const upgradeUrl = opts.upgradeUrl || `${base}/account/edit`;
  const welcomeService = serviceLabel(opts.serviceId);
  // Accurate, not aspirational: the listing is paid for, but the driver isn't in
  // the directory until they finish their profile, upload their license and
  // insurance, and an admin approves them.
  const listingPhrase = welcomeService
    ? `Your FlowSync ${welcomeService.toLowerCase()} listing is paid for`
    : "Your FlowSync driver listing is paid for";
  const fleetOffer = opts.fleetOfferUrl
    ? `<p ${P}>Same window for the fleet: for ${OFFER_WINDOW_HOURS} hours it's <strong style="color:#e7ecef">$${FLEET.addOnPriceWithoutPremium} more</strong> to get activated on our Curri carrier account (that includes everything in Premium). After that it's $${FLEET.price} from your account. <a href="${opts.fleetOfferUrl}" style="color:#25e07a">See the fleet offer →</a></p>`
    : "";
  const premium = premiumOfferPrice();

  const body = `
    <p ${P}>Hi ${opts.firstName} — you're in. ${listingPhrase}. Finish your profile and upload your license and insurance, and once we've approved you you're live in the directory, setting your own rates on every job.</p>
    <p ${P}>Sign in with this temporary password, and you'll be asked to set a permanent one:</p>
    <div style="background:#11181c;border:1px solid #1d262b;border-radius:12px;padding:14px;margin:14px 0;text-align:center;font-size:18px;font-weight:700;letter-spacing:1px;color:#25e07a">${opts.tempPassword}</div>
    <p style="margin:0 0 6px">${button(opts.signInUrl, "Sign in to FlowSync")}</p>

    <h2 ${H2}>Your first 10 minutes inside</h2>
    <ol style="padding-left:20px;margin:0">
      <li ${LI}><strong style="color:#e7ecef">Set your password</strong> and land on your dashboard.</li>
      <li ${LI}><strong style="color:#e7ecef">Finish your profile</strong> — photo, vehicle, city, and the services you offer, plus your driver's license and insurance so we can verify you. Once you're approved, that's what customers see in the directory.</li>
      <li ${LI}><strong style="color:#e7ecef">Open your Driver Roadmap.</strong> It's the 30-day action plan, one box at a time. Do a box a day and you'll be set up properly, with a real shot at your first direct customer.</li>
      <li ${LI}><strong style="color:#e7ecef">Follow the setup guides.</strong> USDOT and EIN for free (no filing service), LLC filing, medical courier requirements, and how to sign up with Curri and Dispatch as a carrier instead of a gig driver. Plus your own service menu with your prices.</li>
    </ol>

    <h2 ${H2}>Want to run it like a business? Add Premium.</h2>
    <p ${P}>The listing gets you found. Premium is the business behind it: <strong style="color:#e7ecef">the bidding calculator</strong> (your floor and your bid on every load), <strong style="color:#e7ecef">the business P&amp;L tracker</strong> (cost per mile, rate per mile, net income by week, month, quarter), the guide on running an ad for your delivery business, and <strong style="color:#e7ecef">the Curri mastermind course</strong> — the exact playbook below, lesson by lesson. Plus the Premium badge, priority placement above other drivers, and your own website link.</p>
    <p ${P}>For <strong style="color:#e7ecef">${OFFER_WINDOW_HOURS} hours after your purchase</strong> it's <strong style="color:#e7ecef">$${premium} more, one-time</strong> (Premium's price includes the listing you already bought). After that it's $${premiumUpgradePrice()} from your account. No subscription, same 30-day money-back guarantee.</p>
    <p style="margin:0 0 6px">${button(upgradeUrl, `Add Premium — $${premium} more`)}</p>
    ${fleetOffer}

    <h2 ${H2}>One rental van → four brand-new Sprinters</h2>
    <p ${P}>Quick story, because it's the whole reason FlowSync exists.</p>
    <p ${P}>A few years ago Barham Transport was me and one rented cargo van. One. I picked one delivery app — Curri — and ran it like a business instead of a side hustle. Today we run four brand-new Mercedes Sprinter vans, and that same app is still a big part of how we fill the day. When we have gaps, other apps fill them. The goal was never loyalty to an app — it was the best return per mile for every hour we're out.</p>
    <p ${P}>Three things we do that most drivers never think of:</p>
    <ol style="padding-left:20px;margin:0">
      <li ${LI}><strong style="color:#e7ecef">Fill the gaps on purpose.</strong> One app for the backbone, others for the dead time between runs. Dollars per mile per hour is the only score that matters.</li>
      <li ${LI}><strong style="color:#e7ecef">Get every vehicle type on your carrier profile — even the bigger ones.</strong> Plenty of jobs get posted as "box truck" when it's one pallet under 400 lbs that fits in a pickup. We've seen those pay 5x per mile compared to a job posted for a pickup with a 1,200-lb pallet. Same drive, very different paycheck. Only take it if the load truly fits your vehicle — but that one habit alone 10x'd our profit on plenty of deliveries.</li>
      <li ${LI}><strong style="color:#e7ecef">Run two logins once you have your own carrier account.</strong> The app hides other opportunities until your current delivery is complete. Carriers can add drivers under their account, and some run a second driver login (a Google Voice number on a second device) so that while one login is on a run, the other still sees what's posting near your drop-off or along the same route. Read the app's current terms before you do this — it's your account.</li>
    </ol>
    <p ${P}>None of that is a promise about what you'll earn. It's what worked for us, and the guides and tools in your account are how we turn it into something you can copy.</p>
    <p style="color:#7c8a92;font-size:12px;line-height:1.5;margin:0 0 14px">FlowSync and Barham Transport LLC are independent and are not owned by, affiliated with, or part of Curri or any other delivery platform. We're a carrier that uses their app, same as any driver can.</p>

    <p ${P}>Got a question? Just reply — a real person reads it.</p>
    <p ${P}>— Nas Barham<br><span style="color:#7c8a92">Barham Transport / FlowSync Drivers</span></p>`;

  return send(
    opts.to,
    `You're in, ${opts.firstName} — your FlowSync login + the story behind the vans`,
    shell("You're in", body),
  );
}

/**
 * Listing bought by someone who ALREADY had an account (admin-added, imported,
 * or a returning buyer). The webhook doesn't create a password for them, so they
 * don't get the welcome email — this tells them the payment landed, how to sign
 * in, and repeats the 24h offer links the welcome email would have carried.
 * Transactional. Offers only when the caller passes their links.
 */
export interface PurchaseConfirmationOpts {
  to: string;
  firstName: string;
  amountCents: number;
  /** True when the account exists but never set a password (admin-added / imported). */
  needsPassword: boolean;
  signInUrl: string;
  forgotPasswordUrl: string;
  /** Offer page A (Premium for the difference, 24h). Omit when not offered. */
  upgradeUrl?: string;
  /** Offer page B (fleet without Premium, 24h). Omit when not offered. */
  fleetOfferUrl?: string;
}

export function purchaseConfirmationEmail(opts: PurchaseConfirmationOpts): { subject: string; html: string } {
  const amount = `$${(opts.amountCents / 100).toFixed(2)}`;
  const signIn = opts.needsPassword
    ? `<p ${P}>Your account doesn't have a password yet. Set one on the page you landed on right after paying, or use <a href="${opts.forgotPasswordUrl}" style="color:#25e07a">"Forgot password?"</a> and we'll email you a link.</p>`
    : `<p ${P}>Sign in with your existing password — there's nothing new to set up. Forgot it? Use <a href="${opts.forgotPasswordUrl}" style="color:#25e07a">"Forgot password?"</a> on the sign-in page.</p>`;
  const premium = premiumOfferPrice();
  const offers = opts.upgradeUrl
    ? `
    <h2 ${H2}>Two offers, open for ${OFFER_WINDOW_HOURS} hours</h2>
    <p ${P}>For ${OFFER_WINDOW_HOURS} hours after your purchase, Premium is <strong style="color:#e7ecef">$${premium} more, one-time</strong> instead of $${premiumUpgradePrice()} from your account later. Premium's price includes the listing you just bought. It adds the bidding calculator, the business P&amp;L tracker, the Curri mastermind course, every guide, and the Premium badge with priority placement. Same ${GUARANTEE_DAYS}-day money-back guarantee.</p>
    <p style="margin:0 0 6px">${button(opts.upgradeUrl, `Add Premium — $${premium} more`)}</p>
    ${
      opts.fleetOfferUrl
        ? `<p ${P}>Same window for the fleet: <strong style="color:#e7ecef">$${FLEET.addOnPriceWithoutPremium} more</strong> to get activated on our Curri carrier account (that includes everything in Premium), instead of $${FLEET.price} from your account later. <a href="${opts.fleetOfferUrl}" style="color:#25e07a">See the fleet offer →</a></p>
    <p style="color:#7c8a92;font-size:12px;line-height:1.5;margin:0 0 14px">Fleet refund terms: ${FLEET.refundShort} FlowSync and Barham Transport LLC are independent and are not owned by, affiliated with, or part of Curri. Fleet drivers are independent contractors. No guarantee of load volume or earnings.</p>`
        : ""
    }`
    : "";
  const body = `
    <p ${P}>Hi ${opts.firstName}, your ${amount} payment went through, and it's on the FlowSync account you already have (${opts.to}).</p>
    ${signIn}
    <p style="margin:0 0 18px">${button(opts.signInUrl, "Sign in to FlowSync")}</p>
    <p ${P}>To go live in the directory: finish your profile, upload your driver's license and insurance, and we'll review you. You'll get an email the moment you're approved.</p>
    ${offers}
    <p ${P}>Got a question? Just reply — a real person reads it.</p>
    <p ${P}>— Nas Barham<br><span style="color:#7c8a92">Barham Transport / FlowSync Drivers</span></p>`;
  return {
    subject: "Payment received — your FlowSync listing is paid for",
    html: shell("Payment received", body),
  };
}

export async function sendPurchaseConfirmationEmail(opts: PurchaseConfirmationOpts) {
  const { subject, html } = purchaseConfirmationEmail(opts);
  return send(opts.to, subject, html);
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export async function sendBookingRequestEmail(opts: {
  to: string;
  driverFirstName: string;
  customerName: string;
  service: string;
  details: string;
  bookingsUrl: string;
}) {
  const body = `
    <p style="color:#aebac1;line-height:1.6">Hi ${opts.driverFirstName}, you have a new ${opts.service.toLowerCase()} request from <strong style="color:#e7ecef">${opts.customerName}</strong>:</p>
    <div style="background:#11181c;border:1px solid #1d262b;border-radius:12px;padding:14px;margin:14px 0;color:#aebac1">${opts.details}</div>
    <p style="margin-top:8px">${button(opts.bookingsUrl, "Review & send a quote")}</p>`;
  return send(opts.to, `New ${opts.service.toLowerCase()} request from ${opts.customerName}`, shell("New booking request", body));
}

export async function sendQuoteEmail(opts: {
  to: string;
  customerName: string;
  driverName: string;
  amountCents: number;
  payUrl: string;
}) {
  const body = `
    <p style="color:#aebac1;line-height:1.6">Hi ${opts.customerName}, ${opts.driverName} sent you a quote:</p>
    <div style="background:#11181c;border:1px solid #1d262b;border-radius:12px;padding:14px;margin:14px 0;text-align:center;font-size:24px;font-weight:800;color:#25e07a">${money(opts.amountCents)}</div>
    <p style="margin-top:8px">${button(opts.payUrl, "Review & pay")}</p>`;
  return send(opts.to, `Your quote from ${opts.driverName} — ${money(opts.amountCents)}`, shell("You have a quote", body));
}

export async function sendBookingPaidEmail(opts: {
  to: string;
  driverFirstName: string;
  customerName: string;
  amountCents: number;
}) {
  const body = `
    <p style="color:#aebac1;line-height:1.6">Hi ${opts.driverFirstName}, ${opts.customerName} just paid ${money(opts.amountCents)} — go make it happen!</p>`;
  return send(opts.to, `You got booked — ${money(opts.amountCents)}`, shell("Payment received", body));
}

export async function sendBookingReceiptEmail(opts: {
  to: string;
  customerName: string;
  driverName: string;
  amountCents: number;
}) {
  const body = `
    <p style="color:#aebac1;line-height:1.6">Hi ${opts.customerName}, thanks for your payment. Here's your receipt:</p>
    <div style="background:#11181c;border:1px solid #1d262b;border-radius:12px;padding:14px;margin:14px 0">
      <table style="width:100%;color:#aebac1;font-size:14px">
        <tr><td>Driver</td><td style="text-align:right;color:#e7ecef">${opts.driverName}</td></tr>
        <tr><td style="padding-top:8px">Amount paid</td><td style="text-align:right;color:#25e07a;font-weight:700;padding-top:8px">${money(opts.amountCents)}</td></tr>
      </table>
    </div>
    <p style="color:#7c8a92;font-size:13px">${opts.driverName} has been notified and will be in touch to coordinate.</p>`;
  return send(opts.to, `Receipt — ${money(opts.amountCents)} to ${opts.driverName}`, shell("Payment confirmed", body));
}

export async function sendDriverApprovedEmail(opts: {
  to: string;
  firstName: string;
  profileUrl: string;
}) {
  const body = `
    <p style="color:#aebac1;line-height:1.6">Great news, ${opts.firstName} — your documents have been reviewed and your FlowSync profile is now <strong style="color:#25e07a">verified</strong>. Customers will see your Verified badge and can book you directly.</p>
    <p style="margin-top:8px">${button(opts.profileUrl, "View your profile")}</p>`;
  return send(opts.to, "You're verified on FlowSync", shell("You're verified", body));
}

// Sent automatically the moment the $97 upgrade is paid (Stripe webhook) or
// when an admin sets a driver to Premium. Premium only — the Curri fleet is a
// separate offer and gets its own message. The owner wrote this copy: it asks
// three questions so the done-for-you setup fits where the driver actually is.
// The driver replies to it, so the reply-to (support inbox) matters.
export async function sendPremiumUpgradeEmail(opts: {
  to: string;
  firstName: string;
  accountUrl: string;
  /** Offer page B (fleet for $150 more, 24h) — set by the Stripe webhook only. */
  fleetOfferUrl?: string;
} & DriverDetails) {
  const onFile = onFilePhrase(opts);
  const ps = opts.fleetOfferUrl
    ? `<p ${P}>P.S. For ${OFFER_WINDOW_HOURS} hours after your Premium purchase, getting activated on our Curri carrier account is <strong style="color:#e7ecef">$${FLEET.addOnPrice} more</strong> instead of $${FLEET.price}. <a href="${opts.fleetOfferUrl}" style="color:#25e07a">See the fleet offer →</a></p>`
    : "";
  const body = `
    <p ${P}>Hey ${opts.firstName},</p>
    <p ${P}>You're in as a FlowSync Premium member. Log into your account and you'll see your status marked <strong style="color:#25e07a">Premium</strong>. That unlocks the tools we've built for members so far: mileage tracker, profit &amp; loss tracker, bidding calculator, with more rolling out.</p>
    <p style="margin:0 0 18px">${button(opts.accountUrl, "Log into your account")}</p>
    <p ${P}>Now, before I point you toward the right next step, I want to actually know where you're at instead of guessing. ${onFile} — just need a little more so whatever we build for you actually fits.</p>
    <p ${P}><strong style="color:#e7ecef">Three quick things:</strong></p>
    <ol style="padding-left:20px;margin:0 0 14px">
      <li ${LI}>Are you signed up with <strong style="color:#e7ecef">CURRI</strong>? If so, where do you stand right now:
        <div style="color:#aebac1;line-height:1.6;margin-top:4px">a. Haven't started yet<br>b. Signed up and waiting to get activated<br>c. Already active and running deliveries</div>
      </li>
      <li ${LI}>What other delivery apps, if any, are you currently working (DoorDash, Amazon Flex, Uber, Roadie, whatever it is)?</li>
      <li ${LI}>What's the one thing slowing you down or making this harder than it should be right now?</li>
    </ol>
    <p ${P}><strong style="color:#e7ecef">Reply to this email with those three</strong> and I'll come back with a plan built specifically around where you actually are.</p>
    <p ${P}>— Nas Barham<br><span style="color:#7c8a92">Barham Transport / FlowSync Drivers</span></p>
    ${ps}`;
  return send(opts.to, "You're in — FlowSync Premium (3 quick questions)", shell("Welcome to Premium", body));
}

/**
 * Sent the moment the Curri fleet invite is paid (either price). The owner
 * still has to add the driver to the carrier account and send the Stripe
 * Connect link by hand, so this email's job is to collect what he needs and
 * set the expectation of what happens next.
 */
export async function sendFleetWelcomeEmail(opts: {
  to: string;
  firstName: string;
  fleetUrl: string;
} & DriverDetails) {
  const known = knownDetailsPhrase(opts);
  // Fleet buyers are the only drivers who get the Telegram invite.
  const telegram = fleetTelegramInviteUrl();
  const fleetStep1 = known
    ? `<strong style="color:#e7ecef">Reply to this email</strong> to confirm your details — I've got ${known} on file — plus the email for your Stripe payouts, and whether you want standard pay (every Friday, ${FLEET.dispatchFeePercent}% dispatching fee) or faster pay (1–2 business days, ${FLEET.fastPayoutFeePercent}%).`
    : `<strong style="color:#e7ecef">Reply to this email</strong> with your city, your vehicle (year, make, model), and whether you want standard pay (every Friday, ${FLEET.dispatchFeePercent}% dispatching fee) or faster pay (1–2 business days, ${FLEET.fastPayoutFeePercent}%).`;
  const body = `
    <p ${P}>Hey ${opts.firstName} — you're in. Welcome to the Barham Transport fleet.</p>
    <p ${P}>Here's how the next few days go:</p>
    <ol style="padding-left:20px;margin:0 0 14px">
      <li ${LI}>${fleetStep1}</li>
      <li ${LI}><strong style="color:#e7ecef">We add you to our carrier account.</strong> That's what gets you activated so loads can be dispatched to you. Usually same day once we have your details.</li>
      <li ${LI}><strong style="color:#e7ecef">You get a Stripe setup link</strong> from us. That's where every payout lands, and it's what your 1099 comes from at year end. Don't have Stripe yet? We can send your first two or three payouts another way while you set it up.</li>
      <li ${LI}><strong style="color:#e7ecef">Loads start showing up.</strong> Claim, bid, or pass — you're never required to take one.</li>
      <li ${LI}><strong style="color:#e7ecef">Everything in Premium is unlocked in your account.</strong> The bidding calculator, the P&amp;L tracker, every guide, and the Curri mastermind — use them from day one.</li>
      ${telegram ? `<li ${LI}><strong style="color:#e7ecef">Join the fleet Telegram group</strong> once you're activated — dispatch updates and the other fleet drivers are there. <a href="${telegram}" style="color:#25e07a">Open the group →</a></li>` : ""}
    </ol>
    <p style="color:#7c8a92;font-size:12px;line-height:1.5;margin:0 0 14px">Refund terms you agreed to at checkout: ${FLEET.refundShort} Two violations on the carrier account means removal from the fleet without a refund.</p>
    <p ${P}>The full walkthrough, including how we bid loads instead of claiming them at the listed price, is in your account:</p>
    <p style="margin:0 0 18px">${button(opts.fleetUrl, "Open the fleet guide")}</p>
    <p style="color:#7c8a92;font-size:12px;line-height:1.5;margin:0 0 14px">FlowSync and Barham Transport LLC are independent and are not owned by, affiliated with, or part of Curri. Fleet drivers are independent contractors. No guarantee of load volume or earnings.</p>
    <p ${P}>— Nas Barham<br><span style="color:#7c8a92">Barham Transport / FlowSync Drivers</span></p>`;
  return send(opts.to, `You're in the fleet, ${opts.firstName} — next steps`, shell("Welcome to the fleet", body));
}

/**
 * Abandoned-checkout recovery. Sent by the webhook when a new buyer's Stripe
 * Checkout expires unpaid. Personal, one link, the real price (and the real
 * increase date while it's pending), the guarantee. No discount, no fake timer.
 */
export async function sendCheckoutRecoveryEmail(opts: {
  to: string;
  firstName?: string;
  product: "listing" | "fleet";
  resumeUrl: string;
}) {
  const name = opts.firstName || "there";
  const isFleet = opts.product === "fleet";
  const price = isFleet ? FLEET.price : listingPrice();
  const pending = !isFleet && listingIncreasePending();
  const what = isFleet ? "joining the Curri fleet" : "your FlowSync driver listing";
  const body = `
    <p ${P}>Hi ${name} — you started ${what} but didn't finish. No pressure; here's the link to pick up right where you left off.</p>
    ${
      pending
        ? `<p ${P}>One heads-up so you're not surprised later: the listing is <strong style="color:#e7ecef">$${price} until ${LISTING_INCREASE_DATE_LABEL}</strong>, then it goes to $${LISTING_PRICE_AFTER}. Same ${GUARANTEE_DAYS}-day money-back guarantee either way.</p>`
        : `<p ${P}>It's <strong style="color:#e7ecef">$${price} one-time</strong>, with a ${GUARANTEE_DAYS}-day money-back guarantee.</p>`
    }
    <p style="margin:0 0 18px">${button(opts.resumeUrl, isFleet ? `Finish joining — $${price}` : `Finish my listing — $${price}`)}</p>
    <p ${P}>Stuck on something, or just have a question? Reply to this email — a real person reads it.</p>
    <p ${P}>— Nas Barham<br><span style="color:#7c8a92">Barham Transport / FlowSync Drivers</span></p>`;
  const subject = isFleet
    ? "Your fleet spot is still open"
    : pending
      ? `Your FlowSync listing is still waiting (it's $${price} until ${LISTING_INCREASE_DATE_LABEL})`
      : "Your FlowSync listing is still waiting";
  return send(opts.to, subject, shell(isFleet ? "Pick up where you left off" : "Your listing is one click away", body));
}

/**
 * Review invite. Only drivers who are actively running loads with us get one —
 * the owner sends it from the admin driver page. The link carries a signed
 * token (lib/review-invite.ts); without it the review form stays locked.
 */
export async function sendReviewInviteEmail(opts: {
  to: string;
  firstName: string;
  inviteUrl: string;
}) {
  const body = `
    <p ${P}>Hi ${opts.firstName} — you've been running loads with us, so I'd like your honest take on FlowSync. Drivers deciding whether to sign up trust what working drivers say a lot more than anything I write.</p>
    <p ${P}>It takes about two minutes. Pick a star rating, write a few sentences, done. Your name shows as first name + last initial and your city only, and I read every review before it goes public.</p>
    <p style="margin:0 0 14px">${button(opts.inviteUrl, "Leave your review")}</p>
    <p style="color:#7c8a92;font-size:12px;line-height:1.5;margin:0 0 14px">This link is just for you — sign in to your FlowSync account first if you aren't already. It stays good for 90 days.</p>
    <p ${P}>Thanks for riding with us.</p>
    <p ${P}>— Nas Barham<br><span style="color:#7c8a92">Barham Transport / FlowSync Drivers</span></p>`;
  return send(opts.to, `${opts.firstName}, can I get your honest review of FlowSync?`, shell("Your review", body));
}

export async function sendPnlProEmail(opts: {
  to: string;
  firstName: string;
  trackerUrl: string;
}) {
  const body = `
    <p style="color:#aebac1;line-height:1.6">Hi ${opts.firstName} — your <strong style="color:#25e07a">P&amp;L Tracker Pro</strong> is on, and your first month is <strong style="color:#e7ecef">free</strong>.</p>
    <p style="color:#aebac1;line-height:1.6">Your numbers now save to your FlowSync account, so your books follow you on any device — and you can pull a tax-ready export anytime.</p>
    <p style="color:#7c8a92;font-size:13px">We'll remind you before your first $17 charge. Cancel anytime from your account.</p>
    <p style="margin-top:8px">${button(opts.trackerUrl, "Open your tracker")}</p>`;
  return send(opts.to, "Your P&L Tracker Pro is on — first month free", shell("You're on Pro", body));
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  firstName: string;
  resetUrl: string;
}) {
  const body = `
    <p style="color:#aebac1;line-height:1.6">Hi ${opts.firstName}, we got a request to reset your FlowSync password. Click below to choose a new one — the link expires in 1 hour.</p>
    <p style="margin-top:8px">${button(opts.resetUrl, "Reset my password")}</p>
    <p style="color:#7c8a92;font-size:13px;margin-top:14px">If you didn't request this, you can safely ignore this email — your password won't change.</p>`;
  return send(opts.to, "Reset your FlowSync password", shell("Password reset", body));
}

export async function sendTempPasswordEmail(opts: {
  to: string;
  firstName: string;
  tempPassword: string;
  signInUrl: string;
}) {
  const body = `
    <p style="color:#aebac1;line-height:1.6">Hi ${opts.firstName}, your FlowSync password was reset. Sign in with this temporary password and you'll be asked to set a new one:</p>
    <div style="background:#11181c;border:1px solid #1d262b;border-radius:12px;padding:14px;margin:14px 0;text-align:center;font-size:18px;font-weight:700;letter-spacing:1px;color:#25e07a">${opts.tempPassword}</div>
    <p style="margin-top:8px">${button(opts.signInUrl, "Sign in to FlowSync")}</p>`;
  return send(opts.to, "Your FlowSync password was reset", shell("Password reset", body));
}

export async function sendWelcomeEmail(opts: { to: string; firstName: string; profileUrl: string }) {
  const body = `
    <p style="color:#aebac1;line-height:1.6">Hi ${opts.firstName}, welcome to FlowSync. Your account is ready — finish your profile and upload your documents to get verified.</p>
    <p style="margin-top:8px">${button(opts.profileUrl, "Complete your profile")}</p>`;
  return send(opts.to, "Welcome to FlowSync", shell("Welcome aboard", body));
}
