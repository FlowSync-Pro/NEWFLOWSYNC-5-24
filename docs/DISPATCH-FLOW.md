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

1. **Never claim a load we can't cover.** A load is claimed in Curri only when a specific
   driver is committed to it — pre-committed by being on duty within parameters (claim
   lane) or by accepting an offer (bid lane). No override: releasing a claim is a serious
   violation on the carrier account.
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

## What Curri allows (owner, 2026-10-08)

- **Only admin accounts** on the carrier portal can see new opportunities and prices, place
  bids, claim, and see delivery history. Drivers cannot. So the claim/bid is always a human
  with admin access — the owner or a dispatcher he trusts — and "driver self-claim" is off
  the table.
- **API/webhook: unknown.** There is a carrier portal website. Until Curri confirms an API,
  the realistic feed is whatever notifications the portal sends (email / SMS / push) plus
  the portal itself.

Answered by the owner, 2026-10-08:
- **Announcements:** email, app push, and inside the portal. → Email is the automatic feed
  (stage 2); push can't be ingested; the portal is the human's screen.
- **How long a load stays open:** anywhere from seconds (hot markets, listed-price claims)
  to minutes or longer (loads taking bids).
- **Releasing a claimed load is a serious violation**; too many → account suspended.
  → **Never claim without a committed driver. No "hot-load mode". Stage 4 is dropped.**
- **Admin seats: unlimited.** → A trusted dispatcher can cover while the owner drives; the
  board is built for more than one dispatcher from day one (every action records who).

### The consequence: commitment has to happen BEFORE the load appears

If the fastest loads go in seconds and a claim can never be released, "offer → driver
accepts → owner claims" is too slow for those loads. The fix is to move the driver's
acceptance earlier:

- **Going on duty is a commitment.** When a driver sets themselves on duty they state their
  parameters: hours, radius from their base, vehicle, max trip miles. Within those
  parameters they are pre-accepting any load the dispatcher assigns them.
- **The board shows "covered" or "not covered" for a load in one glance**, using only
  on-duty drivers whose parameters fit. If covered, the dispatcher claims immediately and
  the driver gets an "Assigned" message, not a "Do you want it?" question. If not covered,
  the claim button stays locked.
- **Passing an assigned load is the exception**, handled like a no-show under the fleet's
  existing two-violations rule, because a pass after a claim is exactly what gets the
  carrier account suspended. Drivers can always go off duty instead.
- **Loads taking bids** (slower) keep the gentler path: offer → accept → bid.

So there are two lanes on the board:

| Lane | Load type | Driver step | Dispatcher step |
|---|---|---|---|
| Claim lane | Listed price, goes in seconds | Pre-committed by being on duty | Board says "Covered by X, 12 mi" → claim in Curri → driver gets Assigned |
| Bid lane | Taking bids, minutes+ | Gets an offer, accepts in app | Places the suggested bid in Curri after an accept |

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

**Stage 4 — dropped.** Claim-first-then-find-a-driver is never safe (releasing a claim is a
serious violation), and driver self-claim is not possible (Curri restricts opportunities,
bids and claims to admin accounts). The claim lane above, with on-duty pre-commitment, is
how fast loads are covered without either.

## What stays manual, on purpose

Placing the claim/bid in Curri and assigning the driver on the carrier account — until
Curri gives carriers an official way to do it programmatically. Both are one action each,
and the system makes sure they happen with a committed, in-range driver and a bid that
clears cost.

## Stage 1 scope (2026-10-08) — the dispatch board

Split in two so the board is usable within days and the Telegram half lands after.

### Stage 1a — board, ranking, assignment (no new external services)

**Data (one additive migration, backup first):**
- `DriverProfile`: `baseZip`, `baseLat`, `baseLng` (filled from the bundled ZIP table),
  `vehicleClass` (enum, Curri's names — owner 2026-10-08: CAR, SUV, MINIVAN, PICKUP_TRUCK, CARGO_VAN, SPRINTER_VAN, BOX_TRUCK),
  `curriActivatedAt`, `onDutyUntil`, `dutyRadiusMiles`, `dutyMaxTripMiles`.
- `DispatchLoad`: Curri reference, pickup/dropoff address + ZIP + lat/lng, vehicle class
  required, listed price, lane (CLAIM / BID), pickup time, notes, status
  (NEW → ASSIGNED | OFFERED → ACCEPTED → PLACED → AWARDED | LOST → IN_PROGRESS → DELIVERED;
  CANCELLED / EXPIRED with reason), assigned driver, bid amount, who created it.
- `DispatchOffer`: load, driver, sent/expires, single-use token hash, response.
- `DispatchEvent`: audit log — load, actor, from → to, note, time. Never deleted.

**Distance:** a bundled US ZIP-centroid table (Census ZCTA gazetteer, public domain,
~1 MB) + straight-line miles. No maps API. "Within radius" is judged on this; driving
distance is stage 3.

**Admin `/admin/dispatch`:** new-load form; open loads with state; per load: ranked
candidates (miles to pickup, vehicle, on duty, busy), the **covered / not covered** verdict
from on-duty drivers whose parameters fit, suggested bid (bidding-calculator formula:
miles × cost per mile + hours × hourly target, plus the dispatching fee; cost per mile from
the driver's P&L when present, else the calculator default), and buttons: Assign (claim
lane), Offer (bid lane; in 1a this records the offer and the owner texts the driver),
Mark placed (amount), Awarded / Lost, In progress, Delivered → opens "Log delivery" on the
driver's page pre-filled with amount and Curri reference. Claim-lane Assign is disabled
when not covered — no override.

**Driver side:** profile edit gets base ZIP and vehicle class; the fleet page gets an
on-duty toggle with parameters (hours, radius, max trip miles) and shows "on duty until".
Admin driver page gets "Activated on Curri" (date) next to the fleet toggle.

**Dispatchers:** anyone in `ADMIN_EMAILS` for now; every event records who.

### Stage 1b — Telegram

- Linking: a "Connect Telegram" button on the fleet page opens the existing bot with a
  signed start token; the webhook stores the driver's chat id (`User.telegramChatId`).
- On duty / off duty by bot command (`/onduty 30` = 30-mile radius, `/offduty`) as well as
  the page toggle.
- Claim lane: "Assigned" message with pickup, dropoff, time, pay. Bid lane: offer message
  with Accept / Pass buttons (signed, single-use, 3-minute default); first accept wins
  atomically; the rest see "taken".
- Owner/dispatcher pinged on accept, pass, and no-answer.

### Not in stage 1
Email ingest of Curri notifications (stage 2), driving distance / ETA and live location
(stage 3), SMS, dispatcher roles beyond the admin list, multi-stop loads.

### Approval needed
Migration (backup first); a ~1 MB data file in the repo; Telegram bot changes (token
already provided by the owner); **new personal-data fields** (base ZIP, Telegram chat id —
section E: both are needed for the function and stated on the fleet page).

### Done looks like
Enter a load → board says "Covered by X, N mi" → Assign → (1b: X gets the Telegram
message) → Mark placed / Awarded / Delivered → Log delivery opens pre-filled → payout.
Every step visible in the load's event log.

### Decisions (owner, 2026-10-08)
- **Vehicle classes** are Curri's: car, SUV, minivan, pickup truck, cargo van, sprinter van,
  box truck. A load's required class is a hard filter; a bigger class may cover a smaller
  one only where Curri allows it (rank: car < SUV < minivan < pickup truck < cargo van <
  sprinter van < box truck).
- **On-duty defaults:** 30-mile radius, 150 max trip miles, 8-hour shift.
- **Suggested bid:** the bidding calculator's formula as it stands (miles × cost per mile +
  hours × hourly target, dispatching fee included), cost per mile from the driver's P&L
  when they have one, else the calculator default.
- **Pickup timing:** two kinds. *Rush* — pickup within 30 minutes of posting; the board
  treats the window as now → now + 30 min and only counts drivers close enough to make it.
  *Scheduled* — the pickup time Curri shows. A driver's **busy window** = pickup start →
  pickup + estimated trip time (trip miles at ~35 mph + 30 min handling); overlapping
  windows block a second assignment.

## Stage 1b (2026-10-08) — Telegram + the intake door — BUILT

What Curri's emails actually contain (owner samples, 2026-10-08): city names only (no
state, no street address, no ZIP), the vehicle size in Curri's words, "Rush" or "today at
10:00AM (Fri 6/5)", Curri's own miles "(28 mi)", and a "View delivery" link carrying
the delivery id. No price on the new-opportunity email. So: the board resolves city
names via a bundled Census places table (`src/data/place-centroids.json`, `locate()` in
`lib/geo.ts`; a bare city picks the state nearest our drivers), uses Curri's miles when
given, and the five email types drive the load's status through the intake door
(`docs/DISPATCH-INTAKE.md`). Subjects: "New delivery opportunity from Curri", "Curri
delivery opportunity: bid placed", "You have been assigned a delivery!" (won), "You
didn't receive this delivery" (lost), "Curri delivery opportunity: you've been underbid!".

### Original scope

Stage 1a is live. 1b removes the two manual relays: texting drivers by hand, and typing
loads in. The owner plans to have an agent (Cursor) watch Curri's emails/push and send
loads in — allowed and welcome; an agent must NOT drive the Curri portal (terms, brittle,
and a mis-click there is an unreleasable claim). Rule: agents feed the board; humans claim.

**Data (one additive migration):** `User.telegramChatId` (unique, nullable) — the
driver's private chat with the existing bot. New personal-data field (section E): needed
for the function, stated on the fleet page.

**Env (one new variable — RISKY deploy, owner sets it in Vercel):** `DISPATCH_INTAKE_KEY`,
a long random secret for the intake endpoint. Telegram already has its token, webhook
secret, owner user id and `TELEGRAM_BOT_USERNAME`.

**1. Linking.** Fleet page → "Connect Telegram" opens
`https://t.me/<bot>?start=<signed token>` (HMAC with AUTH_SECRET, 15-minute expiry,
single use). The webhook sees `/start <token>` in a private chat, verifies it, stores
`telegramChatId`, replies "Linked — you'll get loads here." Unlinking: `/unlink`.

**2. Duty by command (private chat).** `/onduty` (defaults), `/onduty 10 40 200`
(hours, radius mi, max trip mi), `/offduty`, `/status`. Same `setDuty` as the page.

**3. Messages to drivers.**
- Claim lane, on Assign: "ASSIGNED — pickup <address> (<zip>) at <time>, drop <address>,
  <vehicle>, pay $<net after fee>, note. Reply here if anything's wrong." No buttons.
- Bid lane, on Offer: the same details + inline buttons **Accept** / **Pass**
  (`callback_data = offer:<id>:accept|pass`). The webhook handles `callback_query`
  (today it only reads `message`), calls `respondOffer`, and answers the tap: "You've got
  it", "Taken — someone was faster", "Expired", or "Passed". Expiry (OFFER_MINUTES) is
  enforced at response time.
- On Awarded / Lost / Cancelled: one line to the assigned driver.

**4. Pings to the owner/dispatcher** (`TELEGRAM_OWNER_USER_ID`): a driver accepted or
passed; a load arrived through intake, with the verdict and a link
("New load 93711→93612 · cargo van · $145 · COVERED by Marcus (8 mi) → /admin/dispatch/…").
No-answer alerts need a scheduler — not in 1b; the board shows pending offers.

**5. Intake door.** `POST /api/dispatch/intake`, `Authorization: Bearer <DISPATCH_INTAKE_KEY>`,
JSON with the same fields as the form (`curriRef`, `lane`, `rush`, `pickupAt`,
`pickupAddress`, `pickupZip`, `dropoffAddress`, `dropoffZip`, `vehicleClass`, `listed`,
`notes`). Validates exactly like the form, creates the load as NEW (never assigns, never
claims), ranks it, pings the owner with the verdict. Duplicate `curriRef` within 24 h →
200 with the existing load id (no second row). Rate-limited; wrong key → 401; logged.
Any agent — Cursor, a Gmail script, a Zapier parser — uses this door.

**Not in 1b:** no-answer timers, driving distance / live location (stage 3), SMS, the
email parser itself (that is the agent's job, outside this repo).

**Approval needed:** migration (backup first), the new env var, Telegram bot changes, the
new personal-data field.

**Done looks like:** a driver taps Connect Telegram once; goes on duty by `/onduty`; an
agent posts a load → the owner's phone shows "COVERED by X" with a link → Assign → the
driver's phone shows ASSIGNED → the owner claims in Curri. Bid lane: the driver taps
Accept on their phone; the owner's phone says who accepted.

**Open questions for the owner:** (1) what fields a Curri new-opportunity email actually
contains (paste one, redacted) — decides what the agent can fill in; (2) the owner's
pings to his private chat with the bot (default) or the relay group; (3) drivers may go
on duty by Telegram command as well as the page (recommended yes).

### Telegram webhook registration (ops note, 2026-10-08)

Telegram only delivers the update kinds the webhook was registered for. The offer
buttons need `callback_query`, so after any change to what the bot handles, re-register
(run on the owner's computer; placeholders come from Vercel env vars, never commit them):

```
curl -sS "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d url=https://flowsyncdriver.com/api/telegram/webhook \
  -d secret_token=<TELEGRAM_WEBHOOK_SECRET> \
  -d 'allowed_updates=["message","callback_query"]'
```

Check what is registered with `…/getWebhookInfo`. Symptom when it's missing: Accept /
Pass taps do nothing (no toast), while text commands still work.

## Stage 3 scope (2026-10-08) — real driving distance, and live location

Today the board ranks by straight-line distance × 1.25 from each driver's home ZIP (or a
city centre). Two weaknesses: a river, a mountain or a freeway gap makes "12 mi" really
40 minutes; and a driver who is 60 miles from home right now is ranked as if they were home.

### 3a — driving miles and minutes (Google, key already in the project)

- Reuse `GOOGLE_MAPS_API_KEY` (already used by `src/lib/distance.ts` for trip auto-mileage).
- When a load is created: keep the free straight-line pass as a **pre-filter** (drivers
  within 1.5 × their radius, max 20), then ask Google **once** for driving miles + minutes
  from each of those drivers to the pickup (one matrix request, ≤ 20 elements), and once
  for pickup → dropoff.
- Rush loads ask for **traffic-aware** minutes ("departure now"); scheduled loads use
  normal minutes. Rush "can make it" = traffic minutes ≤ 30.
- Store the answers on the load (one additive JSON column, `DispatchLoad.driveCache`) so
  page views and re-ranks don't call Google again. Refresh button re-asks.
- Ranking and COVERED use driving miles/minutes when present; the board labels each number
  "drive" or "est." so it's clear which is which. Radius stays in miles (what drivers set).
- **Fallback**: no key, quota hit, or Google error → today's straight-line estimate, logged,
  never blocks a load.
- Google has moved its distance service to the newer "Routes API" (Compute Route Matrix);
  the old Distance Matrix may not be enable-able on a new project. Build against Routes
  API; keep `lib/distance.ts` for trips unchanged.

### 3b — live location while on duty (optional, sensitive)

- Driver shares **Telegram live location** with the bot (attach → Location → Share live
  location, 8 h). The bot receives updates; we keep **only the latest point** and its time.
  No trail, no history.
- Used for ranking only while fresh (< 15 min) and on duty; otherwise the home ZIP.
- Cleared on `/offduty`, on duty expiry, and when Telegram reports sharing stopped.
- Visible to admins as "live · 4 min ago · 18 drive min to pickup" — no map, never shown to
  other drivers or customers.
- Needs: three nullable columns on DriverProfile (`liveLat`, `liveLng`, `liveAt`), the
  webhook re-registered with `edited_message` added, a line in the privacy policy and on
  the fleet page. **Precise location of contractors is the most sensitive data this site
  would hold** — owner decision, and worth an attorney's glance alongside the contractor
  terms already owed.

### Not in stage 3
No-answer timers on offers (need a per-minute scheduler — Vercel Pro cron), SMS fallback,
route maps on the board, multi-stop loads.

### Approval needed
3a: one additive migration (`driveCache`), Google Routes API enabled on the key's project,
a budget alert. 3b: one additive migration, webhook re-registration, privacy copy, the
owner's explicit yes on collecting live location.

### Done looks like
3a: an intake load from Curri shows "Marcus — 14 mi · 22 min (drive, traffic)" and the
verdict uses it; with the key removed the board still works on estimates. 3b: a driver
shares live location from 40 mi away and the board ranks them from where they are.

### Owner decision (2026-10-08): no new paid services for dispatch

"No more monthly subscriptions out of pocket; anything that costs money comes out of the
drivers' pocket, not mine." Consequences:
- **3a (Google driving distance) is shelved.** The board keeps the free ZIP / city
  estimates. Revisit only with a way to pass the cost to drivers (pricing change, ask first).
- Everything dispatch uses today is free: Telegram bot, bundled Census tables, intake door.
- On duty / off duty is to be presented to drivers as **Active / Inactive** (same meaning:
  "I'm ready to take loads now").
- Any cost that does exist (e.g. Stripe Connect payout fees) is to be passed to drivers —
  a pricing change under AGENTS.md section D, so it needs the owner's explicit wording first.
- **Decided 2026-10-08: Stripe Connect fees are covered by the dispatching fee** (15% /
  20%). No separate payout fee; receipts and pricing stay as they are.
