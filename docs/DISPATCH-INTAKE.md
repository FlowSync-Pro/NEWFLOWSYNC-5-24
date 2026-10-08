# Dispatch intake — how an agent feeds Curri emails into the board

For the agent (Cursor or anything else) that watches the owner's Gmail. It reads
Curri's emails and posts a few fields to the site. It never touches the Curri
portal, never assigns a driver, never claims. The board and the owner do that.

## The door

```
POST https://flowsyncdriver.com/api/dispatch/intake
Authorization: Bearer <DISPATCH_INTAKE_KEY>
Content-Type: application/json
```

`DISPATCH_INTAKE_KEY` is set by the owner in Vercel (Settings → Environment
Variables) and given to the agent out of band. Never put it in an email, a doc,
or a repo. Wrong key → 401. Over 16 KB → 413. Bad fields → 422 with `error`.

## The five Curri emails and what to send

All from `emails@curri.com` or `emails@email.curri.com`. Match on the subject.

### 1. "New delivery opportunity from Curri" → `kind: "opportunity"`

Body looks like one of:
- `Rush delivery opportunity requiring car-sized vehicle from Santa Fe Springs to Irvine (28 mi)`
- `Delivery opportunity requiring box truck-sized vehicle from South Pasadena to Topanga (33 mi) today at 10:00AM (Fri 6/5)`
- `Rush delivery opportunity requiring sprinter van-sized vehicle within Sacramento (10 mi)` (same city both ends)

```json
{
  "kind": "opportunity",
  "curriRef": "<the View delivery link or its id>",
  "rush": true,
  "pickupAt": "2026-06-05T17:00:00Z",
  "pickupCity": "Santa Fe Springs, CA",
  "dropoffCity": "Irvine, CA",
  "vehicle": "car-sized vehicle",
  "miles": 28,
  "lane": "CLAIM",
  "listed": "",
  "notes": ""
}
```

- `curriRef` — the "View delivery" button's URL (or the id at the end of it). It
  de-duplicates (same ref within 48 h → the existing load is returned) and lets
  the later emails find the load.
- `rush` — true when the body says "Rush". Then `pickupAt` may be omitted.
- `pickupAt` — ISO 8601 in UTC, converted by the agent from "today at 10:00AM
  (Fri 6/5)" in Pacific time. Required when not rush.
- `pickupCity` / `dropoffCity` — the city names as written. Add the state when
  known (`"Ontario, CA"`); without it the board picks the state closest to our
  drivers. A 5-digit ZIP is also accepted. "within Sacramento" → both the same.
- `vehicle` — Curri's words. "car-sized", "SUV", "minivan", "pickup truck",
  "cargo van", "sprinter van", "box truck" are understood; "with a Liftgate"
  becomes a note.
- `miles` — Curri's "(28 mi)".
- `lane` — `"CLAIM"` (default; listed price, goes fast) or `"BID"`. The emails
  don't say which; the dispatcher can switch it on the board.
- `listed` — dollars as text, if the email ever states a price. Usually empty.

Response: `{ ok: true, loadId, status: "OFFERED", covered: ["Marcus Lee", …], offered: 2 }` or
`duplicate: true`. The load is offered automatically on Telegram to every matching Active
driver; the owner's Telegram gets "Offered to N Active drivers … / Not on Telegram — text
them … / NOT COVERED" with a link, then "X ACCEPTED — CLAIM NOW" when someone taps Accept.

### 2. "Curri delivery opportunity: bid placed" → `kind: "event", type: "bid_placed"`

Body: `You placed a bid of $1500.00 for a delivery from Fresno, CA to Phoenix, AZ with 1 stops. You assigned Ghassan Ghannam in a Sprinter Van.`

```json
{ "kind": "event", "type": "bid_placed", "curriRef": "<View delivery link>", "amount": "1500.00", "driverName": "Ghassan Ghannam", "pickupCity": "Fresno, CA", "dropoffCity": "Phoenix, AZ" }
```
Effect: an ASSIGNED load becomes PLACED with that bid. Otherwise just logged.

### 3. "You have been assigned a delivery!" (Won delivery bid) → `type: "won"`

Body: `Congrats! You've been assigned a rush delivery from Fresno, CA to Sacramento, CA with 1 stops. Your driver Joe Ghannam needs to arrive in a Sprinter Van.`

```json
{ "kind": "event", "type": "won", "curriRef": "<View delivery link>", "driverName": "Joe Ghannam", "pickupCity": "Fresno, CA", "dropoffCity": "Sacramento, CA", "rush": true }
```
Effect: ASSIGNED or PLACED → AWARDED; the assigned driver is told on Telegram;
the owner is reminded to assign the driver in the portal.

### 4. "You didn't receive this delivery" (Lost delivery bid) → `type: "lost"`

Body: `We assigned the delivery you bid on from Fresno, CA to Phoenix, AZ to another courier.`

```json
{ "kind": "event", "type": "lost", "curriRef": "<View delivery link>", "pickupCity": "Fresno, CA", "dropoffCity": "Phoenix, AZ" }
```
Effect: PLACED → LOST (driver told, freed). ASSIGNED-but-not-placed → CANCELLED.

### 5. "Curri delivery opportunity: you've been underbid!" → `type: "underbid"`

Body: `You were underbid by another courier. Click to bid lower than $99.99 or 'Claim now'.`

```json
{ "kind": "event", "type": "underbid", "curriRef": "<View delivery link>", "amount": "99.99" }
```
Effect: the owner's Telegram gets "UNDERBID — beat $99.99 or claim now" with a link.
Nothing changes on the load.

## The portal-feed bot ("Curri Dispatch") — owner decision 2026-10-08

The owner runs a separate bot (built with Cursor, not in this repo) that watches the
Curri carrier portal's opportunity feed. It sees more than the emails: street addresses,
pay, rate per mile, accessories. Decision: **combine** — that bot keeps watching, but
posts every load here instead of messaging drivers itself. This board does the matching,
the Telegram offers, first-accept-wins and the owner's "CLAIM NOW" ping, so drivers deal
with one bot only.

Reading the portal feed is the owner's choice and the owner's risk with Curri (it is
automation against their site; AGENTS.md section E asks for owner confirmation, which he
gave by running it). The bot must never claim, bid, assign or click anything in the portal.

### New load in the feed → `kind: "opportunity"`

```json
{
  "kind": "opportunity",
  "source": "portal",
  "curriRef": "del_74CYDVWBBY",
  "rush": true,
  "pickupAddress": "Eagle Roofing Products, 2352 N Locust Ave, Rialto",
  "dropoffAddress": "2020 S Yale St, Santa Ana",
  "pickupCity": "Rialto, CA",
  "dropoffCity": "Santa Ana, CA",
  "vehicle": "Box Truck",
  "miles": 41,
  "pay": 162.77,
  "accessories": "Liftgate · Priority: rush"
}
```

- `curriRef` — the `del_…` id. Required; it de-duplicates and matches later events.
- `pickupCity` / `dropoffCity` — optional when the address ends in the city (the board
  takes the last part of the address); sending "City, ST" is more reliable.
- `pay` (or `listed`) — dollars, number or text. `accessories` — liftgate and other
  extras become driver notes; "Priority: rush" also sets rush.
- Non-rush loads need `pickupAt` (ISO 8601, UTC).

### Load left the feed → `kind: "event", type: "gone"`

```json
{ "kind": "event", "type": "gone", "curriRef": "del_LY9R7VNZQW" }
```

If nobody had accepted it yet, the load is cancelled ("left the Curri feed") and every
driver holding an open offer is told it's gone. If a driver had already accepted, it's
only logged — the load also leaves the feed when *we* claim it.

### Once a minute → `POST /api/dispatch/sweep` (the "no taker" tick)

```
curl -sS -X POST https://flowsyncdriver.com/api/dispatch/sweep \
  -H "Authorization: Bearer $DISPATCH_INTAKE_KEY"
```

No body. Same key as the intake door. Returns `{"ok":true,"noTaker":N}`. Each call checks
for offered loads whose offer window closed (or every driver passed) with nobody
accepting, notes them on the board once, and pings the owner "⌛ NO TAKER … Don't claim".
It never assigns or claims. The same check also runs for free on every intake call and
every driver tap on Telegram; the tick only makes the ping arrive on time in quiet
stretches. Spec for the bot: `docs/CURSOR-TASK-PORTAL-BOT-3.md`.

### Turn off in that bot
- Its own driver messages and commands (`/on`, `/end`, `/dispatch … @driver`, "Sent to N
  available drivers"). Drivers use the FlowSync bot: `/active`, `/inactive`.
- **Kept (owner decision):** one "NEW LOAD DETECTED" info card per load to the owner's
  private chat only (addresses, pay, rate per mile, vehicle, portal link), ending with
  "FlowSync is offering it to Active drivers — claim only after ✅ ACCEPTED — CLAIM NOW".
- "Claim on Curri portal, then dispatch" prompts. Claim only after this board's
  "✅ … ACCEPTED — CLAIM NOW".
- The "$25 / removal" line — not in the fleet terms on the site. Any driver charge is a
  terms and pricing change (AGENTS.md sections C–E) and needs attorney review first.

## Rules for the agent

- Post every email exactly once; the door is idempotent on `curriRef` for
  opportunities, so a retry is harmless.
- Do not invent fields. Leave `listed` empty if no price is in the email.
- Do not post emails older than the agent's start time (the inbox has
  thousands of old ones).
- Never click "View delivery" to scrape more; the portal is the human's.
- If the response is 422, log the error and move on; don't retry the same body.

## Quick test (owner, after the key is set)

```
curl -sS -X POST https://flowsyncdriver.com/api/dispatch/intake \
  -H "Authorization: Bearer $DISPATCH_INTAKE_KEY" -H "Content-Type: application/json" \
  -d '{"kind":"opportunity","curriRef":"test-123","rush":true,"pickupCity":"Fresno, CA","dropoffCity":"Clovis, CA","vehicle":"cargo van-sized vehicle","miles":9}'
```
Expect `{"ok":true,...,"status":"NEW"}` and a Telegram ping. Then cancel the test
load on the board with the reason "intake test".
