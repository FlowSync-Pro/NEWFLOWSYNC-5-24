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
import DutyToggle from "@/components/DutyToggle";
import TelegramConnect from "@/components/TelegramConnect";
import { DUTY_DEFAULTS, vehicleClassFromType, vehicleClassLabel } from "@/lib/dispatch";
import { telegramBotUsername } from "@/lib/telegram";
import { feePercentFor, splitLoad } from "@/lib/payouts";
import { ptClock, ptTime } from "@/lib/pt-time";
import type { DispatchLane, DispatchStatus, PayPlan, VehicleClass } from "@prisma/client";

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
    body: `Email ${SUPPORT_EMAIL} (or DM Nasser privately on Telegram — not in the group chat) with your city, your vehicle (year, make, model), and whether you want standard pay (every Friday, ${FLEET.dispatchFeePercent}%) or faster pay (1–2 business days, ${FLEET.fastPayoutFeePercent}%). Then set up payouts from the Payouts page in your account — about 5 minutes with Stripe.`,
  },
  {
    title: "We add you on our carrier account",
    body: "Loads are dispatched through our carrier account. You do not need your own Curri carrier account to be approved before you can start. If you are already on Curri’s waitlist, you can run with our fleet while you wait.",
  },
  {
    title: "Go Active for nearby loads",
    body: "After you're activated, connect Telegram on this page and set yourself Active. While you're Active, loads that fit your vehicle, radius, and trip length are offered to you on Telegram with Accept and Pass. The first driver to accept gets the load; we claim or bid it in the Curri portal, then Telegram confirms it's yours. Go Inactive when you don't want offers — you also switch off automatically after the hours you set. Missed a Telegram message? Your open offers and your loads are also listed on this page.",
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

// ---- "Your offers and loads" — a read-only backup for Telegram (docs/DISPATCH-FLOW.md, stage 2b) ----

const LIVE_STATUSES: DispatchStatus[] = ["ASSIGNED", "PLACED", "AWARDED", "IN_PROGRESS"];
const DAY_MS = 86_400_000;

const LOAD_FIELDS = {
  id: true, lane: true, status: true, rush: true, pickupAt: true, busyUntil: true,
  pickupAddress: true, pickupZip: true, dropoffAddress: true, dropoffZip: true,
  tripMiles: true, vehicleClass: true, listedCents: true, bidCents: true, notes: true,
} as const;

type MyLoad = {
  id: string; lane: DispatchLane; status: DispatchStatus; rush: boolean; pickupAt: Date; busyUntil: Date | null;
  pickupAddress: string; pickupZip: string; dropoffAddress: string; dropoffZip: string;
  tripMiles: number | null; vehicleClass: VehicleClass; listedCents: number | null; bidCents: number | null; notes: string | null;
};

/**
 * Everything this driver should see about dispatch, scoped to their own
 * profile id (never a URL parameter). Kept outside the component so "now" is
 * computed in a plain helper, not during render.
 */
async function getMyDispatch(profileId: string) {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - DAY_MS);
  const [offers, live, closed, dropped] = await Promise.all([
    // Open offers: same guard respondOffer uses (pending, not expired, load still offered).
    prisma.dispatchOffer.findMany({
      where: { driverProfileId: profileId, response: "PENDING", expiresAt: { gt: now }, load: { status: "OFFERED" } },
      orderBy: { expiresAt: "asc" },
      take: 5,
      select: { id: true, expiresAt: true, load: { select: LOAD_FIELDS } },
    }),
    // Live loads assigned to this driver; past ones drop off 24 h after their estimated finish.
    prisma.dispatchLoad.findMany({
      where: { assignedProfileId: profileId, status: { in: LIVE_STATUSES }, OR: [{ busyUntil: { gt: dayAgo } }, { busyUntil: null }] },
      orderBy: { pickupAt: "asc" },
      take: 10,
      select: LOAD_FIELDS,
    }),
    // Lost / cancelled in the last 24 h — so nobody drives to a pickup that isn't theirs.
    prisma.dispatchLoad.findMany({
      where: { assignedProfileId: profileId, status: { in: ["LOST", "CANCELLED"] }, updatedAt: { gt: dayAgo } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, status: true, pickupZip: true, dropoffZip: true },
    }),
    // Accepted in the last 24 h but no longer assigned to this driver (un-assigned or re-assigned).
    prisma.dispatchOffer.findMany({
      where: {
        driverProfileId: profileId,
        response: "ACCEPTED",
        respondedAt: { gt: dayAgo },
        load: { OR: [{ assignedProfileId: null }, { assignedProfileId: { not: profileId } }] },
      },
      orderBy: { respondedAt: "desc" },
      take: 10,
      select: { load: { select: { id: true, pickupZip: true, dropoffZip: true } } },
    }),
  ]);
  return { offers, live, closed, dropped: dropped.map((d) => d.load) };
}

const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;

/** The same pay line the Telegram offer shows: the driver's net after their plan's fee. */
function payText(load: MyLoad, plan: PayPlan): string | null {
  const gross = load.bidCents ?? load.listedCents;
  if (!gross) return null;
  const pct = feePercentFor(plan);
  const atListed = load.lane === "BID" && load.bidCents === null ? " at the listed price" : "";
  return `Your pay: ${dollars(splitLoad(gross, pct).netCents)}${atListed} (load ${dollars(gross)} − ${pct}% dispatching fee)`;
}

/** What a live load means for the driver, in the Telegram wording. */
function statusText(load: MyLoad): string {
  if (load.status === "ASSIGNED") {
    return load.lane === "BID"
      ? "Accepted — we're placing the bid. Not yours until Curri awards it, so don't head out yet."
      : "Accepted — we're claiming it in Curri now. You'll see “Confirmed” here and on Telegram.";
  }
  if (load.status === "PLACED") return "Bid placed — waiting on Curri. Not yours yet, so don't head out.";
  if (load.status === "AWARDED") return "Confirmed — Curri awarded us this load. It's yours.";
  return "In progress.";
}

function LoadDetails({ load }: { load: MyLoad }) {
  const pickupWhere = load.pickupAddress && load.pickupAddress !== load.pickupZip ? `${load.pickupAddress} (${load.pickupZip})` : load.pickupZip;
  const dropWhere = load.dropoffAddress && load.dropoffAddress !== load.dropoffZip ? `${load.dropoffAddress} (${load.dropoffZip})` : load.dropoffZip;
  return (
    <div className="space-y-0.5 text-sm text-foreground/90">
      <p>
        {load.rush && <span className="mr-2 rounded-full bg-red-400/15 px-2 py-0.5 text-[10px] font-bold uppercase text-red-300">Rush</span>}
        Pickup {pickupWhere} · {ptTime(load.pickupAt)}
      </p>
      <p>Drop {dropWhere}{load.tripMiles !== null ? ` · ~${load.tripMiles} mi` : ""}</p>
      <p className="text-muted">{vehicleClassLabel(load.vehicleClass)}{load.notes ? ` · ${load.notes}` : ""}</p>
    </div>
  );
}

export default async function CurriFleetPage({ searchParams }: PageProps<"/account/curri-fleet">) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const [profile, user] = await Promise.all([
    prisma.driverProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true, firstName: true, baseZip: true, vehicleType: true, onDutyUntil: true, dutyRadiusMiles: true, dutyMaxTripMiles: true, curriActivatedAt: true },
    }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { fleetJoinedAt: true, telegramChatId: true, payPlan: true, stripeConnectPayoutsEnabled: true } }),
  ]);
  if (!profile) redirect("/account/setup");

  const joined = !!user?.fleetJoinedAt;
  // Dispatch backup view — fleet members only; non-members cost no extra queries.
  const mine = joined ? await getMyDispatch(profile.id) : null;
  const botUsername = telegramBotUsername();
  const telegramReady = !!botUsername && !!process.env.AUTH_SECRET;
  const isActive = !!profile.onDutyUntil && profile.onDutyUntil > new Date();
  const showDispatch = !!mine && (!!profile.curriActivatedAt || mine.offers.length + mine.live.length + mine.closed.length + mine.dropped.length > 0);
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
              details below so we can add you on the carrier account. Usually same day once we have them.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground/90">
              <li>Your city</li>
              <li>Your vehicle (year, make, model)</li>
              {user?.stripeConnectPayoutsEnabled
                ? <li>Payouts: set up ✓</li>
                : <li>Then set up payouts below (bank details go straight to Stripe, about 5 minutes)</li>}
              <li>Standard pay (every Friday, {FLEET.dispatchFeePercent}%) or faster pay (1–2 business days, {FLEET.fastPayoutFeePercent}%)</li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Curri%20fleet%20activation`}
                className="btn-primary inline-flex rounded-full px-6 py-2.5 text-sm"
              >
                Email {SUPPORT_EMAIL}
              </a>
              <Link href="/account/payouts" className="btn-ghost inline-flex rounded-full px-6 py-2.5 text-sm">
                {user?.stripeConnectPayoutsEnabled ? "Your payouts →" : "Set up payouts →"}
              </Link>
            </div>
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

        {joined && profile.curriActivatedAt && (
          <TelegramConnect linked={!!user?.telegramChatId} available={!!telegramBotUsername() && !!process.env.AUTH_SECRET} />
        )}
        {joined && profile.curriActivatedAt && (
          <DutyToggle
            onDuty={isActive}
            onDutyUntil={profile.onDutyUntil?.toISOString() ?? null}
            radiusMiles={profile.dutyRadiusMiles}
            maxTripMiles={profile.dutyMaxTripMiles}
            baseZip={profile.baseZip}
            vehicleLabel={vehicleClassLabel(vehicleClassFromType(profile.vehicleType))}
            defaults={DUTY_DEFAULTS}
          />
        )}

        {showDispatch && mine && (
          <section className="card mt-6 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Your offers and loads</h2>
                <p className="mt-1 text-sm text-muted">
                  A backup for your Telegram messages. Offers stay open only 2–3 minutes and the first driver to
                  accept gets the load. This list doesn&apos;t update by itself — tap Refresh.
                </p>
                {profile.curriActivatedAt && !user?.telegramChatId && telegramReady && (
                  <p className="mt-1 text-sm text-amber-300">Automatic offers only go to drivers connected on Telegram — connect above.</p>
                )}
              </div>
              {/* A full page reload so the list is rebuilt on the server. */}
              <a href="/account/curri-fleet" className="btn-ghost rounded-full px-5 py-2 text-sm">Refresh</a>
            </div>

            <h3 className="mt-5 text-sm font-semibold uppercase tracking-widest text-accent">Open offers</h3>
            {mine.offers.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                No open offers right now.{profile.curriActivatedAt && !isActive ? " Go Active above to get offers." : ""}
              </p>
            ) : (
              <ul className="mt-2 space-y-3">
                {mine.offers.map((o) => {
                  const pay = payText(o.load, user!.payPlan);
                  return (
                    <li key={o.id} className="rounded-xl border border-accent/30 bg-accent-soft p-4">
                      <LoadDetails load={o.load} />
                      {pay && <p className="mt-2 text-sm font-semibold text-foreground">{pay}</p>}
                      <p className="mt-1 text-xs text-muted">Open until {ptClock(o.expiresAt)}</p>
                      {user?.telegramChatId && botUsername ? (
                        <>
                          <a href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer" className="btn-primary mt-3 inline-flex rounded-full px-5 py-2 text-sm">
                            Open Telegram to Accept or Pass →
                          </a>
                          <p className="mt-2 text-xs text-muted">No message in Telegram? DM Nasser on Telegram to take it.</p>
                        </>
                      ) : (
                        <p className="mt-2 text-xs text-muted">Reply to Nasser&apos;s text, or DM him on Telegram, to take it.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-widest text-accent">Your loads</h3>
            {mine.live.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No loads assigned to you right now.</p>
            ) : (
              <>
                <ul className="mt-2 space-y-3">
                  {mine.live.map((l) => {
                    const pay = payText(l, user!.payPlan);
                    return (
                      <li key={l.id} className="rounded-xl border border-border bg-surface-2/60 p-4">
                        <p className={`mb-2 text-sm font-semibold ${l.status === "AWARDED" || l.status === "IN_PROGRESS" ? "text-accent" : "text-foreground"}`}>{statusText(l)}</p>
                        <LoadDetails load={l} />
                        {pay && <p className="mt-2 text-sm text-foreground/90">{pay}</p>}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-sm text-muted">Can&apos;t make it? DM Nasser on Telegram right away.</p>
              </>
            )}

            {mine.closed.length + mine.dropped.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-semibold uppercase tracking-widest text-muted">Last 24 hours — you&apos;re free</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {mine.closed.map((l) => (
                    <li key={`c-${l.id}`}>
                      {l.pickupZip} → {l.dropoffZip}: {l.status === "LOST" ? "Not this one — Curri gave the load to another carrier." : "Cancelled."} You&apos;re free.
                    </li>
                  ))}
                  {mine.dropped.map((l) => (
                    <li key={`d-${l.id}`}>{l.pickupZip} → {l.dropoffZip}: No longer yours. You&apos;re free.</li>
                  ))}
                </ul>
              </>
            )}
          </section>
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
            Members set it up themselves on /account/payouts (Stripe Connect
            Express — not a separate stripe.com account). */}
        {joined && user?.stripeConnectPayoutsEnabled ? (
          <section className="card mt-6 p-6">
            <h2 className="text-lg font-bold tracking-tight text-accent">Payouts are set up ✓</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Your Stripe account is ready — standard Friday pay and faster payouts both land there, and your
              1099 comes from Stripe at the end of the year.
            </p>
            <Link href="/account/payouts" className="btn-ghost mt-4 inline-flex rounded-full px-6 py-2.5 text-sm">
              View your payouts →
            </Link>
          </section>
        ) : (
          <section className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-6">
            <h2 className="text-lg font-bold tracking-tight text-amber-300">
              Set up payouts with Stripe (required{joined ? "" : " — after you join"})
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              We pay you as an independent contractor through Stripe, and you&apos;ll receive a{" "}
              <strong className="font-semibold text-foreground">1099 for your taxes</strong>{" "}
              at the end of the year. {joined ? "You" : "Once you join, you"} set it up yourself from the Payouts
              page in your account — about 5 minutes, and your bank details go straight to Stripe, not to us.
              That&apos;s where every payout lands, standard Friday pay and faster payouts alike.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
              <strong className="font-semibold text-foreground">Not done yet? That won&apos;t
              hold up your first loads.</strong> We can send your first two or three payouts another
              way while you get Stripe set up — but please get it done, because after that all pay
              goes through Stripe.
            </p>
            {joined && (
              <Link href="/account/payouts" className="btn-primary mt-4 inline-flex rounded-full px-6 py-2.5 text-sm">
                Set up payouts →
              </Link>
            )}
          </section>
        )}

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
