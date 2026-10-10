# Stripe dispute playbook + response template

For the owner. A **dispute** (chargeback) is a driver asking their bank, not us, for
the money back. The bank decides, from the evidence both sides send. Stripe gives
you a deadline (shown on the dispute page — usually one to three weeks) and charges a
dispute fee whatever the outcome, so the goal is two things: **fewer disputes**, and
**winning the ones that come**.

Nothing here is legal advice. The 7-day refund terms and this playbook are still owed
an attorney's review (AGENTS.md section E).

---

## 1. First: should you fight it at all?

Decide this before writing anything. Open the driver's card (Admin → Drivers, or
`/admin?driver=…` from the Recovery page) and Stripe → Payments → the payment.

**Refund instead of fighting when:**
- They emailed support asking for a refund **inside their window** and it was missed or
  answered late. You'd lose, and rightly. Refund it from Stripe (Payments → the
  payment → Refund) — a refund closes the matter cleanly.
- They never got in: welcome email bounced, "paid but not on the site", stuck on the
  temporary password and nobody helped. (The Recovery page's "Paid, can't get in" tab
  exists to catch these before they become disputes.)
- The charge is clearly a mistake (duplicate, wrong card holder).

**Fight (counter the dispute) when:**
- They had access, used it or could have, and are outside their refund window — or
  never asked for a refund at all and went straight to the bank.
- Reason is "didn't authorize / don't recognize" but the name, email and phone match
  the account they created and signed into.

The refund window that applies is the one from **their purchase date**, not today's:
- Paid **before October 11, 2026** → 30-day window (and the checkout page promised a
  "30-day money-back guarantee"). Only cite the 30 days for them.
- Paid **on or after October 11, 2026** → 7-day window, ticked at checkout.
  (`refundWindowDaysFor()` in `src/lib/pricing.ts` is the source of truth.)

If they're inside the window when the dispute lands, refund — don't fight.

---

## 2. Evidence you already have (and where to find it)

Stripe's dispute form has named boxes; use the ones below and leave the rest blank.

| Stripe evidence box | What to put | Where it is |
|---|---|---|
| **Customer name / email** | The name and email on their FlowSync account | Admin → Drivers → their card |
| **Customer IP address** | Stripe captures it at Checkout | Stripe → the payment page (Checkout / payment details) |
| **Product description** | Paste from section 4 (what the fee buys, delivered instantly) | — |
| **Service date** | The payment date — access is granted the moment Stripe confirms payment | Stripe payment page; the driver's card |
| **Refund policy** (file) | Print `https://flowsyncdriver.com/refund-policy` to PDF | The live page |
| **Refund policy disclosure** | How it was shown: on the pricing / checkout page before payment, in the required checkbox at Stripe Checkout (on/after Oct 11, 2026), and on the receipt email | Section 4 text |
| **Cancellation policy** | Same as refund policy (it's a one-time fee, not a subscription) | — |
| **Access activity log** | Dates that prove they used the account (section 3) | Admin + database facts |
| **Customer communication** | Screenshots of any emails/texts with them — especially anything after their window closed, or no refund request at all | Gmail, your phone, Resend |
| **Receipt** | The purchase-confirmation / welcome email, and Stripe's own receipt if enabled | Resend → Emails (search their address); Stripe payment page |
| **Additional (uncategorized) text** | The narrative from section 4 | — |

**Proof they agreed to the terms**
- On/after Oct 11, 2026: the Stripe Checkout page required a ticked box reading
  *"I agree that refunds are only available if I request them within 7 days of
  purchase, by emailing support. After 7 days the fee is non-refundable."*
  Stripe records the acceptance on the Checkout Session (`consent.terms_of_service =
  accepted`). Find it on the payment's page in Stripe (Checkout session details) or
  from the CLI: `stripe checkout sessions retrieve cs_…`. **This box only appears if
  Stripe → Settings → Public details has the Terms of Service URL set to
  `https://flowsyncdriver.com/terms` — check the live checkout once.** If it was
  missing on their purchase, don't claim it; use the next two lines instead.
- Every buyer: the refund terms were printed on the checkout page itself, on
  `/pricing`, `/terms` and `/refund-policy`, and repeated in the purchase email
  ("Refund terms you agreed to at checkout …").
- The welcome / "Payment received" email went to the address they typed at checkout;
  Resend shows delivered (and opened, when their mail client reports it).

**Proof they received the service (digital, instant)**
Pick every one that's true for this driver — dates are what the bank wants:
- Account created on the payment date (the welcome email carried their login).
- They **set their own password** (= signed in): the card no longer says "temporary
  password" / the Recovery page's "stuck" tab doesn't list them.
- Profile saved (name, service, vehicle) — `DriverProfile.createdAt`.
- Listing went live in the directory — "Listed" on their card (`listedAt`); link
  `https://flowsyncdriver.com/d/<their id>`.
- Trips / P&L entries logged, documents uploaded, roadmap check-ins ("last active N
  days ago" on the card), guides opened, Telegram joined, Premium bought later (nobody
  upgrades a product they "never received").
- Any email/text where they discuss using it.

If you'd like this gathered for you: a "Copy dispute evidence" button on the driver's
admin page that assembles these dates is a small, safe follow-up task — say the word.

---

## 3. The response template

Fill the brackets. Keep it short, factual and chronological — the bank reader has
minutes. No emotion, no opinions about the driver, no income claims.

```
FlowSync Drivers (Barham Transport LLC) sells a one-time, digital service to
independent delivery drivers. The disputed charge is the one-time
[Verified listing / Premium upgrade] fee of $[47 / 97], paid on [DATE].

WHAT WAS PURCHASED
[Verified listing:] a listed profile in the FlowSync driver directory
(flowsyncdriver.com/find-a-driver) where customers book the driver directly, plus
the driver's own service menu, four written setup guides (USDOT, EIN, LLC, medical
courier), the Driver Roadmap and access to the driver community.
[Premium:] everything in the listing plus the bidding calculator, the business P&L
tracker, every guide and the Curri course.
Everything is delivered digitally and is available the moment payment is confirmed.
It is a one-time fee, not a subscription; nothing recurs.

DELIVERY AND USE
- [DATE] Payment confirmed. Account created for [NAME] at [EMAIL] (the email entered
  at checkout). Welcome email with login details delivered at [TIME] (delivery
  record attached).
- [DATE] The customer signed in and set their own password.
- [DATE] The customer completed their profile ([service], [vehicle]).
- [DATE] The customer's listing went live at flowsyncdriver.com/d/[ID].
- [DATE] [Logged N trips / uploaded documents / checked in on the roadmap /
  purchased the Premium upgrade / joined Telegram] — delete what doesn't apply.
The name, email and phone on the account match the cardholder details on the
charge. The IP address at checkout is on file with Stripe.

REFUND TERMS AND HOW THEY WERE AGREED
Before paying, the customer was shown on the checkout page that refunds are
available if requested by email within [7 / 30] days of purchase and that the fee is
non-refundable after that. [On/after Oct 11, 2026:] At Stripe Checkout the customer
was required to tick a box reading "I agree that refunds are only available if I
request them within 7 days of purchase, by emailing support. After 7 days the fee is
non-refundable." Stripe recorded this acceptance on the Checkout Session. The same
terms are in the purchase email sent to the customer on [DATE] and at
flowsyncdriver.com/refund-policy and /terms (copies attached).

REFUND REQUESTS
[Pick one]
- We received no refund request from the customer before this dispute. The first
  contact about this charge was the dispute itself, [N] days after purchase.
- The customer first asked for a refund on [DATE], [N] days after purchase, which is
  outside the [7 / 30]-day window they agreed to. We replied on [DATE] explaining
  the terms (copy attached).

We ask that the dispute be resolved in our favor: the service was delivered in full
and used, the refund terms were disclosed and agreed to before payment, and the
request falls outside those terms.

Support: support@flowsyncdriver.com — answered personally, usually the same day.
```

**Per dispute reason — what to lead with**
- *Fraudulent / unrecognized:* the matching name/email/phone, sign-in and profile
  dates, the IP, and that the receipt went to their address. Mention the statement
  descriptor they'd have seen on their statement.
- *Product not received:* "delivered digitally and instantly", then the DELIVERY list
  with dates and the live listing URL.
- *Credit not processed:* the REFUND TERMS block, the window that applied, and the
  dates of any request vs. the window.
- *Product unacceptable / not as described:* what the pricing page listed before
  purchase (print `/pricing` to PDF), that all of it was available, and the refund
  window they chose not to use.
- *Subscription cancelled:* one-time fee, no renewal, nothing to cancel.

---

## 4. Keeping the dispute rate down (the part that matters most)

Already built (this week):
- Required refund-terms checkbox at Stripe Checkout for the listing and Premium
  (7 days; the fleet has its own "make it back" box).
- The terms repeated on the checkout page, `/pricing`, `/terms`, `/refund-policy`
  and in the purchase email.
- Recovery page → "Paid, can't get in" lists buyers who are locked out before they
  charge back; the daily job emails you if a Stripe payment never reached the site.
- `support@flowsyncdriver.com` on every page, email and the Stripe public profile.

Owner to-dos (each one is a known source of disputes):
1. **Statement descriptor.** Stripe → Settings → Public details: make the descriptor
   `FLOWSYNC DRIVERS` (or `FLOWSYNC*DRIVERS`) with the support phone or site in the
   short descriptor. "I don't recognize this charge" is the #1 dispute reason.
2. **Terms of Service URL** in the same Stripe settings → `https://flowsyncdriver.com/terms`,
   then buy a $47 listing yourself (refund it after) and confirm the checkbox appears.
3. **Stripe receipts on:** Stripe → Settings → Emails → "Successful payments". A
   second receipt, from Stripe itself, with the descriptor on it.
4. **Answer every refund email within 24 hours** — even a "got it, looking now".
   Silence is what sends people to their bank. Inside the window: refund the same day,
   no questions. Outside it: reply with the terms, kindly, and offer help getting
   value from what they bought.
5. **Refund rather than fight anything inside the window.** A refund costs the fee
   you'd return; a lost dispute costs the fee, the dispute fee, and a mark on your
   dispute rate.
6. **Check Resend for bounced welcome emails** after each sale (or watch the owner
   alert). A buyer who never got their login is a dispute waiting to happen.
7. Keep the Meta ads honest and current — ads still promising a "30-day money-back"
   create exactly the expectation that ends in a dispute.
8. Have an attorney read `/refund-policy`, `/terms` and this template once.
