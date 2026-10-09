import { Resend } from "resend";
import { SITE_URL, SUPPORT_EMAIL } from "./site";
import { tagEmailLinks } from "./attribution";
import { fleetTelegramInviteUrl } from "./telegram-invite";
import { CHALLENGE_DAYS, challengeName } from "./challenge";
import { EARNINGS_SOURCE, type Vehicle } from "./earnings";
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

/** What every send returns. `reason` says why it didn't go, for owner alerts. */
export interface EmailResult {
  sent: boolean;
  reason?: "not-configured" | "failed";
  /** Resend's own error message when `reason` is "failed" (e.g. a rate limit or quota) — safe to show an admin. */
  detail?: string;
  to: string;
  subject: string;
  /** Resend's id for the email — needed to cancel a scheduled one. */
  id?: string;
}

interface SendOptions {
  headers?: Record<string, string>;
  /** ISO time to deliver later (Resend scheduling); cancel with cancelScheduledEmail. */
  scheduledAt?: string;
  /**
   * Which email this is, e.g. "welcome", "recovery", "m2-finish-setup". Every
   * link into the site gets utm_source=email&utm_medium=email&utm_campaign=<this>
   * (lib/attribution.ts), so a purchase that started from this email says so
   * in Stripe. Leave unset for emails whose links shouldn't be tagged
   * (password resets, owner alerts).
   */
  campaign?: string;
}

async function send(to: string, subject: string, rawHtml: string, opts: SendOptions = {}): Promise<EmailResult> {
  const html = opts.campaign ? tagEmailLinks(rawHtml, opts.campaign, process.env.NEXT_PUBLIC_SITE_URL || SITE_URL) : rawHtml;
  const resend = getResend();
  if (!resend || !process.env.RESEND_FROM_EMAIL) {
    // A warning, not a quiet log: in production this means no customer email
    // is going out at all (RESEND_API_KEY / RESEND_FROM_EMAIL missing).
    console.warn(`[email:skipped] "${subject}" -> ${to} (RESEND_API_KEY or RESEND_FROM_EMAIL not set)`);
    return { sent: false, reason: "not-configured", to, subject };
  }
  try {
    // Several emails say "just reply" — replies must land in the inbox a
    // human actually reads, not whatever RESEND_FROM_EMAIL happens to be.
    const { data, error } = await resend.emails.send({
      from: from(),
      to,
      subject,
      html,
      replyTo: SUPPORT_EMAIL,
      ...(opts.headers ? { headers: opts.headers } : {}),
      ...(opts.scheduledAt ? { scheduledAt: opts.scheduledAt } : {}),
    });
    if (error) {
      console.error(`[email] Resend refused "${subject}" -> ${to}:`, error.message ?? error);
      return { sent: false, reason: "failed", detail: error.message ?? String(error), to, subject };
    }
    return { sent: true, to, subject, id: data?.id };
  } catch (e) {
    console.error(`[email] send failed "${subject}" -> ${to}:`, e);
    return { sent: false, reason: "failed", detail: e instanceof Error ? e.message : String(e), to, subject };
  }
}

function shell(heading: string, body: string, footer = "You're receiving this because you signed up at flowsyncdriver.com."): string {
  return `<!doctype html><html><body style="margin:0;background:#07090b;font-family:Arial,Helvetica,sans-serif;color:#e7ecef">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <div style="font-size:20px;font-weight:800;color:#25e07a;margin-bottom:24px">FlowSync</div>
    <div style="background:#0e1316;border:1px solid #1d262b;border-radius:16px;padding:28px">
      <h1 style="font-size:22px;margin:0 0 12px">${heading}</h1>
      ${body}
    </div>
    <p style="color:#7c8a92;font-size:12px;line-height:1.5;margin-top:20px">${footer}</p>
  </div></body></html>`;
}

const escapeHtml = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * A MARKETING email (fix 7): the usual look plus the legally required footer —
 * business name, postal address, unsubscribe link — and the one-click
 * unsubscribe headers Gmail and Yahoo require of bulk senders. Don't call this
 * directly: go through lib/marketing.ts, which checks who may receive it.
 */
export async function sendMarketingEmail(opts: {
  to: string;
  subject: string;
  heading: string;
  body: string;
  unsubscribeUrl: string;
  postalAddress: string;
  scheduledAt?: string;
  /** Why they're getting it, for people without an account (e.g. quiz leads). Default: the account wording. */
  reason?: string;
  /** Tag for the links (see SendOptions.campaign). Defaults to "marketing". */
  campaign?: string;
}): Promise<EmailResult> {
  const link = `<a href="${opts.unsubscribeUrl}" style="color:#7c8a92;text-decoration:underline">Unsubscribe</a>`;
  const footer =
    `Barham Transport LLC · ${escapeHtml(opts.postalAddress)}<br>` +
    (opts.reason
      ? `${escapeHtml(opts.reason)} ${link} anytime.`
      : `You're getting this because you have a FlowSync driver account. ` +
        `${link} from tips and offers — you'll still get emails about your account and payments.`);
  return send(opts.to, opts.subject, shell(opts.heading, opts.body, footer), {
    headers: {
      "List-Unsubscribe": `<${opts.unsubscribeUrl}>, <mailto:${SUPPORT_EMAIL}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    scheduledAt: opts.scheduledAt,
    campaign: opts.campaign ?? "marketing",
  });
}

/**
 * M1 — "offer closing soon" (owner-approved copy, 2026-10-01). For a Verified
 * buyer who has taken neither post-checkout offer, scheduled for 20h after the
 * purchase. Content only: lib/offer-reminders.ts schedules it through
 * lib/marketing.ts, which adds the legal footer and decides who may get it.
 * Every price comes from lib/pricing.ts.
 */
export function offerClosingEmail(opts: {
  firstName: string;
  hoursLeft: number;
  premiumUrl: string;
  fleetUrl: string;
}): { subject: string; heading: string; body: string } {
  const premium = premiumOfferPrice();
  const fleet = FLEET.addOnPriceWithoutPremium;
  const body = `
    <p ${P}>Hi ${escapeHtml(opts.firstName)} — quick heads-up so it doesn't sneak past you. The two offers from your purchase close in about ${opts.hoursLeft} hours. After that they're gone for good. Skipping them changes nothing about your listing; it's yours either way.</p>

    <h2 ${H2}>Premium — $${premium} more</h2>
    <p ${P}>(Instead of $${premiumUpgradePrice()} from your account later.) The bidding calculator, the business P&amp;L tracker with cost and rate per mile, the Curri mastermind course, every guide, and the Premium badge with priority placement. Same ${GUARANTEE_DAYS}-day money-back guarantee.</p>
    <p style="margin:0 0 6px">${button(opts.premiumUrl, `Add Premium — $${premium}`)}</p>

    <h2 ${H2}>Curri fleet — $${fleet} more</h2>
    <p ${P}>(Instead of $${FLEET.price} later, and it includes everything in Premium.) Get activated on our carrier account, we bid the loads, you run the ones you want, paid every Friday with a ${FLEET.dispatchFeePercent}% dispatching fee. How many loads you see depends on your market.</p>
    <p style="margin:0 0 6px">${button(opts.fleetUrl, "See the fleet offer")}</p>
    <p style="color:#7c8a92;font-size:13px;font-style:italic;line-height:1.5;margin:0 0 14px">${FLEET.refundShort}</p>

    <p ${P}>Questions? Just reply.</p>
    <p style="color:#7c8a92;font-size:12px;font-style:italic;line-height:1.5;margin:0 0 14px">FlowSync and Barham Transport LLC are independent and are not owned by, affiliated with, or part of Curri. Fleet drivers are independent contractors. No guarantee of load volume or earnings.</p>
    <p ${P}>— Nas Barham<br><span style="color:#7c8a92">Barham Transport / FlowSync Drivers</span></p>`;
  return {
    subject: `Your Premium price ends in about ${opts.hoursLeft} hours`,
    heading: `About ${opts.hoursLeft} hours left`,
    body,
  };
}

/**
 * M1b — "fleet offer closing soon" (owner-approved copy, 2026-10-02). For a
 * driver who bought Premium and hasn't joined the fleet, scheduled for 20h
 * after the Premium purchase. Content only, like offerClosingEmail above.
 */
export function fleetOfferClosingEmail(opts: {
  firstName: string;
  hoursLeft: number;
  fleetUrl: string;
}): { subject: string; heading: string; body: string } {
  const body = `
    <p ${P}>Hi ${escapeHtml(opts.firstName)} — since you're on Premium, joining the Curri fleet is <strong style="color:#e7ecef">$${FLEET.addOnPrice} more</strong> for about ${opts.hoursLeft} more hours, instead of $${FLEET.price} from your account later. No pressure; Premium is yours either way.</p>
    <p ${P}>What you'd get: activated on our carrier account (usually the same day we have your details, while this month's spots are open), loads dispatched to you, we bid them, you run the ones you want, paid every Friday with a ${FLEET.dispatchFeePercent}% dispatching fee. How many loads you see depends on where you are.</p>
    <p style="margin:0 0 6px">${button(opts.fleetUrl, "See the fleet offer")}</p>
    <p style="color:#7c8a92;font-size:13px;font-style:italic;line-height:1.5;margin:0 0 14px">${FLEET.refundShort}</p>

    <p ${P}>Questions? Just reply.</p>
    <p style="color:#7c8a92;font-size:12px;font-style:italic;line-height:1.5;margin:0 0 14px">FlowSync and Barham Transport LLC are independent and are not owned by, affiliated with, or part of Curri. Fleet drivers are independent contractors. No guarantee of load volume or earnings.</p>
    <p ${P}>— Nas Barham<br><span style="color:#7c8a92">Barham Transport / FlowSync Drivers</span></p>`;
  return {
    subject: `Your fleet offer closes in about ${opts.hoursLeft} hours`,
    heading: `About ${opts.hoursLeft} hours left`,
    body,
  };
}

const signoff = () => `<p ${P}>— Nas Barham<br><span style="color:#7c8a92">Barham Transport / FlowSync Drivers</span></p>`;

/**
 * M2 — day 3 "finish setup" (owner-approved copy, 2026-10-02). For a new buyer
 * still missing their profile, main service, license or insurance. Content
 * only: lib/followups.ts picks who gets it and lib/marketing.ts adds the footer.
 */
export function finishSetupEmail(opts: {
  firstName: string;
  /** No profile yet, or no main service picked. */
  profileUnfinished: boolean;
  missingLicense: boolean;
  missingInsurance: boolean;
  url: string;
}): { subject: string; heading: string; body: string } {
  const steps: string[] = [];
  if (opts.profileUnfinished) steps.push("finish setting up your profile (name and main service)");
  if (opts.missingLicense) steps.push("upload your driver's license");
  if (opts.missingInsurance) steps.push("upload proof of insurance");
  const uploads = Number(opts.missingLicense) + Number(opts.missingInsurance);
  const name = escapeHtml(opts.firstName);
  const subject = opts.profileUnfinished
    ? `${opts.firstName}, your FlowSync profile isn't set up yet`
    : `${opts.firstName}, ${uploads === 1 ? "one upload" : "two uploads"} left`;
  const body = `
    <p ${P}>Hi ${name} — you paid for your listing a few days ago, but you're not in the review queue yet. Here's what's left:</p>
    <ul style="padding-left:20px;margin:0 0 14px">${steps.map((s) => `<li ${LI}>${s}</li>`).join("")}</ul>
    <p ${P}>A photo from your phone works. PDFs won't upload yet. Once both documents are in, we review you, and you'll get an email when you're live in the directory.</p>
    <p style="margin:0 0 6px">${button(opts.url, "Finish my profile")}</p>
    <p ${P}>Stuck on anything? Reply and tell me what — I read these.</p>
    ${signoff()}`;
  return { subject, heading: "Almost in the review queue", body };
}

/**
 * M3 — day 7 "first week" (owner-approved copy, 2026-10-02). The Premium line
 * only shows for drivers without Premium tools (not Premium, fleet or legacy).
 */
export function firstWeekEmail(opts: {
  firstName: string;
  launchPct: number;
  showPremium: boolean;
  url: string;
}): { subject: string; heading: string; body: string } {
  const premium = opts.showPremium
    ? `<p ${P}>When you're ready to run it like a business, Premium adds the bidding calculator, the P&amp;L tracker and the Curri mastermind course — $${premiumUpgradePrice()} one-time from your account, with the same ${GUARANTEE_DAYS}-day guarantee.</p>`
    : "";
  const body = `
    <p ${P}>Hi ${escapeHtml(opts.firstName)} — one week in. Wherever you are, these three moves matter most this week:</p>
    <ol style="padding-left:20px;margin:0 0 14px">
      <li ${LI}><strong style="color:#e7ecef">Open your Driver Roadmap and tick one box today.</strong> It's built to be done a box a day. (${opts.launchPct}% done so far.)</li>
      <li ${LI}><strong style="color:#e7ecef">Set your service menu and prices</strong> in My Services, so customers know what you do and what it costs.</li>
      <li ${LI}><strong style="color:#e7ecef">Read one setup guide:</strong> USDOT and EIN (both free to apply for), LLC filing (there's a small state filing fee), or signing up with Curri and Dispatch as a carrier.</li>
    </ol>
    <p style="margin:0 0 6px">${button(opts.url, "Open my Roadmap")}</p>
    ${premium}
    ${signoff()}`;
  return { subject: "Your first week on FlowSync — the next three things to do", heading: "One week in", body };
}

/**
 * M4 — win-back for a quiet driver (owner-approved copy, 2026-10-02). "Quiet"
 * means no Roadmap check-in for 14+ days (or never) — the only activity the
 * site records — so the copy talks about the Roadmap, not logins.
 */
export function winbackEmail(opts: {
  firstName: string;
  neverCheckedIn: boolean;
  nextStep: string;
  url: string;
}): { subject: string; heading: string; body: string } {
  const quiet = opts.neverCheckedIn
    ? "you haven't checked in on your Driver Roadmap yet"
    : "you haven't checked in on your Driver Roadmap in a couple of weeks";
  const body = `
    <p ${P}>Hi ${escapeHtml(opts.firstName)} — ${quiet}, so I wanted to check in, not sell you anything.</p>
    <p ${P}>If life got busy: pick up where you left off with one small step — <strong style="color:#e7ecef">${escapeHtml(opts.nextStep)}</strong>.</p>
    <p ${P}>If something got in the way — the setup, the documents, or you're not sure what to do next — reply and tell me. A real person reads it, and I'll point you to the right next step.</p>
    <p style="margin:0 0 6px">${button(opts.url, "Pick up where I left off")}</p>
    ${signoff()}`;
  return { subject: `Still building your delivery business, ${opts.firstName}?`, heading: "Checking in", body };
}

/**
 * The earnings-quiz breakdown a visitor asked to have emailed (owner-approved
 * copy, 2026-10-02). Same wording as the result on /tools/earnings: these are
 * BIDS we placed, never earnings. Prices and fees come from lib/pricing.ts.
 */
export function earningsBreakdownEmail(v: Vehicle): { subject: string; heading: string; body: string } {
  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
  const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
  const r = v.range;
  let result: string;
  let cta: string;
  if (v.track === "listing") {
    result =
      `<p ${P}>Curri loads are for pickups, vans and trucks, so we don't have car numbers to show. With a car, your strongest path is your own direct customers. ` +
      `A Verified listing puts you in our directory, where customers book you directly: ${usd(listingPrice())} one-time, with a ${GUARANTEE_DAYS}-day money-back guarantee.</p>`;
    cta = button(`${base}/pricing`, "Get listed");
  } else if (r) {
    result =
      `<p ${P}><strong style="color:#e7ecef">${escapeHtml(v.label)}:</strong> most of our recent bids were <strong style="color:#25e07a">${usd(r.typicalLow)}–${usd(r.typicalHigh)} per load</strong> (median ${usd(r.median)}). ` +
      `The full range ran from ${usd(r.min)}${r.minNote ? ` for ${escapeHtml(r.minNote)}` : ""} to ${usd(r.max)}${r.maxNote ? ` for ${escapeHtml(r.maxNote)}` : ""}.</p>` +
      `<p ${P}>These are bids we placed from the ${EARNINGS_SOURCE.account} on ${EARNINGS_SOURCE.dates} (${r.bids} ${escapeHtml(v.label)} bids). Not every bid wins, and a bid isn't a payout. ` +
      `Fleet drivers are paid the load rate minus the ${FLEET.dispatchFeePercent}% dispatching fee, and cover their own fuel, insurance and wear.</p>`;
    cta = button(`${base}/#curri-fleet`, "See how the Curri fleet works");
  } else {
    result =
      `<p ${P}>We haven't bid enough ${escapeHtml(v.label.toLowerCase())} loads recently to show a fair range, so we're not going to guess. ` +
      `${escapeHtml(v.label)}s can run Curri loads through our fleet.</p>`;
    cta = button(`${base}/#curri-fleet`, "See how the Curri fleet works");
  }
  const body = `
    <p ${P}>Here's the breakdown you asked for on our load-rate tool.</p>
    ${result}
    <p style="margin:0 0 6px">${cta}</p>
    <p style="color:#7c8a92;font-size:12px;font-style:italic;line-height:1.5;margin:0 0 14px">These numbers are bids we placed on real loads over two days. They are not typical or guaranteed earnings, and not what any driver was paid. What you make depends on your market, the hours you drive, the loads you accept and win, and your costs. FlowSync does not promise any income. FlowSync and Barham Transport LLC are independent and not affiliated with Curri.</p>
    <p ${P}>Questions? Just reply.</p>
    ${signoff()}`;
  return { subject: `Your ${v.label.toLowerCase()} load breakdown`, heading: "What loads are going for", body };
}

/**
 * Lead follow-ups L1–L3 for earnings-quiz signups (owner-approved copy,
 * 2026-10-02): day 2, 5 and 10 after signup. lib/leads.ts decides who gets
 * them; prices come from lib/pricing.ts. L1 has a fleet version (vans and
 * trucks) and a listing version (cars).
 */
export function leadFollowupEmail(step: 1 | 2 | 3, v: Vehicle | undefined): { subject: string; heading: string; body: string } {
  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
  const notCurri = `<p style="color:#7c8a92;font-size:12px;font-style:italic;line-height:1.5;margin:0 0 14px">FlowSync and Barham Transport LLC are independent and are not owned by, affiliated with, or part of Curri. Fleet drivers are independent contractors. No guarantee of load volume or earnings.</p>`;
  const refund = `fully refundable until you're activated`;
  if (step === 1 && v && v.track === "fleet") {
    const name = escapeHtml(v.label.toLowerCase());
    const body = `
    <p ${P}>Hi — two days ago you looked up what loads go for with a ${name}. Quick context on those numbers, because it's the part most drivers miss.</p>
    <p ${P}>They were bids we placed, not app prices. On a gig account you take the price the app lists. On our carrier account we bid, and when a load justifies it we aim well above the listed price. One example: a load listed at $100.45 that we won with a $300 bid. That's one load, not a promise — bids don't always win, and every market is different.</p>
    <p ${P}>That's the Curri fleet: you run loads on our carrier account, we bid them, and you're paid every Friday minus a ${FLEET.dispatchFeePercent}% dispatching fee. $${FLEET.price} one-time, ${refund}.</p>
    <p style="margin:0 0 6px">${button(`${base}/#curri-fleet`, "See how the fleet works")}</p>
    ${notCurri}
    ${signoff()}`;
    return { subject: `What those ${v.label.toLowerCase()} bids mean for you`, heading: "What those bids mean", body };
  }
  if (step === 1) {
    const body = `
    <p ${P}>Hi — Curri loads aren't built for cars, but your own customers are. A Verified listing puts you in our directory, where local customers book you directly at the prices you set.</p>
    <p ${P}>The drivers who land a first job fastest do two things: send their profile link to people they know, and post in local groups like Nextdoor. Your dashboard walks you through it step by step.</p>
    <p ${P}>$${listingPrice()} one-time, with a ${GUARANTEE_DAYS}-day money-back guarantee — no questions asked.</p>
    <p style="margin:0 0 6px">${button(`${base}/pricing`, "Get listed")}</p>
    ${signoff()}`;
    return { subject: "How car drivers find their own customers", heading: "Your own customers", body };
  }
  if (step === 2) {
    const body = `
    <p ${P}>Hi — whatever you drive, two free tools help you avoid unprofitable jobs. No account needed:</p>
    <ul style="padding-left:20px;margin:0 0 14px">
      <li ${LI}><strong style="color:#e7ecef">Quote calculator</strong> — prices a job so it covers your time, miles and costs.</li>
      <li ${LI}><strong style="color:#e7ecef">Profit &amp; loss tracker</strong> — shows what you actually take home after fuel and expenses (<a href="${base}/tools/profit-loss" style="color:#25e07a">open it here</a>).</li>
    </ul>
    <p ${P}>Use them on your next few jobs and you'll know your real numbers.</p>
    <p style="margin:0 0 6px">${button(`${base}/calculator`, "Open the quote calculator")}</p>
    ${signoff()}`;
    return { subject: "Two free tools before your next job", heading: "Know your real numbers", body };
  }
  const body = `
    <p ${P}>Hi — this is the last email in this series. If you're still deciding, here are your two options:</p>
    <ul style="padding-left:20px;margin:0 0 14px">
      <li ${LI}><strong style="color:#e7ecef">Verified listing — $${listingPrice()} one-time.</strong> Customers book you directly. ${GUARANTEE_DAYS}-day money-back guarantee.</li>
      <li ${LI}><strong style="color:#e7ecef">Curri fleet — $${FLEET.price} one-time.</strong> Run loads on our carrier account; we bid them; paid weekly minus a ${FLEET.dispatchFeePercent}% dispatching fee. Fully refundable until you're activated.</li>
    </ul>
    <p ${P}>If now's not the time, no worries — the free tools stay free. Reply anytime with questions; a real person reads it.</p>
    <p style="margin:0 0 6px">${button(`${base}/`, "Compare your options")}</p>
    ${notCurri}
    ${signoff()}`;
  return { subject: "Last note from me", heading: "Your two options", body };
}

/** Cancel an email scheduled with Resend. True if Resend accepted the cancel. */
export async function cancelScheduledEmail(id: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  try {
    const { error } = await resend.emails.cancel(id);
    if (error) {
      console.error(`[email] Resend couldn't cancel ${id}:`, error.message ?? error);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[email] cancel failed ${id}:`, e);
    return false;
  }
}

/**
 * Owner alert (lib/alerts.ts). Plain and internal: the first line of the
 * message becomes the subject, the whole message the body, line breaks kept.
 * Goes to each recipient (SUPPORT_EMAIL + ADMIN_EMAILS) separately so one bad address can't block
 * the others. Returns true if at least one send succeeded.
 */
export async function sendOwnerAlertEmail(
  to: string[],
  message: string,
  opts: { subjectPrefix?: string; label?: string; footer?: string } = {},
): Promise<boolean> {
  const firstLine = message.split("\n").find((l) => l.trim())?.trim() ?? "Alert";
  const subject = `${opts.subjectPrefix ?? "[FlowSync alert]"} ${firstLine}`.slice(0, 150);
  const footer = opts.footer ?? 'Sent to the support inbox and the ADMIN_EMAILS addresses. Every alert is also in Vercel → Logs (search "[alert]").';
  const html = `<!doctype html><html><body style="margin:0;background:#07090b;font-family:Arial,Helvetica,sans-serif;color:#e7ecef">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px">
    <div style="font-size:13px;font-weight:700;letter-spacing:1px;color:#25e07a;margin-bottom:14px">${escapeHtml(opts.label ?? "FLOWSYNC OWNER ALERT")}</div>
    <div style="background:#0e1316;border:1px solid #1d262b;border-radius:14px;padding:22px;white-space:pre-wrap;line-height:1.6;font-size:15px">${escapeHtml(message)}</div>
    <p style="color:#7c8a92;font-size:12px;margin-top:16px">${escapeHtml(footer)}</p>
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
 * `upgradeUrl` is the post-checkout one-time-offer page (no sign-in needed).
 * The "Add Premium — $50 more" section appears ONLY when it's passed, i.e. for a
 * listing buyer whose 24h offer is real. Fleet buyers (Premium is already
 * included) and admin-added drivers (no offer exists) get the email without it.
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
  /** Mention the First-$47 Challenge (paid buyers). Off for drivers an admin adds by hand. Default on. */
  challenge?: boolean;
}) {
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
  const premiumSection = opts.upgradeUrl
    ? `
    <h2 ${H2}>Want to run it like a business? Add Premium.</h2>
    <p ${P}>The listing gets you found. Premium is the business behind it: <strong style="color:#e7ecef">the bidding calculator</strong> (your floor and your bid on every load), <strong style="color:#e7ecef">the business P&amp;L tracker</strong> (cost per mile, rate per mile, net income by week, month, quarter), the guide on running an ad for your delivery business, and <strong style="color:#e7ecef">the Curri mastermind course</strong> — the exact playbook below, lesson by lesson. Plus the Premium badge, priority placement above other drivers, and your own website link.</p>
    <p ${P}>For <strong style="color:#e7ecef">${OFFER_WINDOW_HOURS} hours after your purchase</strong> it's <strong style="color:#e7ecef">$${premium} more, one-time</strong> (Premium's price includes the listing you already bought). After that it's $${premiumUpgradePrice()} from your account. No subscription, same 30-day money-back guarantee.</p>
    <p style="margin:0 0 6px">${button(opts.upgradeUrl, `Add Premium — $${premium} more`)}</p>
    ${fleetOffer}`
    : "";

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
    ${
      opts.challenge === false
        ? ""
        : `<h2 ${H2}>The ${challengeName()}</h2>
    <p ${P}>Your dashboard has a ${CHALLENGE_DAYS}-day, step-by-step plan aimed at landing the job that pays your listing back — one small step a day. It's a goal, not a promise, and your ${GUARANTEE_DAYS}-day money-back guarantee applies either way.</p>`
    }

    ${premiumSection}

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
    { campaign: "welcome" },
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
  return send(opts.to, subject, html, { campaign: "purchase-confirmation" });
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
  return send(opts.to, `New ${opts.service.toLowerCase()} request from ${opts.customerName}`, shell("New booking request", body), { campaign: "booking" });
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
  return send(opts.to, `Your quote from ${opts.driverName} — ${money(opts.amountCents)}`, shell("You have a quote", body), { campaign: "booking" });
}

export async function sendBookingPaidEmail(opts: {
  to: string;
  driverFirstName: string;
  customerName: string;
  amountCents: number;
}) {
  const body = `
    <p style="color:#aebac1;line-height:1.6">Hi ${opts.driverFirstName}, ${opts.customerName} just paid ${money(opts.amountCents)} — go make it happen!</p>`;
  return send(opts.to, `You got booked — ${money(opts.amountCents)}`, shell("Payment received", body), { campaign: "booking" });
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
  return send(opts.to, `Receipt — ${money(opts.amountCents)} to ${opts.driverName}`, shell("Payment confirmed", body), { campaign: "booking" });
}

export async function sendDriverApprovedEmail(opts: {
  to: string;
  firstName: string;
  profileUrl: string;
}) {
  const body = `
    <p style="color:#aebac1;line-height:1.6">Great news, ${opts.firstName} — your documents have been reviewed and your FlowSync profile is now <strong style="color:#25e07a">verified</strong>. Customers will see your Verified badge and can book you directly.</p>
    <p style="margin-top:8px">${button(opts.profileUrl, "View your profile")}</p>`;
  return send(opts.to, "You're verified on FlowSync", shell("You're verified", body), { campaign: "approved" });
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
  return send(opts.to, "You're in — FlowSync Premium (3 quick questions)", shell("Welcome to Premium", body), { campaign: "premium-welcome" });
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
    ? `<strong style="color:#e7ecef">Reply to this email</strong> to confirm your details — I've got ${known} on file — and whether you want standard pay (every Friday, ${FLEET.dispatchFeePercent}% dispatching fee) or faster pay (1–2 business days, ${FLEET.fastPayoutFeePercent}%).`
    : `<strong style="color:#e7ecef">Reply to this email</strong> with your city, your vehicle (year, make, model), and whether you want standard pay (every Friday, ${FLEET.dispatchFeePercent}% dispatching fee) or faster pay (1–2 business days, ${FLEET.fastPayoutFeePercent}%).`;
  const body = `
    <p ${P}>Hey ${opts.firstName} — you're in. Welcome to the Barham Transport fleet.</p>
    <p ${P}>Here's how the next few days go:</p>
    <ol style="padding-left:20px;margin:0 0 14px">
      <li ${LI}>${fleetStep1}</li>
      <li ${LI}><strong style="color:#e7ecef">We add you to our carrier account.</strong> That's what gets you activated so loads can be dispatched to you. Usually same day once we have your details.</li>
      <li ${LI}><strong style="color:#e7ecef">Set up your payouts.</strong> In your account, open <strong style="color:#e7ecef">Payouts</strong> and finish Stripe's short form (bank account and tax details — about 5 minutes). That's where every payout lands, and it's what your 1099 comes from at year end. Not done yet when your first load pays? We can send the first two or three payouts another way while you set it up.</li>
      <li ${LI}><strong style="color:#e7ecef">Go Active when you want loads.</strong> After you're activated, connect Telegram from the fleet page and set yourself Active. Loads that fit your vehicle, radius, and trip length are offered to you on Telegram with Accept and Pass — the first driver to accept gets the load. We claim or bid it in Curri, then Telegram confirms it's yours. Go Inactive when you don't want offers.</li>
      <li ${LI}><strong style="color:#e7ecef">Everything in Premium is unlocked in your account.</strong> The bidding calculator, the P&amp;L tracker, every guide, and the Curri mastermind — use them from day one.</li>
      ${telegram ? `<li ${LI}><strong style="color:#e7ecef">Join the fleet Telegram group</strong> once you're activated — dispatch updates and the other fleet drivers are there. <a href="${telegram}" style="color:#25e07a">Open the group →</a></li>` : ""}
    </ol>
    <p style="color:#7c8a92;font-size:12px;line-height:1.5;margin:0 0 14px">Refund terms you agreed to at checkout: ${FLEET.refundShort} Two violations on the carrier account means removal from the fleet without a refund.</p>
    <p ${P}>The full walkthrough is in your account:</p>
    <p style="margin:0 0 18px">${button(opts.fleetUrl, "Open the fleet guide")}</p>
    <p style="color:#7c8a92;font-size:12px;line-height:1.5;margin:0 0 14px">FlowSync and Barham Transport LLC are independent and are not owned by, affiliated with, or part of Curri. Fleet drivers are independent contractors. No guarantee of load volume or earnings.</p>
    <p ${P}>— Nas Barham<br><span style="color:#7c8a92">Barham Transport / FlowSync Drivers</span></p>`;
  return send(opts.to, `You're in the fleet, ${opts.firstName} — next steps`, shell("Welcome to the fleet", body), { campaign: "fleet-welcome" });
}

/**
 * Abandoned-checkout recovery. Sent by the webhook when a new buyer's Stripe
 * Checkout expires unpaid. Personal, one link, the real price (and the real
 * increase date while it's pending), the guarantee. No discount, no fake timer.
 */
/**
 * Fleet payouts: asks the driver to finish Stripe's onboarding form from the
 * Payouts page in their account (the Stripe link itself expires in minutes,
 * so the email never carries it). Sent by the admin button; the same page is
 * reachable from the fleet guide without any email.
 */
export async function sendStripeSetupEmail(opts: { to: string; firstName: string; payoutsUrl: string }) {
  const body = `
    <p ${P}>Hey ${opts.firstName} — one more step so we can pay you for the loads you run.</p>
    <p ${P}>Payouts go through <strong style="color:#e7ecef">Stripe</strong>, the same company that handles card payments for most of the internet. You fill in Stripe's short form once — bank account for deposits, your name and address, and a tax ID so Stripe can send your 1099 at year end — and from then on every completed delivery is paid straight to your bank.</p>
    <ol style="padding-left:20px;margin:0 0 14px">
      <li ${LI}>Sign in to your FlowSync account and open <strong style="color:#e7ecef">Payouts</strong> (button below).</li>
      <li ${LI}>Click <strong style="color:#e7ecef">Set up payouts with Stripe</strong> and finish the form. About 5 minutes; have your bank details handy.</li>
      <li ${LI}>That's it. The page shows "Ready" when Stripe has everything.</li>
    </ol>
    <p style="margin:0 0 18px">${button(opts.payoutsUrl, "Set up payouts")}</p>
    <p ${P}>Your bank details go to Stripe, not to us — we never see them. Standard pay is every Friday (${FLEET.dispatchFeePercent}% dispatching fee); faster pay in 1–2 business days is ${FLEET.fastPayoutFeePercent}%.</p>
    <p ${P}>Stuck on anything? Just reply — a real person reads it.</p>
    <p ${P}>— Nas Barham<br><span style="color:#7c8a92">Barham Transport / FlowSync Drivers</span></p>`;
  return send(opts.to, "Set up your fleet payouts (about 5 minutes)", shell("Set up your payouts", body), { campaign: "stripe-setup" });
}

/** Fleet payout receipt: one per paid delivery (lib/payouts.ts). */
export async function sendPayoutReceiptEmail(opts: {
  to: string;
  firstName: string;
  netCents: number;
  loadCents: number;
  feePercent: number;
  feeCents: number;
  deliveredOn: Date;
  note?: string | null;
  payoutsUrl: string;
}) {
  const $ = (c: number) => `$${(c / 100).toFixed(2)}`;
  const when = opts.deliveredOn.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const body = `
    <p ${P}>Hey ${opts.firstName} — we just sent <strong style="color:#25e07a">${$(opts.netCents)}</strong> to your Stripe account for your delivery on ${when}${opts.note ? ` (${escapeHtml(opts.note)})` : ""}.</p>
    <table style="border-collapse:collapse;margin:0 0 14px">
      <tr><td style="color:#aebac1;padding:2px 16px 2px 0">Load</td><td style="color:#e7ecef">${$(opts.loadCents)}</td></tr>
      <tr><td style="color:#aebac1;padding:2px 16px 2px 0">Dispatching fee (${opts.feePercent}%)</td><td style="color:#e7ecef">−${$(opts.feeCents)}</td></tr>
      <tr><td style="color:#aebac1;padding:2px 16px 2px 0"><strong>Paid to you</strong></td><td style="color:#25e07a"><strong>${$(opts.netCents)}</strong></td></tr>
    </table>
    <p ${P}>Stripe deposits it in your bank on its usual schedule, normally within two business days. Your full payout history and tax forms are in your Stripe dashboard — open it from the Payouts page in your account.</p>
    <p style="margin:0 0 18px">${button(opts.payoutsUrl, "See my payouts")}</p>
    <p ${P}>Something off? Just reply — a real person reads it.</p>
    <p ${P}>— Nas Barham<br><span style="color:#7c8a92">Barham Transport / FlowSync Drivers</span></p>`;
  return send(opts.to, `You've been paid ${$(opts.netCents)} — delivery on ${when}`, shell("Payout sent", body), { campaign: "payout-receipt" });
}

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
        : isFleet
          ? `<p ${P}>It's <strong style="color:#e7ecef">$${price} one-time</strong>. ${FLEET.refundShort}</p>`
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
  return send(opts.to, subject, shell(isFleet ? "Pick up where you left off" : "Your listing is one click away", body), { campaign: isFleet ? "recovery-fleet" : "recovery" });
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
  return send(opts.to, `${opts.firstName}, can I get your honest review of FlowSync?`, shell("Your review", body), { campaign: "review-invite" });
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
  return send(opts.to, "Welcome to FlowSync", shell("Welcome aboard", body), { campaign: "welcome" });
}
