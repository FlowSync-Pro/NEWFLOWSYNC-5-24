import { prisma } from "@/lib/db";
import { sendMarketing } from "@/lib/marketing";
import { isAdminEmail } from "@/lib/admin";
import { SITE_URL } from "@/lib/site";

// One-time "Add your city" email (owner-approved copy, 2026-10-03), sent from
// /admin/add-city in batches. Goes through sendMarketing(), so the usual rules
// apply: skips unsubscribed, refunded and admin accounts, once per driver
// (EmailLog kind below), 48h gap from other marketing email, unsubscribe link
// and postal footer added for you. scripts/send-add-city.mjs is the same email
// for the command line; the admin page exists because the production
// AUTH_SECRET (which signs unsubscribe links) only lives on Vercel.

export const ADD_CITY_KIND = "add-city-2026-10";
/** Per click: 40 × (SEND_GAP_MS + a DB round trip) stays inside the page's 60s maxDuration. */
export const ADD_CITY_BATCH = 40;
/** Resend allows 2 requests/second; a burst of sends gets every one after the first refused. */
const SEND_GAP_MS = 600;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const P = `style="color:#aebac1;line-height:1.65;margin:0 0 14px"`;
const LI = `style="color:#aebac1;line-height:1.6;margin:0 0 8px"`;
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function addCityEmail(firstName: string): { subject: string; heading: string; body: string } {
  const url = `${SITE_URL}/account/edit`;
  return {
    subject: "Add your city so customers can find you",
    heading: "Add your city so customers can find you",
    body: `
    <p ${P}>Hi ${esc(firstName || "there")},</p>
    <p ${P}>Quick one. FlowSync now has a page for every city with drivers on it — the pages customers find when they search things like "courier in Bakersfield". Your profile isn't on yours yet, because there's no city on it.</p>
    <p ${P}>It takes about 20 seconds:</p>
    <ol style="padding-left:20px;margin:0 0 14px">
      <li ${LI}>Sign in and open <strong>Edit profile</strong></li>
      <li ${LI}>Type your city and state in the new <strong>City</strong> box (for example: Bakersfield, CA)</li>
      <li ${LI}>Hit <strong>Save</strong></li>
    </ol>
    <p style="margin:0 0 6px"><a href="${url}" style="display:inline-block;background:#25e07a;color:#04130a;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:999px;margin-top:8px">Add my city →</a></p>
    <p ${P}>That's it. Your profile shows up on your city's page right away, and customers searching your area can book you directly.</p>
    <p ${P}>If you cover more than one city, put the one you want to be found in first. Reply to this email if anything's unclear — I read every one.</p>
    <p ${P}>Nasser<br>FlowSync Drivers</p>`,
  };
}

export interface AddCityRecipient {
  userId: string;
  firstName: string;
}

/** Listed drivers with no city who haven't had this email yet (sendMarketing re-checks the rest). */
export async function addCityAudience(): Promise<AddCityRecipient[]> {
  const users = await prisma.user.findMany({
    where: {
      role: "DRIVER",
      marketingOptOutAt: null,
      driverProfile: { is: { verified: true, primaryService: { not: null }, OR: [{ city: null }, { city: "" }] } },
      emailLogs: { none: { kind: ADD_CITY_KIND, cancelledAt: null } },
    },
    select: { id: true, email: true, driverProfile: { select: { firstName: true, city: true } } },
    orderBy: { createdAt: "asc" },
  });
  return users
    .filter((u) => u.driverProfile && !(u.driverProfile.city ?? "").trim() && !isAdminEmail(u.email))
    .map((u) => ({ userId: u.id, firstName: u.driverProfile!.firstName }));
}

export interface AddCityBatchResult {
  sent: number;
  skipped: number;
  /** Why sendMarketing held some back, e.g. { "another marketing email within 48h": 3 }. */
  reasons: Record<string, number>;
  /** Still waiting after this batch (skipped ones included — they're retried next click). */
  remaining: number;
}

export async function sendAddCityBatch(limit = ADD_CITY_BATCH): Promise<AddCityBatchResult> {
  const audience = await addCityAudience();
  const batch = audience.slice(0, limit);
  const result: AddCityBatchResult = { sent: 0, skipped: 0, reasons: {}, remaining: 0 };
  for (const [i, r] of batch.entries()) {
    if (i > 0) await sleep(SEND_GAP_MS);
    try {
      const res = await sendMarketing({ userId: r.userId, kind: ADD_CITY_KIND, ...addCityEmail(r.firstName) });
      if (res.sent) result.sent++;
      else {
        result.skipped++;
        const why = res.reason ?? "not sent";
        result.reasons[why] = (result.reasons[why] ?? 0) + 1;
      }
    } catch (e) {
      // One driver's bad data must not stop the batch.
      console.error(`[add-city] failed for ${r.userId}:`, e);
      result.skipped++;
      result.reasons.error = (result.reasons.error ?? 0) + 1;
    }
  }
  result.remaining = (await addCityAudience()).length;
  return result;
}
