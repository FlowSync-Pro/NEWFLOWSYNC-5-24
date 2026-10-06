import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { SUPPORT_EMAIL } from "@/lib/site";
import { FLEET } from "@/lib/pricing";
import { fleetTelegramInviteUrl } from "@/lib/telegram-invite";
import FleetCheckout from "@/components/FleetCheckout";
import TrackEvent from "@/components/TrackEvent";
import { FleetBiddingStory, FleetCapNote, FleetDisclaimer, FleetPayLaterNote, FleetTerms } from "@/components/FleetPitch";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Curri fleet",
  robots: { index: false },
};

// How it works once you're in. Shown to members in full; non-members see the
// same steps as a preview so they know exactly what the $297 buys.
const STEPS = [
  {
    title: "Send us your details",
    body: `Email ${SUPPORT_EMAIL} (or DM Nasser privately on Telegram — not in the group chat) with your city, your vehicle (year, make, model), the email you want your Stripe setup link sent to, and whether you want standard pay (every Friday, ${FLEET.dispatchFeePercent}%) or faster pay (1–2 business days, ${FLEET.fastPayoutFeePercent}%).`,
  },
  {
    title: "We add you on our carrier account",
    body: "Loads are dispatched through our carrier account. You do not need your own Curri carrier account to be approved before you can start. If you are already on Curri’s waitlist, you can run with our fleet while you wait.",
  },
  {
    title: "Nearby loads in the dispatch relay",
    body: "When a nearby delivery is available it is sent in the dispatch relay. You choose to claim it, place a bid, or pass. You are never required to take a load.",
  },
  {
    title: "Complete the delivery",
    body: "If you take the load, run it as usual. After the delivery is complete, pay follows the schedule below.",
  },
  {
    title: "Get paid every Friday",
    body: `Curri pays our fleet account, and we pay you — as an independent contractor, by Stripe transfer. Standard pay runs weekly: completed deliveries are paid out every Friday, with a ${FLEET.dispatchFeePercent}% dispatching fee taken from the load. Want it sooner? See the faster-payout option below.`,
  },
  {
    title: "Everything in Premium is yours",
    body: "Fleet members get the bidding calculator, the business P&L tracker, every guide, and the Curri mastermind course in their account.",
  },
];

export default async function CurriFleetPage({ searchParams }: PageProps<"/account/curri-fleet">) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const [profile, user] = await Promise.all([
    prisma.driverProfile.findUnique({ where: { userId: session.userId }, select: { firstName: true } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { fleetJoinedAt: true } }),
  ]);
  if (!profile) redirect("/account/setup");

  const joined = !!user?.fleetJoinedAt;
  // Fleet members only — the one place drivers are pointed to Telegram.
  const telegram = joined ? fleetTelegramInviteUrl() : null;
  // Just paid from this page: fire the browser Purchase pixel with the Stripe
  // session id so Meta dedupes it against the webhook's CAPI event.
  const paidHere = sp.joined === "1";
  // welcome=1: sent here from the sign-in page after a homepage / offer-page
  // fleet purchase. That purchase already fired its pixel on the sign-in page,
  // so only the welcome copy applies — no second Purchase event.
  const welcome = sp.welcome === "1";
  const justJoined = joined && (paidHere || welcome);
  const purchaseSessionId = typeof sp.session_id === "string" ? sp.session_id : undefined;

  return (
    <div className="relative">
      {joined && paidHere && <TrackEvent event="Purchase" value={FLEET.price} eventId={purchaseSessionId} />}
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
            Hi {profile.firstName}{" "}
            — the Curri fleet is a separate opportunity from your FlowSync driver account. You get on our carrier account, we bid the loads, you run the ones you want, and
            you&apos;re paid every Friday. Nothing here is required.
          </p>
        </header>

        {joined ? (
          <section className="mt-8 rounded-2xl border border-accent/30 bg-accent-soft p-6">
            <h2 className="text-lg font-bold tracking-tight text-accent">
              {justJoined ? "You're in. Welcome to the fleet." : "You're a fleet member."}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              Member since {user!.fleetJoinedAt!.toLocaleDateString()}. Next step is on you: send Nasser the
              details below so we can add you on the carrier account and send your Stripe setup link. Usually
              same day once we have them.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground/90">
              <li>Your city</li>
              <li>Your vehicle (year, make, model)</li>
              <li>The email you want your Stripe setup link sent to</li>
              <li>Standard pay (every Friday, {FLEET.dispatchFeePercent}%) or faster pay (1–2 business days, {FLEET.fastPayoutFeePercent}%)</li>
            </ul>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Curri%20fleet%20activation`}
              className="btn-primary mt-5 inline-flex rounded-full px-6 py-2.5 text-sm"
            >
              Email {SUPPORT_EMAIL}
            </a>
            {telegram && (
              <div className="mt-5 border-t border-accent/20 pt-5">
                <p className="text-sm font-semibold text-accent">Fleet Telegram group</p>
                <p className="mt-1 text-sm text-foreground/90">
                  Where dispatch updates and questions from other fleet drivers live. Join it once you&apos;re
                  activated — Nasser will recognize you there.
                </p>
                <a
                  href={telegram}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost mt-3 inline-flex rounded-full px-6 py-2.5 text-sm"
                >
                  Open the fleet Telegram group →
                </a>
              </div>
            )}
          </section>
        ) : welcome ? (
          // Paid, but the Stripe webhook that records membership hasn't landed
          // yet (it usually does within seconds). Don't show a "Join" button to
          // someone who just paid.
          <section className="mt-8 rounded-2xl border border-accent/30 bg-accent-soft p-6">
            <h2 className="text-lg font-bold tracking-tight text-accent">Payment received — finishing your fleet setup</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              This usually takes a few seconds. Refresh this page in a moment to see your next steps. If it still
              isn&apos;t showing after a few minutes, email {SUPPORT_EMAIL} and we&apos;ll sort it out.
            </p>
            <Link href="/account/curri-fleet?welcome=1" className="btn-primary mt-5 inline-flex rounded-full px-6 py-2.5 text-sm">
              Refresh
            </Link>
          </section>
        ) : (
          <>
            <section className="card mt-8 p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold tracking-tight">Join the fleet</h2>
                <div className="text-right">
                  <span className="text-3xl font-extrabold text-accent">${FLEET.price}</span>
                  <span className="ml-1 text-xs text-muted">one-time</span>
                </div>
              </div>
              <div className="mt-4"><FleetCapNote /></div>
              <div className="mt-4"><FleetTerms /></div>
              <div className="mt-6"><FleetCheckout mode="member" /></div>
              <div className="mt-3"><FleetPayLaterNote /></div>
              <p className="mt-3 text-xs text-muted">
                You&apos;ll confirm the refund terms on the checkout page: {FLEET.refundShort}
              </p>
            </section>
            <section className="card mt-6 p-6">
              <h2 className="text-lg font-bold tracking-tight">Why the {FLEET.dispatchFeePercent}% is worth it</h2>
              <div className="mt-3"><FleetBiddingStory /></div>
            </section>
          </>
        )}

        {joined && (
          <section className="card mt-6 p-6">
            <h2 className="text-lg font-bold tracking-tight">What it costs</h2>
            <div className="mt-3"><FleetTerms /></div>
            <div className="mt-5 border-t border-border pt-5">
              <h3 className="font-semibold">How we bid loads</h3>
              <div className="mt-2"><FleetBiddingStory /></div>
            </div>
          </section>
        )}

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-widest text-accent">
          {joined ? "How it works" : "What happens after you join"}
        </h2>
        <ol className="mt-4 space-y-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="card p-6">
              <div className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">{step.title}</h3>
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
            <strong className="font-semibold text-foreground">{FLEET.fastPayoutFeePercent}% dispatching fee</strong> instead
            of the standard {FLEET.dispatchFeePercent}%. Like all payouts, it goes to your Stripe account — see the
            Stripe setup below.
          </p>
        </section>

        {/* Stripe is how every payout is delivered and how the 1099 gets issued.
            Members ask for the link here; non-members see when it arrives. */}
        <section className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-6">
          <h2 className="text-lg font-bold tracking-tight text-amber-300">
            Set up a Stripe account (required{joined ? "" : " — after you join"})
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            We pay you as an independent contractor through Stripe, and you&apos;ll receive a{" "}
            <strong className="font-semibold text-foreground">1099 for your taxes</strong>{" "}
            at the end of the year. Once you&apos;re on our carrier account we send you a Stripe setup link —
            that&apos;s where every payout lands, standard Friday pay and faster payouts alike.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">
            <strong className="font-semibold text-foreground">Don&apos;t have one yet? That won&apos;t
            hold up your first loads.</strong> We can send your first two or three payouts another
            way while you get Stripe set up — but please get it done, because after that all pay
            goes through Stripe.
          </p>
          {joined && (
            /* Payouts run through Stripe Connect: the owner generates the onboarding
               link, so members ask for it here rather than opening an unconnected
               stripe.com account on their own. */
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Stripe%20setup%20link`}
              className="btn-primary mt-4 inline-flex rounded-full px-6 py-2.5 text-sm"
            >
              Ask for your Stripe setup link →
            </a>
          )}
        </section>

        <section className="card mt-6 p-6">
          <h2 className="text-lg font-bold tracking-tight">Already on Curri’s waitlist?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            You can still run with our fleet while you wait for your own carrier account. After
            your own account is approved, using two accounts for two deliveries at once is
            optional and only if it makes sense for you. No pressure either way.
          </p>
        </section>

        <div className="mt-8"><FleetDisclaimer /></div>
      </div>
    </div>
  );
}
