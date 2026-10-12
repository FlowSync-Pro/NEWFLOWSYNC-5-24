# Meta ad copy — $47 Verified listing ad set

Landing page: `/pricing` (sells the Verified listing only — AGENTS.md §D). Every claim
below matches what the listing includes (`TIERS.standard` in `src/lib/pricing.ts`). No
income promises, no refund pitch, accurate setup facts (AGENTS.md §D–E).

**Link (use as-is):**
```
https://flowsyncdriver.com/pricing?utm_source=facebook&utm_medium=paid&utm_campaign=listing-47
```

**CTA button:** Learn More

---

## Primary text — test all three

### A — Your own customers
> Tired of waiting on apps to decide what you earn?
>
> Get your own verified listing on FlowSync. Customers find you and book you directly, at the prices you set.
>
> ✅ Your verified driver profile in the directory
> ✅ Your own service menu with your own prices
> ✅ Step-by-step guides: USDOT and EIN (both free to apply for), forming your LLC, medical courier requirements
> ✅ How to sign up with Curri & Dispatch as a carrier, not a gig driver
>
> $47 one-time. No monthly fee.

### B — Become a real business
> Most delivery drivers work for an app. A few run their own business.
>
> FlowSync gives you the setup to be the second kind: a verified listing customers can book directly, your own services and prices, and the exact steps to get your USDOT, EIN and LLC done right.
>
> $47 one-time. Sedan to box truck, any vehicle.

### C — Short
> Delivery driver? Stop depending on one app.
>
> Get listed, get verified, and let customers book you directly, at your prices.
>
> $47 one-time.

---

## Headlines (40 characters or fewer)
1. Get Booked Directly — $47
2. Your Own Delivery Business Listing
3. Set Your Own Prices. Get Listed.
4. Stop Depending on One App
5. Verified Driver Listing — $47

## Descriptions
1. One-time $47. No monthly fee.
2. Any vehicle, sedan to box truck.
3. USDOT & EIN guides included.

---

## Image
Use the $47 image prompt (phone showing a verified driver profile with "Book" button,
headline "Get booked directly. No middleman.", "$47 one-time" pill). The sample name
"Marcus T." is made up; a real driver's profile needs their written OK.

---

## Rules for this ad set
1. **No money-back / refund pitch.** The 7-day refund window is stated at checkout and on
   `/refund-policy`, never used as a selling point (owner decision 2026-10-10).
2. **No promised bookings or income.** Customers *can* find and book you — never *will*;
   no "make $X". A listing is public only after the driver finishes the profile, uploads
   license + insurance, and the owner approves it.
3. **Fees.** Never "keep 100%" or "no fees": a 10% platform fee (`PLATFORM_FEE_PERCENT`)
   applies to bookings paid through FlowSync. "No monthly fee" is true.
4. **Setup facts.** USDOT and EIN are free to apply for; an LLC has a state filing fee —
   never "free LLC".
5. **Telegram community** is left out until confirmed: AGENTS.md §D lists it for the $47,
   but the site only gives the Telegram group to fleet members.
6. **Price changes** come from `TIERS.standard.price` / `listingPrice()`; update this file to match.
