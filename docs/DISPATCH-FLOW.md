# Dispatch flow — claiming and bidding Curri loads for a nationwide fleet

Design, 2026-10-07. Nothing here is built yet; it is the plan the owner asked for after
payouts went live. Scoping/approval per AGENTS.md section C applies to every stage
(new integrations, schema changes, anything that touches Curri's platform).

## The problem

Curri posts a delivery opportunity to the Barham Transport carrier account. Someone has to
decide, within minutes, (1) whether we want it, (2) which of our drivers — spread across the
country — can actually run it, (3) what to bid, and (4) claim/bid it in the Curri carrier
portal and assign the driver. Today the owner does all four by hand, often from the road,
by reposting the load in the Telegram relay group where every driver nationwide sees every
load. That does not scale and it invites mistakes: a claim with no driver, a driver 300
miles away, two drivers on one load, a bid below cost.

## Principles

1. **Never claim a load we can't cover.** A load is claimed in Curri only after a specific
   driver has accepted it — or the owner knowingly overrides with a visible "unassigned"
   warning and a countdown.
2. **Distance decides who hears about a load.** A driver only gets offered loads within
   their radius of their base (or live location when they share it).
3. **One driver, one load at a time.** Accepting locks the load to that driver and marks
   them busy for its time window.
4. **Humans confirm money.** The system suggests the bid; the owner (or a trusted
   dispatcher) confirms it.
5. **No automation against Curri's portal.** Reading our own notifications and using any
   API/webhook Curri gives carriers is fine; driving their website with a bot is not
   (terms-of-service risk, brittle, and the opposite of "no mistakes"). AGENTS.md section E.
6. **Everything is logged.** Every state change has who/when, so a dispute is answerable.

## Step 0 — ask Curri two questions before building anything

These two answers can remove most of the build:

- **Can drivers on our carrier account see and accept loads themselves** (in the Curri
  driver app or a carrier sub-login)? If yes, dispatch becomes: let nearby drivers
  self-claim inside Curri, and our system only tracks, pays and audits.
- **Is there a carrier API or webhook** for new opportunities, awards and completions? If
  yes, ingestion is automatic and reliable. If not, opportunity emails/SMS from Curri are
  the ingestion source.

## What we need to know about each driver (data)

Already in the profile: city, vehicle type, service radius ("Within 5/15/30 mi / Regional"),
phone, fleet membership, Stripe readiness.

To add (all additive):
- **Base location** — ZIP code (geocoded once to lat/lng). Later: optional live location.
- **Curri activation** — on the carrier account yes/no (today only in the owner's head).
- **Availability** — on duty / off duty, set by the driver (Telegram bot command or a
  button in the account), plus a "busy until" set automatically by an accepted load.
- **Vehicle class** normalised to what Curri asks for (car / SUV / cargo van / sprinter /
  box truck / flatbed) and payload limits.
- **Reliability** — completed loads, late/no-shows, rating (feeds ranking, never a promise).

## The flow, state by state

```
NEW  →  MATCHED  →  OFFERED  →  ACCEPTED  →  BID/CLAIM PLACED  →  AWARDED | LOST
                                                   ↓
                                     ASSIGNED IN CURRI → IN PROGRESS → DELIVERED → PAYOUT LOGGED
(any state → CANCELLED / EXPIRED, with a reason)
```

1. **NEW** — a load enters the board: pickup address, dropoff address, vehicle required,
   listed price, pickup window, Curri load id. Entered by hand (stage 1) or ingested
   automatically (stage 2).
2. **MATCHED** — the system geocodes pickup/dropoff, computes trip miles, and ranks
   candidates:
   - hard filters: fleet member, Curri-activated, on duty, vehicle class ≥ required, pickup
     within the driver's radius of their base, no overlapping accepted load;
   - ranking: distance to pickup, then reliability, then a fairness rotation so the same
     driver doesn't get every load;
   - shows the owner the top candidates with miles-to-pickup and a **suggested bid** from
     the bidding calculator (driver's cost per mile × trip miles + deadhead, target margin,
     plus our dispatching fee) and the listed price. "No one in range" is a first-class
     outcome and is shown loudly.
3. **OFFERED** — one tap offers the load to the top N (default 3) at once. Each gets a
   Telegram DM (and later SMS) with the essentials and an Accept / Pass link that is signed,
   single-use and expires (default 3 minutes). Offers cascade to the next N on no answer.
4. **ACCEPTED** — first accept wins atomically (one database row flips; the rest see
   "taken"). The driver is marked busy for the pickup window. The owner is pinged.
5. **BID / CLAIM PLACED** — the owner claims at list or places the suggested bid in the Curri
   portal (manual, by design) and records "placed" on the board with the amount. If Curri
   exposes an API for this later, this step can be a button; until then it is one portal
   action with the driver already committed.
6. **AWARDED / LOST** — recorded by hand or from Curri's award email. Lost → driver freed
   and told. Awarded → the owner assigns the driver on the carrier account (manual) and
   the board shows ASSIGNED.
7. **DELIVERED** — driver taps "delivered" (Telegram or account) or the Curri completion
   email arrives. The board pre-fills **Log delivery** on the driver's admin page with the
   load amount and the Curri reference, so the payout is one confirm (phase 2 payouts).

## Guards against the mistakes that matter

| Mistake | Guard |
|---|---|
| Claim with no driver | Claim step is disabled until ACCEPTED, unless the owner overrides with a visible warning and a timer |
| Driver too far | Hard radius filter; distance shown on every offer and on the board |
| Two drivers on one load | Atomic accept; second accept returns "taken" |
| Driver double-booked | "busy until" from accepted loads blocks overlapping offers |
| Wrong vehicle | Vehicle class is a hard filter, not a ranking factor |
| Bid below cost | Suggested bid shows cost floor; a bid under the floor needs a second confirm |
| Stale offer | Signed, expiring, single-use accept links |
| Lost history | Every transition logged with actor + timestamp; exportable |

## Stages (each one is its own scoped, approved task)

**Stage 1 — Dispatch board, manual ingest (no new external services).**
Admin page `/admin/dispatch`: enter a load, see ranked candidates with distance, offer via
the existing Telegram bot, accept links, state tracking, pre-filled payout. Distance from a
bundled ZIP-centroid table (no API, good enough for "who is near"). Needs: driver ZIP +
Curri-activated + on-duty fields (additive migration), a Telegram bot token from the owner
(section F), signed accept links.

**Stage 2 — Automatic ingest.** Curri's opportunity / award / completion notifications
forwarded to an inbox we control and parsed into board entries (or Curri's API/webhook if
it exists). Removes the typing; the owner's job becomes confirm-and-place.

**Stage 3 — Real driving distance and live location.** A maps provider (new dependency,
ask-first) for driving miles/ETA; optional live location from the driver's phone while on
duty, so ranking uses where they are now, not their base.

**Stage 4 — Driver self-serve.** If Curri allows drivers on the carrier account to claim
loads themselves, flip the model: nearby drivers claim directly in Curri; our board
ingests the award and runs the payout. Dispatch becomes exception-handling only.

## What stays manual, on purpose

Placing the claim/bid in Curri and assigning the driver on the carrier account — until
Curri gives carriers an official way to do it programmatically. Both are one action each,
and the system makes sure they happen with a committed, in-range driver and a bid that
clears cost.
