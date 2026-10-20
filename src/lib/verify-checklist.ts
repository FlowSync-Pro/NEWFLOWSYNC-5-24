import { prisma } from "./db";
import { FLEET, REFUND_WINDOW_DAYS, TIERS } from "./pricing";
import { FLEET_INVITE_KIND } from "./fleet-invite-email";

// The "verify after deploy" checklist (/admin/verify). Each merged change that
// still needs the owner to click through it on the live site, from ROADMAP.md's
// "Pending" sections, plus the owner-only settings. Read-only: the page never
// writes anything; ticks live in the owner's browser only.
//
// To add an item: give it a NEW id (ids are the tick keys — reusing one would
// show it as already done). Remove an item once ROADMAP.md marks it verified.

export type Risk = "risky" | "safe" | "owner";

export interface VerifyStep {
  text: string;
  /** A page on this site to open for this step. */
  href?: string;
}

export interface VerifyItem {
  id: string;
  title: string;
  /** When it was merged / asked for, as written in ROADMAP.md. */
  since: string;
  risk: Risk;
  why: string;
  steps: VerifyStep[];
}

export const VERIFY_ITEMS: VerifyItem[] = [
  {
    id: "refund-7day-2026-10-10",
    title: `${REFUND_WINDOW_DAYS}-day refund window (listing + Premium)`,
    since: "Oct 10",
    risk: "risky",
    why: "The refund pages were checked live on Oct 15; what's left is the checkout box and the receipt line.",
    steps: [
      { text: `Start a $${TIERS.standard.price} checkout: Stripe shows the "I agree that refunds…" checkbox. Then close it without paying.`, href: "/pricing" },
      { text: "The next real purchase's welcome email ends with the refund line." },
    ],
  },
  {
    id: "vehicles-2026-10-09",
    title: "Directory vehicle filter, accessories, extra vehicles",
    since: "Oct 9",
    risk: "risky",
    why: "Came with a database change (additive: one new column, one new table). The automatic check above confirms it was applied.",
    steps: [
      { text: "A Cargo van driver sees the accessories checklist on Edit profile, ticks two, saves.", href: "/account/edit" },
      { text: "Those two accessories show as chips on that driver's public page." },
      { text: "Add a 2nd vehicle with a VIN and save. View the public page's source: the VIN is NOT in it." },
      { text: "Find a driver → Cargo van: the \"With\" row appears and the driver stays listed.", href: "/find-a-driver" },
      { text: "Pick an accessory they didn't tick → they drop out. \"All vehicles\" brings everyone back." },
      { text: "Spot-check one long-time driver: profile, trip log and P&L still all there.", href: "/admin" },
    ],
  },
  {
    id: "fleet-guarantee-2026-10-09",
    title: `Fleet "make it back" guarantee (${FLEET.guaranteeDays} days)`,
    since: "Oct 9",
    risk: "risky",
    why: "The refund policy and terms pages were checked live on Oct 15; what's left is the checkout box and the recovery texts.",
    steps: [
      { text: "Start a fleet checkout: the terms checkbox shows the new sentence. Close it without paying.", href: "/curri-fleet" },
      { text: "Recovery page fleet rows show the new text with line breaks.", href: "/admin/recovery" },
    ],
  },
  {
    id: "taken-notice-2026-10-15",
    title: "Dispatch: \"⌛ Taken\" line to the other drivers",
    since: "Oct 15",
    risk: "safe",
    why: "When one driver gets a load, the others with an open offer are told right away.",
    steps: [
      { text: "Offer a test load to two Telegram accounts (yours + a test driver).", href: "/admin/dispatch" },
      { text: "Accept on one: the other gets \"⌛ Taken — this load went to another driver.\" Then cancel the test load." },
    ],
  },
  {
    id: "trip-download-2026-10-15",
    title: "Drivers: \"Download my trips\" spreadsheet",
    since: "Oct 15",
    risk: "safe",
    why: "Read-only: a driver downloads their own trip log for taxes.",
    steps: [
      { text: "Signed in as a Premium driver with trips (or yourself): the \"Download my trips\" card shows under the totals.", href: "/account/trips" },
      { text: "Pick this year, Download: the file opens in Excel / Google Sheets with one row per trip and a TOTAL row matching the page." },
      { text: "A NON-Premium driver who has saved trips sees the same card above the \"Part of Premium\" box on /account/trips and can download (owner decision Oct 15)." },
    ],
  },
  {
    id: "stop-line-texts-2026-10-17",
    title: "Recovery texts: STOP line + \"not part of Curri\"",
    since: "Oct 17",
    risk: "safe",
    why: "Every sales text ends with \"Reply STOP to opt out.\"; fleet texts say you're independent of Curri; \"You can't lose.\" is gone.",
    steps: [
      { text: "Open any abandoned or paid-driver row: the text ends with \"Reply STOP to opt out.\" (fleet rows also \"I'm independent, not part of Curri.\").", href: "/admin/recovery" },
      { text: "Open a fleet row's follow-up: no \"You can't lose.\", ends with the STOP line." },
    ],
  },
  {
    id: "fleet-reply-email-2026-10-16",
    title: "Recovery: fleet reply email template",
    since: "Oct 16",
    risk: "safe",
    why: "The long \"how it works + guarantee + step by step\" reply for people who answer your abandoned fleet checkout email.",
    steps: [
      { text: "Abandoned checkouts tab: open a fleet row → \"Reply email\": their first name, the right price ($297 or $197) and link are filled in.", href: "/admin/recovery" },
      { text: "Copy it, paste into a reply to yourself, and check it reads right in your email app." },
    ],
  },
  {
    id: "recovery-send-all-2026-10-10",
    title: "Recovery page: Send all + \"Emailed\" + \"Asked to stop\"",
    since: "Oct 10",
    risk: "safe",
    why: "Makes sure nobody gets the fleet invite twice and opt-outs stick.",
    steps: [
      { text: "\"Paid drivers, not in the fleet\" tab: rows already emailed show \"Emailed <date>\" instead of the Email button.", href: "/admin/recovery" },
      { text: "Mark one driver who asked you to stop: their send buttons disappear on every tab." },
    ],
  },
  {
    id: "fleet-invite-first-batch-2026-10-09",
    title: "Fleet invite email: first batch",
    since: "Oct 9",
    risk: "safe",
    why: "Live, but the first batch hasn't been checked. The count above shows how many have gone out.",
    steps: [
      { text: "Read the preview, send ONE batch.", href: "/admin/fleet-invite" },
      { text: "Check one arrived (the support inbox or a test driver), then send the rest." },
    ],
  },
  {
    id: "dispute-evidence-2026-10-10",
    title: "Copy dispute evidence page",
    since: "Oct 10",
    risk: "safe",
    why: "Read-only; check it before you need it for a real dispute.",
    steps: [
      { text: "Look up a paying driver by email: the evidence text shows their payments and refund window.", href: "/admin/dispute" },
    ],
  },
  {
    id: "no-taker-2026-10-08",
    title: "Dispatch: \"NO TAKER — don't claim\" ping",
    since: "Oct 8",
    risk: "safe",
    why: "Tells you when nobody accepted a load.",
    steps: [
      { text: "Offer a test load to yourself and don't tap Accept.", href: "/admin/dispatch" },
      { text: "After 3 minutes, tap anything on the FlowSync bot (or wait a minute once the portal bot ticks): \"⌛ NO TAKER\" arrives." },
      { text: "Cancel the test load with the reason \"verify test\"." },
      { text: "First real portal load end to end: card + \"Offered to N…\" + Accept / Pass." },
    ],
  },
  {
    id: "owner-vercel-sensitive",
    title: "Vercel: mark secrets Sensitive + Neon check",
    since: "Oct 9",
    risk: "owner",
    why: "Clears the \"Needs Attention\" tags and confirms the database password Vercel holds is current.",
    steps: [
      { text: "Re-add DISPATCH_INTAKE_KEY (same value) and BLOB_READ_WRITE_TOKEN as Sensitive, then redeploy." },
      { text: "After the redeploy, the automatic checks above all show OK (database too)." },
      { text: "Stripe → Developers → API keys: only the current secret key is active." },
    ],
  },
  {
    id: "owner-portal-bot-tick",
    title: "Portal bot: once-a-minute tick (Cursor)",
    since: "Oct 8",
    risk: "owner",
    why: "Makes the NO TAKER ping arrive on time in quiet stretches.",
    steps: [{ text: "Give Cursor docs/CURSOR-TASK-PORTAL-BOT-3.md; Fly logs show no errors from the tick." }],
  },
  {
    id: "owner-attorney-review",
    title: "Attorney review",
    since: "ongoing",
    risk: "owner",
    why: "The owner isn't a lawyer and neither is the code.",
    steps: [{ text: `The ${REFUND_WINDOW_DAYS}-day refund window, the fleet guarantee and refund clause, contractor terms, earnings claims.` }],
  },
];

// ---- Automatic checks (read-only) -----------------------------------------

export interface AutoCheck {
  label: string;
  ok: boolean;
  detail: string;
}

/** The newest migration in the repo — the vehicle change. Update when a new one ships. */
export const LATEST_MIGRATION = "20261009200000_vehicle_accessories";

const present = (k: string) => !!process.env[k]?.trim();

/** Presence only — never reads or shows a secret's value. */
export async function runAutoChecks(): Promise<AutoCheck[]> {
  const out: AutoCheck[] = [];
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
    out.push({ label: "Database reachable", ok: true, detail: "OK" });
  } catch {
    out.push({ label: "Database reachable", ok: false, detail: "Can't reach the database — redeploy, then check the Neon connection strings in Vercel." });
  }
  if (dbOk) {
    try {
      const rows = await prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n FROM "_prisma_migrations" WHERE migration_name = ${LATEST_MIGRATION} AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
      const ok = Number(rows[0]?.n ?? 0) > 0;
      out.push({ label: "Latest database change applied", ok, detail: ok ? LATEST_MIGRATION : `${LATEST_MIGRATION} not applied — the deploy's "prisma migrate deploy" didn't finish. Don't retry by hand; ask first.` });
    } catch {
      out.push({ label: "Latest database change applied", ok: false, detail: "Couldn't read the migration history." });
    }
    try {
      const sent = await prisma.emailLog.count({ where: { kind: FLEET_INVITE_KIND, cancelledAt: null } });
      out.push({ label: "Fleet invite emails sent", ok: true, detail: String(sent) });
    } catch {
      /* informational only */
    }
  }
  const env: [string, string[]][] = [
    ["Stripe keys", ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]],
    ["Email (Resend)", ["RESEND_API_KEY", "RESEND_FROM_EMAIL"]],
    ["File storage (Blob)", ["BLOB_READ_WRITE_TOKEN"]],
    ["Dispatch intake key", ["DISPATCH_INTAKE_KEY"]],
    ["Daily cron secret", ["CRON_SECRET"]],
  ];
  for (const [label, keys] of env) {
    const missing = keys.filter((k) => !present(k));
    out.push({ label, ok: missing.length === 0, detail: missing.length ? `missing: ${missing.join(", ")}` : "set" });
  }
  return out;
}
