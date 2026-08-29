import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isPremiumTier } from "@/lib/pricing";
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
    body: "If you take the load, run it as usual. After the delivery is complete, pay follows the options below.",
  },
  {
    title: "Get paid",
    body: "Standard pay is 1–2 business days after delivery completion. That is the cycle Curri uses to pay the carrier, and drivers are paid on that same cycle.",
  },
];

export default async function CurriFleetPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const profile = await prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    select: { firstName: true, tier: true },
  });
  if (!profile) redirect("/account/setup");
  if (!isPremiumTier(profile.tier)) redirect("/account");

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
            Premium · Barham Transport
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Curri fleet guide</h1>
          <p className="mt-3 text-muted">
            Hi {profile.firstName} — thank you for being on Premium. This walkthrough is how
            you join our carrier fleet and how loads and pay work. Nothing here is required.
          </p>
        </header>

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
          <h2 className="text-lg font-bold tracking-tight">Instant pay (optional)</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            If you prefer to be paid immediately after a completed delivery, we can send a
            Stripe transfer to the email on your Stripe account. Curri charges a{" "}
            <strong className="font-semibold text-foreground">6% instant-payout fee</strong>
            {" "}on this option. You need a Stripe account set up to receive payouts.
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
            <li>Whether you want standard pay (1–2 business days) or instant pay (6% fee)</li>
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
