import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { openDisputeEvidence } from "@/app/actions/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dispute evidence — Admin", robots: { index: false } };

// Owner-only. Find a buyer by the email on the Stripe dispute; the lookup runs in
// a server action so the email never goes into a URL.
export default async function AdminDisputeLookupPage({ searchParams }: PageProps<"/admin/dispute">) {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await getAdminUserId())) redirect("/account");
  const notFound = (await searchParams).notfound === "1";

  return (
    <div className="relative mx-auto max-w-2xl px-5 py-10">
      <Link href="/admin" className="text-sm text-muted hover:text-foreground">← Admin</Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Dispute evidence</h1>
      <p className="mt-1 text-muted">
        Got a dispute in Stripe? Enter the customer&apos;s email from the dispute and you&apos;ll get every date and fact
        the site records about them, ready to copy.
      </p>
      <form action={openDisputeEvidence} className="card mt-6 flex flex-wrap items-center gap-3 p-5">
        <input
          name="email"
          type="email"
          required
          placeholder="customer@email.com"
          className="min-w-0 flex-1 rounded-full border border-border bg-surface-2 px-4 py-2.5 text-sm"
        />
        <button type="submit" className="btn-primary rounded-full px-5 py-2.5 text-sm">Find buyer</button>
      </form>
      {notFound && (
        <p className="mt-3 text-sm text-red-400">
          No account with that email. If they paid but have no account, check Recovery → &quot;Paid, can&apos;t get in&quot;.
        </p>
      )}
    </div>
  );
}
