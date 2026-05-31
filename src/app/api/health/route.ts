import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Health check for UptimeRobot (or any external monitor). Returns 200 only
// when every service the funnel depends on is configured AND reachable.
// Use this URL in UptimeRobot — when it fails, you'll know before a customer does.
//
// Deliberately NOT cached: must run live every check.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CheckResult = { ok: boolean; detail?: string };

async function check(name: string, fn: () => Promise<CheckResult>): Promise<{ name: string } & CheckResult> {
  try {
    const r = await fn();
    return { name, ...r };
  } catch (e) {
    return { name, ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  const envPresent = (k: string) => !!process.env[k];

  const checks = await Promise.all([
    // Database reachable? Cheap query that doesn't depend on schema state.
    check("database", async () => {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true };
    }),
    // Critical env vars present (just presence — we don't validate the values).
    check("auth_secret", async () => ({
      ok: envPresent("AUTH_SECRET"),
      detail: envPresent("AUTH_SECRET") ? undefined : "AUTH_SECRET missing",
    })),
    check("stripe_keys", async () => {
      const hasSecret = envPresent("STRIPE_SECRET_KEY");
      const hasWebhook = envPresent("STRIPE_WEBHOOK_SECRET");
      if (hasSecret && hasWebhook) return { ok: true };
      return {
        ok: false,
        detail: `missing: ${[!hasSecret && "STRIPE_SECRET_KEY", !hasWebhook && "STRIPE_WEBHOOK_SECRET"].filter(Boolean).join(", ")}`,
      };
    }),
    check("resend", async () => ({
      ok: envPresent("RESEND_API_KEY") && envPresent("RESEND_FROM_EMAIL"),
      detail:
        envPresent("RESEND_API_KEY") && envPresent("RESEND_FROM_EMAIL")
          ? undefined
          : "RESEND_API_KEY and/or RESEND_FROM_EMAIL missing",
    })),
    check("blob_storage", async () => ({
      ok: envPresent("BLOB_READ_WRITE_TOKEN"),
      detail: envPresent("BLOB_READ_WRITE_TOKEN") ? undefined : "BLOB_READ_WRITE_TOKEN missing (uploads fall back to data URLs)",
    })),
  ]);

  const allOk = checks.every((c) => c.ok);
  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: allOk ? 200 : 503,
      // Don't let any CDN cache this.
      headers: { "cache-control": "no-store, max-age=0" },
    },
  );
}
