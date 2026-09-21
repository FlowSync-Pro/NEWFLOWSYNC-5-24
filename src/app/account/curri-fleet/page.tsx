import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { SUPPORT_EMAIL } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Curri fleet",
  robots: { index: false },
};

const STEPS = [
  {
    title: "Ask to be added",
    body: `Email ${SUPPORT_EMAIL} (or DM Nasser privately — not in the public Telegram group) with the email you used to sign up here. That is how we add you as a driver on the FlowSync / Barham Transport carrier partner account so you can be activated on Curri right away.`,
  },
  {
    title: "We add you on our carrier account",
    body: "Loads are dispatched through our admin carrier account. You do not need your own Curri carrier account to be approved before you can start. If you are already on Curri’s waitlist, you can join our fleet while you wait.",
  },
  {
    title: "Nearby loads in the dispatch relay",
    body: "When a nearby delivery is available, it is sent in the Curri dispatch relay. You choose to claim it, place a bid, or reject it. You are never required to take a load.",
  },
  {
    title: "Complete the delivery",
    body: "If you take the load, run it as usual. After the delivery is complete, pay follows the schedule below.",
  },
  {
    title: "Get paid every Friday",
    body: "Curri pays our fleet account, and we pay you — as an independent contractor, by Stripe transfer. Standard pay runs weekly: completed deliveries are paid out every Friday, with a 15% dispatching fee taken from the load. If you want your money sooner, see the faster-payout option below.",
  },
];

export default async function CurriFleetPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    // Tier is deliberately not read — the fleet is a separate offer, open to
    // any signed-in driver, not a Premium perk.
    select: { firstName: true },
  });
  if (!profile) redirect("/account/setup");

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative mx-auto max-w-3xl px-5 py-10">
        <div className="flex items-center justify-between">
          <Link href="/account" className="text-sm text-muted hover:text-foreground">
            ← Account
          </Link>
        </div>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Barham Transport
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Curri fleet guide</h1>
          <p className="mt-3 text-muted">
            Hi {profile.firstName} — the Curri fleet is a separate opportunity from your
            FlowSync listing. This walkthrough covers how you join our carrier fleet, what it
            costs, and how loads and pay work. Nothing here is required.
          </p>
        </header>

        {/* Costs stated up front. A driver reading "ask to be added" should never
            discover the joining fee or the dispatch cut after the fact. */}
        <section className="card mt-8 p-6">
          <h2 className="text-lg font-bold tracking-tight">What it costs</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
            <li>
              <strong className="font-semibold text-foreground">$97 one-time</strong> joining fee to
              get set up on our carrier account.
            </li>
            <li>
              <strong className="font-semibold text-foreground">15% dispatching fee</strong> on loads
              we get you, taken from the load. Standard pay runs every Friday.
            </li>
            <li>
              Want your money faster?{" "}
              <strong className="font-semibold text-foreground">20% dispatching fee</strong> pays out
              in 1–2 business days instead of waiting for Friday.
            </li>
            <li>
              <strong className="font-semibold text-foreground">No monthly subscription and no
              insurance charges.</strong> We only get paid on work we actually bring you — no loads
              that week means no fee that week.
            </li>
          </ul>
        </section>

        <ol className="mt-10 space-y-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="card p-6">
              <div className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                  {i + 1}
                </span>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">{step.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <section className="card mt-6 p-6">
          {/* Called "faster payout", not "instant" — it lands in 1–2 business days,
              and promising instant would be inaccurate. */}
          <h2 className="text-lg font-bold tracking-tight">Faster payout (optional)</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Don&apos;t want to wait for Friday? We can send your pay by Stripe transfer in{" "}
            <strong className="font-semibold text-foreground">1–2 business days</strong> after a
            completed delivery. That option carries a{" "}
            <strong className="font-semibold text-foreground">20% dispatching fee</strong> instead
            of the standard 15%. Like all payouts, it goes to your Stripe account — see the
            Stripe setup below.
          </p>
          <a
            href="https://stripe.com"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
          >
            Open Stripe’s official site →
          </a>
        </section>

        {/* Stripe is how every payout is delivered and how the 1099 gets issued, so
            a driver needs it before their first real pay cycle. The grace period
            is stated plainly so nobody's first paycheck is held hostage to setup. */}
        <section className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-6">
          <h2 className="text-lg font-bold tracking-tight text-amber-300">Set up a Stripe account (required)</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            We pay you as an independent contractor through Stripe, and you&apos;ll receive a{" "}
            <strong className="font-semibold text-foreground">1099 for your taxes</strong> at the
            end of the year. A free Stripe account is where every payout lands — standard Friday
            pay and faster payouts alike.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">
            <strong className="font-semibold text-foreground">Don&apos;t have one yet? That won&apos;t
            hold up your first loads.</strong> We can send your first two or three payouts another
            way while you get Stripe set up — but please get it done, because after that all pay
            goes through Stripe.
          </p>
          <a
            href="https://stripe.com"
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-4 inline-flex rounded-full px-6 py-2.5 text-sm"
          >
            Create a free Stripe account →
          </a>
        </section>

        <section className="card mt-6 p-6">
          <h2 className="text-lg font-bold tracking-tight">Already on Curri’s waitlist?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            You can still join our fleet while you wait for your own carrier account. After
            your own account is approved, using two accounts for two deliveries at once is
            optional and only if it makes sense for you. No pressure either way.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-accent/30 bg-accent-soft p-6">
          <h2 className="text-lg font-bold tracking-tight text-accent">What to send Nasser</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            Send a private message (email or Telegram DM — not the public group) with:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground/90">
            <li>The email you used to sign up on FlowSync</li>
            <li>Your name and city (so we can add you correctly)</li>
            <li>The email on your Stripe account — or tell us you&apos;re still setting one up</li>
            <li>Whether you want standard pay (every Friday, 15%) or faster pay (1–2 business days, 20%)</li>
          </ul>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Curri%20fleet%20activation`}
            className="btn-primary mt-5 inline-flex rounded-full px-6 py-2.5 text-sm"
          >
            Email {SUPPORT_EMAIL}
          </a>
        </section>
      </div>
    </div>
  );
}
