import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { marketingEnabled } from "@/lib/marketing";
import { ADD_CITY_BATCH, addCityAudience, addCityEmail } from "@/lib/add-city-email";
import AdminAddCitySend from "@/components/AdminAddCitySend";

export const dynamic = "force-dynamic";
// A batch of 50 sends takes ~15–20s; give the server action room.
export const maxDuration = 60;
export const metadata: Metadata = { title: "Add-your-city email — Admin", robots: { index: false } };

// Owner-only. Sends the one-time "Add your city" email to listed drivers who
// have no city on file, ADD_CITY_BATCH at a time. See src/lib/add-city-email.ts.
export default async function AdminAddCityPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await getAdminUserId())) redirect("/account");

  const audience = await addCityAudience();
  const preview = addCityEmail("Marcus");

  return (
    <div className="relative mx-auto max-w-3xl px-5 py-10">
      <Link href="/admin" className="text-sm text-muted hover:text-foreground">← Admin</Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Add-your-city email</h1>
      <p className="mt-1 text-muted">
        One email to every listed driver with no city on their profile, so they show up on their city&apos;s page.
        Each driver gets it once. Unsubscribed, refunded and admin accounts are skipped automatically.
      </p>

      <div className="mt-6">
        {marketingEnabled() ? (
          <AdminAddCitySend waiting={audience.length} batch={ADD_CITY_BATCH} />
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
