# Meta ad copy library — FlowSync Drivers

Paste-ready copy for Meta (Facebook + Instagram) ads. Every price, feature and
claim below matches the live site on 2026-10-03 (`src/lib/pricing.ts`). If a
price or feature changes on the site, update this file the same day — an ad that
says one price while checkout charges another is the fastest way to a refund
and a Meta complaint.

Compliance comes first (AGENTS.md §D/§E, Meta's advertising policies). Read the
rules once; then copy from the sections below.

---

## 0. Rules — read before you paste anything

**Never say (Meta rejects it, our rules forbid it, and it's not true):**
- Any earnings number or promise: "earn $X", "$X a week", "double your income",
  "quit your job", "make a killing", "guaranteed loads", "unlimited loads".
- "Free LLC" — an LLC has a small state filing fee. DOT and EIN ARE free to apply
  for; say that, and only that.
- "Immediate activation" without the condition. Activation is manual (usually
  same day once your details arrive) and load volume depends on your market.
- Fake urgency: no countdowns, "only 3 spots left", "price goes up tonight"
  unless it's a real, dated change on the site.
- The offer prices ($50 Premium, $150 / $200 fleet add-on). Those exist ONLY on
  the two post-checkout offer pages. Ads say $47, $97 and $297.
- "We're not a delivery company or a load board" — banned phrasing. Say what we
  ARE: we help drivers remove the middleman and build their own book of business.
- Anything about a driver "will" get, land or earn.

**Always:**
- The bid example ($100.45 listed / $145 gig driver / $300 our bid) is real — keep
  **"one load, not a promise"** next to it every time.
- Quiz numbers are **bids we placed**, before expenses, not what any driver was
  paid. "A snapshot, not a promise."
- Verified listing: **$47 one-time**, **30-day money-back guarantee, no questions
  asked**.
- Fleet: **$297 one-time**, **15% dispatching fee on loads, paid every Friday**
  (20% for a payout in 1–2 business days), no monthly fee, no insurance charge,
  **fully refundable until you're activated on our carrier account**, and since
  2026-10-09 the guarantee: **"Make your $297 back in your first 60 days or we refund
  it in full. No questions asked."** (full terms on `/refund-policy`; it promises the
  refund, never earnings). Older ad lines that only say "refundable until you're
  activated" are still true.
- Driver count: check `/find-a-driver` before using a number. It was 230+ on
  2026-10-03. "230+" is safe for a few weeks; "hundreds of" never goes stale.

**Fleet ads = Employment special ad category.** "We send you loads, paid every
Friday" reads as a work opportunity to Meta. Pick **Special Ad Category →
Employment** when you create the fleet campaign, or expect rejections. It limits
age/zip targeting; that's fine.

**Landing pages and tracking.** Add `?utm_source=meta&utm_campaign=<name>` to
the URL so you can tell campaigns apart in the site's referrers. Never put a
name, phone or email in a URL.

| Campaign | Objective → optimise for | Landing page |
| --- | --- | --- |
| A — Verified listing | Sales → **Purchase** | `https://flowsyncdriver.com/pricing?utm_source=meta&utm_campaign=verified` |
| B — Load-rate quiz | Leads → **Lead** | `https://flowsyncdriver.com/tools/earnings?utm_source=meta&utm_campaign=quiz` |
| C — Fleet (Employment category) | Sales → **Purchase** | `https://flowsyncdriver.com/?utm_source=meta&utm_campaign=fleet#fleet` |
| R — Retargeting (visited, no purchase) | Sales → **Purchase** | `https://flowsyncdriver.com/pricing?utm_source=meta&utm_campaign=retarget` |

---

## 1. Campaign A — Verified listing ($47). Primary texts

Meta shows the first ~125 characters before "See more", so the hook is line 1.

### A1 — The middleman
> You're paying 20–40% of every delivery to an app that didn't drive it.
>
> FlowSync lists you in a driver directory where customers book YOU directly and you set the price. $47 one-time. No monthly fee.
>
> You also get the setup guides the filing services charge $300+ for: your USDOT number (free to apply for), your EIN (free to apply for), how to file an LLC, and how to sign up with Curri and Dispatch as a carrier — not a gig driver.
>
> 30-day money-back guarantee, no questions asked.

### A2 — The directory
> 230+ independent drivers are already listed. Customers search by service and city, see the driver's own menu and prices, and book direct.
>
> Get your listing for $47 one-time. Includes your own service menu with custom pricing and the carrier setup guides (USDOT, EIN, LLC, Curri & Dispatch).
>
> Not for you? Full refund within 30 days, no questions asked.

### A3 — The setup myth
> Someone online will charge you $300 to "get your DOT number". It's free to apply for. So is your EIN. An LLC is a small state filing fee and a form.
>
> Our $47 Verified listing walks you through all three, step by step, plus how to register with Curri and Dispatch as a carrier instead of a gig driver — and why that one choice matters.
>
> You also get listed in a directory where customers book you directly. 30-day money-back guarantee.

### A4 — The 7-day plan
> New drivers get a 7-day plan with the listing: finish your profile, set your prices, send your link to 10 people, post in 2 local groups, start your carrier setup, follow up, ask for your first review.
>
> The goal is one job that covers the $47. It's a goal, not a promise — your market and your effort decide the rest. The 30-day money-back guarantee applies either way.
>
> Verified listing: $47 one-time.

### A5 — Own the customer (short)
> Build your own book of customers instead of renting someone else's app.
>
> Directory listing, your own service menu, your own prices, direct bookings — $47 one-time, 30-day money-back guarantee.

---

## 2. Campaign B — Load-rate quiz (free tool). Primary texts

These sell the free tool only. The email follow-ups (days 2, 5, 10) do the rest.

### B1 — What are loads going for?
> What are loads actually going for with your vehicle?
>
> Pick pickup, sprinter, cargo van or box truck and see the bids we placed on real Curri loads over two days — before expenses. A snapshot, not a promise.
>
> Free, no account needed. Email it to yourself if you want to keep it.

### B2 — Bids, not guesses
> We placed 119 bids on Curri loads in two days from our own carrier account. We put the numbers in a free tool so you can see the range for your vehicle.
>
> They're bids, not payouts, and not what any driver was paid. But they're real, and they're not a guess.
>
> Pick your vehicle →

### B3 — Car drivers (honest version)
> Got a car, not a van? The Curri numbers won't help you — those loads are for pickups, vans and trucks. Our free tool tells you that straight and shows you the path that fits a car: your own direct customers.
>
> Pick your vehicle and see where you stand.

---

## 3. Campaign C — Curri fleet invite ($297). Employment category. Primary texts

### C1 — Carrier, not gig driver
> We bid loads from a real carrier account. One load was listed at $100.45. A gig driver would have run it for $145. We bid $300 and won it. One load, not a promise.
>
> Join our Curri fleet: you're added to the Barham Transport carrier account, we bid the loads, you run the ones you want, and you're paid every Friday. 15% dispatching fee on loads, no monthly fee, no insurance charge.
>
> $297 one-time. Fully refundable until you're activated on the carrier account. Activation is usually same day once your details arrive; how many loads you see depends on your market.

### C2 — No-number version (use if C1 gets flagged)
> Running loads as a gig driver means taking whatever the app offers. Running them under a carrier account means someone bids for you.
>
> Our fleet invite adds you to the Barham Transport carrier account on Curri. We bid, you drive the loads you choose, paid every Friday with a 15% dispatching fee. No monthly fee, no insurance charge. Includes every Premium tool: bidding calculator, P&L tracker, the Curri mastermind course.
>
> $297 one-time, fully refundable until you're activated. Load volume depends on your market.

---

## 4. Retargeting (visited, didn't buy). Primary texts

### R1
> Still thinking about the listing? Here's the deal in one line: $47 one-time, customers book you direct, you set the price, and if it's not for you, full refund within 30 days — no questions asked.

### R2
> You looked at the Verified listing but didn't finish. Fair. Two things people ask: Is there a monthly fee? No. What if it doesn't work for me? 30-day money-back, no questions asked. $47 one-time.

---

## 5. Headlines (≤ 40 characters)

| # | Headline | Use with |
| --- | --- | --- |
| H1 | Get booked direct. $47 one-time. | A1, A2, A5, R1 |
| H2 | Your DOT and EIN are free to file | A3 |
| H3 | 230+ drivers listed. Join them. | A2 |
| H4 | Carrier setup + listing, $47 | A1, A3 |
| H5 | 30-day money-back, no questions | A4, R2 |
| H6 | See what loads are going for | B1, B2, B3 |
| H7 | Real bids, free tool | B2 |
| H8 | Join our Curri fleet — $297 | C1, C2 |
| H9 | Paid every Friday. 15% fee. | C1, C2 |
| H10 | Build your own book of customers | A5, R1 |

## 6. Descriptions (≤ 30 characters)

- Set your own prices.
- No monthly fee.
- Full refund within 30 days.
- Free. No account needed.
- Refundable until activated.

## 7. Call-to-action buttons

- A, R: **Sign Up** or **Get Offer**
- B: **Learn More**
- C: **Apply Now** (Employment category) or **Sign Up**

---

## 8. Reels / video hooks (first 3 seconds, you on camera)

1. "One load. Listed at a hundred bucks. A gig driver would've done it for 145. We bid 300 and won." (show the email; say "one load, not a promise")
2. "Stop paying people to file a free form." (DOT / EIN)
3. "230 drivers. Zero middlemen." (screen-record `/find-a-driver`)
4. "What's a sprinter load going for right now? I'll show you our actual bids." (screen-record the quiz; say "bids, not pay")
5. "Day 1 of the First-$47 Challenge. Here's what the plan looks like." (screen-record the dashboard card; say "a goal, not a promise")

---

## 9. Testing plan

- Launch A with A1, A2, A3 + H1/H2/H3. B with B1, B2 + H6. One ad set each,
  broad audience, US, 21–60.
- Don't touch anything for 7 days.
- After $100 on an ad: cost per Purchase over $60 → pause; under $35 → raise
  the ad set budget 20% every 3 days.
- Rotate in A4, A5 and the Reels after week 2. Add R1/R2 as a retargeting ad
  set (visitors 30 days, exclude Purchase).
- Start C only after A has 20+ purchases, in the Employment category, with C1;
  switch to C2 if C1 is rejected.
- Watch `/admin` (newest signups) and `/admin/recovery` (abandoned checkouts —
  text them the same day).
