import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { SUPPORT_EMAIL } from "@/lib/site";
import { FLEET } from "@/lib/pricing";
import { connectStatus, syncConnectStatus } from "@/lib/stripe-connect";
import { stripeConfigured } from "@/lib/stripe";
import { openStripeDashboard, startPayoutsOnboarding } from "@/app/actions/payouts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payouts",
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  stripe: "We couldn't open Stripe's setup form just now. Try again in a minute, or email us and we'll sort it out.",
  dashboard: "We couldn't open your Stripe dashboard just now. Try again in a minute.",
};

export default async function PayoutsPage({ searchParams }: PageProps<"/account/payouts">) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      fleetJoinedAt: true,
      stripeConnectAccountId: true,
      stripeConnectPayoutsEnabled: true,
      payPlan: true,
      driverProfile: { select: { firstName: true } },
      payouts: { where: { status: { in: ["PENDING", "PAID"] } }, orderBy: { deliveredOn: "desc" }, take: 100 },
    },
  });
  if (!user?.fleetJoinedAt) redirect("/account/curri-fleet");
  const $ = (c: number) => `$${(c / 100).toFixed(2)}`;
  const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const paidTotal = user.payouts.filter((p) => p.status === "PAID").reduce((s, p) => s + p.netCents, 0);

  // Mirror Stripe's view on every visit (one API call), so coming back from
  // Stripe's form shows the real state without a webhook.
  const synced = user.stripeConnectAccountId ? await syncConnectStatus(session.userId) : null;
  const status = synced?.status ?? connectStatus(user);
  const returned = sp.return === "1";
  const refreshed = sp.refresh === "1";
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  const configured = stripeConfigured();

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative mx-auto max-w-3xl px-5 py-10">
        <Link href="/account/curri-fleet" className="text-sm text-muted hover:text-foreground">← Curri fleet</Link>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Barham Transport</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Payouts</h1>
          <p className="mt-3 text-muted">
            Hi {user.driverProfile?.firstName ?? "there"} — every load you complete is paid to your bank through Stripe. Set it up once here; after that there&apos;s nothing to do.
          </p>
        </header>

        {error && <p className="mt-6 rounded-xl border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-300">{error}</p>}

        <section className="mt-8 rounded-2xl border border-accent/30 bg-accent-soft p-6">
          {status === "ready" ? (
            <>
              <h2 className="text-lg font-bold tracking-tight text-accent">Payouts are set up</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                Stripe has everything it needs. Completed deliveries are paid to the bank account you gave Stripe — standard pay every Friday ({FLEET.dispatchFeePercent}% dispatching fee) or faster pay in 1–2 business days ({FLEET.fastPayoutFeePercent}%). Your balance, payout history and tax forms live in your Stripe dashboard.
              </p>
              <form action={openStripeDashboard} className="mt-5">
                <button type="submit" className="btn-primary inline-flex rounded-full px-6 py-2.5 text-sm">Manage in Stripe</button>
              </form>
            </>
          ) : status === "in-progress" ? (
            <>
              <h2 className="text-lg font-bold tracking-tight text-accent">
                {returned ? "Thanks — Stripe is checking your details" : "Almost there — Stripe still needs a few details"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                {returned
                  ? "Stripe usually finishes its checks within a few minutes, sometimes a day or two for identity documents. Reload this page to see when payouts are enabled. If Stripe needs anything else, the button below takes you back to exactly that step."
                  : refreshed
                    ? "That setup link had expired (they only last a few minutes). Click below for a fresh one — Stripe remembers what you've already entered."
                    : "You started Stripe's form but it isn't finished yet. Pick up where you left off — Stripe keeps what you've already entered."}
              </p>
              <form action={startPayoutsOnboarding} className="mt-5">
                <button type="submit" className="btn-primary inline-flex rounded-full px-6 py-2.5 text-sm">Continue setup</button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold tracking-tight text-accent">Set up payouts (about 5 minutes)</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                Stripe&apos;s form asks for your bank account, your name and address, and a tax ID so Stripe can send your 1099 at year end. Your bank details go to Stripe, not to us — we never see them. Have your bank account and routing numbers handy.
              </p>
              {configured ? (
                <form action={startPayoutsOnboarding} className="mt-5">
                  <button type="submit" className="btn-primary inline-flex rounded-full px-6 py-2.5 text-sm">Set up payouts with Stripe</button>
                </form>
              ) : (
                <p className="mt-4 text-sm text-muted">Payout setup isn&apos;t available right now. Email {SUPPORT_EMAIL} and we&apos;ll set you up by hand.</p>
              )}
            </>
          )}
        </section>

        {user.payouts.length > 0 && (
          <section className="card mt-6 p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-bold tracking-tight">Your payouts</h2>
              <p className="text-sm text-muted">Paid so far: <strong className="text-accent">{$(paidTotal)}</strong></p>
            </div>
            <p className="mt-1 text-xs text-muted">
              Your plan: {user.payPlan === "FASTER" ? `faster pay (1–2 business days, ${FLEET.fastPayoutFeePercent}%)` : `standard pay (every Friday, ${FLEET.dispatchFeePercent}%)`}.
            </p>
            <ul className="mt-3 divide-y divide-border text-sm">
              {user.payouts.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${p.status === "PAID" ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"}`}>
                      {p.status === "PAID" ? "Paid" : "Pending"}
                    </span>
                    <span className="text-muted">Delivery {day(p.deliveredOn)}{p.note ? ` · ${p.note}` : ""}</span>
                    {p.paidAt && <span className="ml-2 text-xs text-muted">sent {day(p.paidAt)}</span>}
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{$(p.netCents)}</span>
                    <span className="ml-2 text-xs text-muted">load {$(p.loadCents)} − {p.feePercent}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card mt-6 p-6">
          <h2 className="text-lg font-bold tracking-tight">How you get paid</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-foreground/90">
            <li>Curri pays our carrier account for the loads you run.</li>
            <li>We transfer your share to your Stripe account: the load minus the {FLEET.dispatchFeePercent}% dispatching fee (or {FLEET.fastPayoutFeePercent}% for faster pay).</li>
            <li>Stripe deposits it in your bank. You&apos;re an independent contractor; Stripe sends your 1099 at year end.</li>
          </ol>
          <p className="mt-4 text-xs text-muted">
            No monthly fee and no charge to you for Stripe. Questions? Email {SUPPORT_EMAIL} or reply to any of our emails.
          </p>
        </section>
      </div>
    </div>
  );
}
