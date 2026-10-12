# Meta ad copy — $197 small-vehicle fleet ad set

Landing page: `/curri-fleet/small-vehicles` (`FLEET_SMALL` in `src/lib/pricing.ts`). Ad-only,
noindex. Every claim below matches that page — keep it that way: no income promises
(AGENTS.md §E), no fake urgency, prices from `src/lib/pricing.ts`.

**Link (use as-is):**
```
https://flowsyncdriver.com/curri-fleet/small-vehicles?utm_source=facebook&utm_medium=paid&utm_campaign=fleet-small
```

**CTA button:** Learn More

---

## Primary text — test all three

### A — Direct
> Drive a car, SUV, minivan, cargo van or pickup? Get delivery loads sent straight to your phone.
>
> Join our Curri carrier fleet: offers come to you with the pay shown up front. Tap Accept or Pass. You run the ones you want, paid every Friday.
>
> ✅ $197 one-time, no monthly fee
> ✅ We bid the loads for you
> ✅ Make your $197 back in your first 60 days, or I refund all of it
>
> Up to 10 new drivers a month. I activate every one myself.
>
> Independent carrier. Not affiliated with Curri. No guarantee of load volume or earnings.

### B — Tired of waiting
> Stuck waiting for a gig app to send you something worth taking?
>
> On our carrier account, we bid the loads instead of taking the listed price. When a load fits your vehicle, the offer comes to your phone with your pay shown up front. Accept or pass. Nothing is forced.
>
> Cars, SUVs, minivans, cargo vans and pickups welcome.
>
> $197 one-time. Paid every Friday. 15% dispatching fee only on loads we bring you.
>
> Make your $197 back in your first 60 days or I refund all of it. No questions asked.
>
> Independent carrier. Not affiliated with Curri. Loads vary by area and vehicle.

### C — Guarantee first
> Make your $197 back in your first 60 days, or I refund all of it.
>
> That's the deal for joining my Curri delivery fleet. Drive a car, SUV, minivan, cargo van or pickup? I bid the loads, you run the ones you want, paid every Friday.
>
> Not activated yet? Fully refundable anytime.
>
> Spots are limited to 10 new drivers a month.
>
> Independent carrier. Not affiliated with Curri. No guarantee of load volume or earnings.

---

## Headlines (40 characters or fewer)
1. Loads Sent to Your Phone — $197
2. Your Car Can Run Curri Loads
3. Make Your $197 Back or It's Free
4. Paid Every Friday. You Pick the Loads.
5. Car, SUV, Van or Pickup? Join Us

## Descriptions
1. One-time $197. No monthly fee.
2. Offers match your vehicle.
3. Fully refundable before activation.

---

## Creative ideas
- **Phone mockup** of a real Telegram offer (pickup, drop-off, miles, pay, Accept / Pass).
  Caption: "This is what a load offer looks like."
- **Owner on camera, 15–20s:** "Got a car, SUV or van? I run a Curri carrier account. I bid the
  loads and send them to drivers like you. $197 to join, and if you don't make it back in
  60 days, I refund it."
- **Vehicle lineup:** sedan, SUV, minivan, cargo van, pickup. "All of these can run loads."
- **Avoid:** cash piles, "make $X a week", countdown timers, box-truck photos (wrong buyer —
  box trucks are the $297 page).

---

## Rules for this ad set
1. **Special ad category.** Meta may treat driver recruiting as **Employment**. If an ad is
   rejected, re-submit under that category: no age/gender/ZIP targeting — use interests
   (delivery driving, gig work, Uber / DoorDash / Spark drivers) and broad locations.
2. **The Curri name.** Keep "Not affiliated with Curri" in every primary text. If an ad is
   flagged for the brand name, use "delivery" in the headline and keep "Curri" in the body.
3. **No $100.45 → $300 story here.** That was a pallet load that needed a van or truck;
   showing it to car drivers sets the wrong expectation.
4. **The 10-a-month line** stays only while the owner really holds to `FLEET.monthlyCap`.
   Otherwise remove it (fake scarcity).
5. **Price changes** come from `FLEET_SMALL.price`; update this file to match.
