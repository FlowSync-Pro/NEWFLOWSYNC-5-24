import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { disputeEvidence } from "@/lib/dispute-evidence";
import CopyTextButton from "@/components/CopyTextButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dispute evidence — Admin", robots: { index: false } };

// Owner-only, read-only. One buyer's purchase, refund terms and usage dates as
// plain text for a Stripe dispute response. See src/lib/dispute-evidence.ts.
export default async function AdminDisputeEvidencePage({ params }: PageProps<"/admin/dispute/[userId]">) {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await getAdminUserId())) redirect("/account");

  const { userId } = await params;
  const ev = await disputeEvidence(userId);
  if (!ev) notFound();

  return (
    <div className="relative mx-auto max-w-4xl px-5 py-10">
      <Link href="/admin/dispute" className="text-sm text-muted hover:text-foreground">← Look up another buyer</Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Dispute evidence</h1>
      <p className="mt-1 text-muted">{`${ev.name} · ${ev.email}`}</p>
      <p className="mt-2 text-sm text-muted">
        Everything the site and Stripe record about this buyer, in one block. Copy it, then use the lines that apply
        when you fill in the template in <code>docs/STRIPE-DISPUTE-RESPONSE.md</code>. If the PAYMENTS section says
        they&apos;re still inside their refund window, concede instead of fighting.
      </p>
      <div className="mt-5">
        <CopyTextButton value={ev.text} label="Copy dispute evidence" />
      </div>
      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl border border-border bg-surface-2 p-4 text-xs leading-relaxed text-muted">{ev.text}</pre>
    </div>
  );
}
