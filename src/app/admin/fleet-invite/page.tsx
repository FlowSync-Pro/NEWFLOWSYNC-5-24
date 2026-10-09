import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { marketingEnabled, MARKETING_GAP_HOURS } from "@/lib/marketing";
import { FLEET_INVITE_BATCH, fleetInviteAudience, fleetInviteEmail, fleetInviteSentCount } from "@/lib/fleet-invite-email";
import AdminFleetInviteSend from "@/components/AdminFleetInviteSend";

export const dynamic = "force-dynamic";
// A batch of 40 sends takes ~25–30s; give the server action room.
export const maxDuration = 60;
export const metadata: Metadata = { title: "Fleet invite email — Admin", robots: { index: false } };

// Owner-only. Sends the one-time Curri fleet invite to paid drivers who aren't
// in the fleet, FLEET_INVITE_BATCH at a time. See src/lib/fleet-invite-email.ts.
export default async function AdminFleetInvitePage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await getAdminUserId())) redirect("/account");

  const [audience, sent] = await Promise.all([fleetInviteAudience(), fleetInviteSentCount()]);
  const preview = fleetInviteEmail("Marcus");

  return (
    <div className="relative mx-auto max-w-3xl px-5 py-10">
      <Link href="/admin" className="text-sm text-muted hover:text-foreground">← Admin</Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Fleet invite email</h1>
      <p className="mt-1 text-muted">
        One email inviting every paid driver who isn&apos;t in the Curri fleet to join it. Each driver gets it once.
        Unsubscribed, refunded and admin accounts, fleet members and bike / scooter drivers are skipped automatically.
        Anyone who got another marketing email in the last {MARKETING_GAP_HOURS} hours waits until that gap has passed.
      </p>
      <p className="mt-2 text-sm text-muted">{`Sent so far: ${sent}.`}</p>

      <div className="mt-6">
        {marketingEnabled() ? (
          <AdminFleetInviteSend waiting={audience.length} batch={FLEET_INVITE_BATCH} />
        ) : (
          <div className="card p-6 text-sm text-red-400">Marketing email is switched off (no postal address set), so nothing can be sent.</div>
        )}
      </div>

      <section className="card mt-8 p-6">
        <h2 className="text-lg font-semibold">What they&apos;ll get</h2>
        <p className="mt-1 text-sm text-muted">{`Subject: ${preview.subject}`}</p>
        <div className="mt-4 rounded-xl border border-border bg-[#0e1316] p-5 text-sm" dangerouslySetInnerHTML={{ __html: preview.body }} />
        <p className="mt-3 text-xs text-muted">The unsubscribe link and the Barham Transport postal address are added under this automatically.</p>
      </section>
    </div>
  );
}
