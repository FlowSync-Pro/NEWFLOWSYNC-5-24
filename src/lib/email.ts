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
    <p style="color:#aebac1;line-height:1.6">Hi ${opts.firstName}, your FlowSync driver listing is active — you keep 95% of every job.</p>
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
    <p style="color:#aebac1;line-height:1.6">Hi ${opts.driverFirstName}, ${opts.customerName} just paid ${money(opts.amountCents)}. You keep 95% — go make it happen!</p>`;
  return send(opts.to, `You got booked — ${money(opts.amountCents)}`, shell("Payment received", body));
}

export async function sendWelcomeEmail(opts: { to: string; firstName: string; profileUrl: string }) {
  const body = `
    <p style="color:#aebac1;line-height:1.6">Hi ${opts.firstName}, welcome to FlowSync. Your account is ready — finish your profile and upload your documents to get verified.</p>
    <p style="margin-top:8px">${button(opts.profileUrl, "Complete your profile")}</p>`;
  return send(opts.to, "Welcome to FlowSync", shell("Welcome aboard", body));
}
