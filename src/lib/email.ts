import { Resend } from "resend";

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
    await resend.emails.send({ from: from(), to, subject, html });
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

export async function sendDriverWelcomeEmail(opts: {
  to: string;
  firstName: string;
  tempPassword: string;
  signInUrl: string;
}) {
  const body = `
    <p style="color:#aebac1;line-height:1.6">Hi ${opts.firstName}, your FlowSync driver listing is active — you set your own rates on every job.</p>
    <p style="color:#aebac1;line-height:1.6">Sign in with your temporary password and set a permanent one:</p>
    <div style="background:#11181c;border:1px solid #1d262b;border-radius:12px;padding:14px;margin:14px 0;text-align:center;font-size:18px;font-weight:700;letter-spacing:1px;color:#25e07a">${opts.tempPassword}</div>
    <p style="margin-top:8px">${button(opts.signInUrl, "Sign in to FlowSync")}</p>`;
  return send(opts.to, "Welcome to FlowSync — your sign-in details", shell("You're listed", body));
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

export async function sendPremiumUpgradeEmail(opts: {
  to: string;
  firstName: string;
  servicesUrl: string;
}) {
  const body = `
    <p style="color:#aebac1;line-height:1.6">Hi ${opts.firstName} — you've been upgraded to <strong style="color:#25e07a">FlowSync Premium</strong>.</p>
    <p style="color:#aebac1;line-height:1.6">Your account now includes the <strong style="color:#e7ecef">premium badge</strong>, elevated profile styling, priority placement in the directory, and your own external website link.</p>
    <p style="margin-top:8px">${button(opts.servicesUrl, "Build your service menu")}</p>`;
  return send(opts.to, "You've been upgraded to FlowSync Premium", shell("Welcome to Premium", body));
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
