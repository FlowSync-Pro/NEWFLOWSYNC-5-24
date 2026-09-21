import { Resend } from "resend";
import { SUPPORT_EMAIL } from "./site";
import { TIERS } from "./pricing";

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

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#25e07a;color:#04130a;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:999px;margin-top:8px">${label}</a>`;
}

// Shared text styles for the longer, story-style emails.
const P = `style="color:#aebac1;line-height:1.65;margin:0 0 14px"`;
const H2 = `style="font-size:17px;color:#e7ecef;margin:26px 0 10px"`;
const LI = `style="color:#aebac1;line-height:1.6;margin:0 0 8px"`;

/** Telegram invite link, only when it's configured and really a Telegram URL. */
function telegramInviteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_TELEGRAM_INVITE_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && /(^|\.)t(elegram)?\.me$/.test(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
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
}) {
  const base = new URL(opts.signInUrl).origin;
  const upgradeUrl = opts.upgradeUrl || `${base}/account/edit`;
  const telegram = telegramInviteUrl();
  const premium = TIERS.premium.price;

  const body = `
    <p ${P}>Hi ${opts.firstName} — you're in. Your FlowSync driver listing is active, and you set your own rates on every job.</p>
    <p ${P}>Sign in with this temporary password, and you'll be asked to set a permanent one:</p>
    <div style="background:#11181c;border:1px solid #1d262b;border-radius:12px;padding:14px;margin:14px 0;text-align:center;font-size:18px;font-weight:700;letter-spacing:1px;color:#25e07a">${opts.tempPassword}</div>
    <p style="margin:0 0 6px">${button(opts.signInUrl, "Sign in to FlowSync")}</p>

    <h2 ${H2}>Your first 10 minutes inside</h2>
    <ol style="padding-left:20px;margin:0">
      <li ${LI}><strong style="color:#e7ecef">Set your password</strong> and land on your dashboard.</li>
      <li ${LI}><strong style="color:#e7ecef">Finish your profile</strong> — photo, vehicle, city, and the services you offer. That's what customers see in the directory.</li>
      <li ${LI}><strong style="color:#e7ecef">Open your Driver Roadmap.</strong> It's the 30-day action plan, one box at a time. Do a box a day and you'll be set up properly, with a real shot at your first direct customer.</li>
      <li ${LI}><strong style="color:#e7ecef">Use the tools.</strong> Fair-quote calculator, Profit &amp; Loss tracker, your own service menu, and 14 step-by-step guides (DOT &amp; EIN — both free to apply for — LLC, taxes, finding customers).</li>
      ${telegram ? `<li ${LI}><strong style="color:#e7ecef">Join the driver community</strong> on Telegram — real drivers, real answers, free. <a href="${telegram}" style="color:#25e07a">Open the group →</a></li>` : ""}
    </ol>

    <h2 ${H2}>Want the faster route? Add Premium.</h2>
    <p ${P}>The Roadmap works if you work it. But if you'd rather skip the setup grind, Premium is the shortcut: <strong style="color:#e7ecef">we build your profile, your service menu, and your website for you</strong>, you get the Premium badge, and your listing sits above other drivers in the directory. You can link your own website too.</p>
    <p ${P}>It's <strong style="color:#e7ecef">$${premium} one-time</strong> — no subscription, same 30-day money-back guarantee. One click below, pay on Stripe, and I'll start on your setup.</p>
    <p style="margin:0 0 6px">${button(upgradeUrl, `Add Premium — $${premium} one-time`)}</p>

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
    shell("You're listed", body),
  );
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
}) {
  const body = `
    <p ${P}>Hey ${opts.firstName},</p>
    <p ${P}>You're in as a FlowSync Premium member. Log into your account and you'll see your status marked <strong style="color:#25e07a">Premium</strong>. That unlocks the tools we've built for members so far: mileage tracker, profit &amp; loss tracker, bidding calculator, with more rolling out.</p>
    <p style="margin:0 0 18px">${button(opts.accountUrl, "Log into your account")}</p>
    <p ${P}>Now, before I point you toward the right next step, I want to actually know where you're at instead of guessing. I've already got your vehicle and location from when you signed up — just need a little more so whatever we build for you actually fits.</p>
    <p ${P}><strong style="color:#e7ecef">Three quick things:</strong></p>
    <ol style="padding-left:20px;margin:0 0 14px">
      <li ${LI}>Are you signed up with <strong style="color:#e7ecef">CURRI</strong>? If so, where do you stand right now:
        <div style="color:#aebac1;line-height:1.6;margin-top:4px">a. Haven't started yet<br>b. Signed up and waiting to get activated<br>c. Already active and running deliveries</div>
      </li>
      <li ${LI}>What other delivery apps, if any, are you currently working (DoorDash, Amazon Flex, Uber, Roadie, whatever it is)?</li>
      <li ${LI}>What's the one thing slowing you down or making this harder than it should be right now?</li>
    </ol>
    <p ${P}><strong style="color:#e7ecef">Reply to this email with those three</strong> and I'll come back with a plan built specifically around where you actually are.</p>
    <p ${P}>— Nas Barham<br><span style="color:#7c8a92">Barham Transport / FlowSync Drivers</span></p>`;
  return send(opts.to, "You're in — FlowSync Premium (3 quick questions)", shell("Welcome to Premium", body));
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
