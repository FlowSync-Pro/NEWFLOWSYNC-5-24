import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { runAutoChecks, VERIFY_ITEMS } from "@/lib/verify-checklist";
import AdminVerifyChecklist from "@/components/AdminVerifyChecklist";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify after deploy — Admin", robots: { index: false } };

// Owner-only. What still needs a click-through on the live site after recent
// merges (src/lib/verify-checklist.ts). Read-only: the automatic checks only
// read, and the ticks are remembered in this browser, never on the server.
export default async function AdminVerifyPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await getAdminUserId())) redirect("/account");

  const checks = await runAutoChecks();
  const failing = checks.filter((c) => !c.ok).length;

  return (
    <div className="relative mx-auto max-w-3xl px-5 py-10">
      <Link href="/admin" className="text-sm text-muted hover:text-foreground">← Admin</Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Verify after deploy</h1>
      <p className="mt-1 text-muted">
        Everything merged recently that still needs a quick check on the live site, plus the settings only you can change.
        Tick each step as you check it. Risky items first: they touch money, refunds or the database.
      </p>

      <section className="card mt-6 p-6">
        <h2 className="text-lg font-semibold">Automatic checks</h2>
        <p className="mt-1 text-sm text-muted">
          {failing ? `${failing} need attention.` : "All OK."} These only check that settings exist; they never show a secret.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-3">
              <span className={c.ok ? "text-accent" : "text-red-400"} aria-hidden>{c.ok ? "✓" : "✗"}</span>
              <span>
                <span className="font-medium">{c.label}</span>
                <span className="text-muted">{` · ${c.detail}`}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8">
        <AdminVerifyChecklist items={VERIFY_ITEMS} />
      </div>
    </div>
  );
}
