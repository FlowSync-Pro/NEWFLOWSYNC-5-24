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
