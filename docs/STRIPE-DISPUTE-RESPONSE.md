# Stripe dispute playbook + response template

For the owner. A **dispute** (chargeback) is a driver asking their bank, not us, for the
money back. The bank decides from the evidence both sides send. Stripe shows a
**"Respond by"** deadline on the dispute page (usually a week or three) and charges a
dispute fee (the dispute page says how much and whether it comes back if you win).
The goal is two things: **fewer disputes**, and **winning the ones that come**.

This playbook covers the **Verified listing and Premium** charges. The Curri fleet fee
($297, or the offer-page add-on) has its own "make it back" terms (`FLEET` in
`src/lib/pricing.ts`, `/refund-policy`) — handle those case by case, not with this
template.

Nothing here is legal advice. The 7-day refund terms and this playbook are still owed an
attorney's review (AGENTS.md section E).

---

## 1. First: should you fight it at all?

Decide this before writing anything.

**Concede when:**
- They emailed support asking for a refund **inside their window** and it was missed or
  answered late. You'd lose, and rightly.
- They never got in: welcome email bounced, "paid but not on the site", stuck on the
  temporary password and nobody helped. (The Recovery page's "Paid, can't get in" tab
  exists to catch these before they become disputes.)
- The charge is clearly a mistake (duplicate, wrong cardholder).

How to concede: if it is still only a **refund request or an inquiry**, refund it from
Stripe (Payments → the payment → Refund). If the **chargeback has already been filed**,
a disputed charge can't be refunded — open the dispute and choose **Accept dispute**.

**Fight (counter the dispute) when:**
- They had access, used it or could have, and are outside their refund window — or never
  asked for a refund at all and went straight to the bank.
- The reason is "didn't authorize / don't recognize" but the name, email and phone match
  the account they created and signed into.

**Which refund window applies** — the one from **their purchase date**, not today's
(`refundWindowDaysFor()` in `src/lib/pricing.ts` is the source of truth):
- Paid **before October 11, 2026 (midnight Pacific)** → **30 days** apply, whatever
  wording they saw.
- Paid **on or after October 11, 2026** → **7 days**.

**What they were shown** depends on the Oct 10, 2026 deploy (~10am PT), not on that date:
- Before that deploy: every page and email said "30-day money-back guarantee". Quote that
  for those buyers; there was no checkbox and no "non-refundable" clause.
- After that deploy: the 7-day wording on the pages and purchase emails, and the Stripe
  checkbox (only if Stripe accepted it — see section 2).

If they're inside their window when the dispute lands, concede — don't fight.

---

## 2. Evidence you already have (and where to find it)

Stripe's dispute form has named boxes; use the ones below and leave the rest blank.

| Stripe evidence box | What to put | Where it is |
|---|---|---|
| **Customer name / email** | The name and email on their FlowSync account | Stripe payment page (customer details); Admin → Drivers → their card (only if they finished setup) |
| **Customer IP address** | Stripe captures it at Checkout | Stripe → the payment page |
| **Product description** | The WHAT WAS PURCHASED block from section 3 | — |
| **Service date** | The payment date — account and guide access start then; the listing goes live after approval | Stripe payment page (the admin screens don't show payment dates) |
| **Refund policy** (file) | Print `https://flowsyncdriver.com/refund-policy` to PDF | The live page |
| **Refund policy disclosure** | The REFUND TERMS block from section 3 (where and how the terms were shown) | — |
| **Cancellation policy** | Same as the refund policy (a one-time fee, not a subscription) | — |
| **Access activity log** | The dated list under "Proof they received the service" below | Stripe, Resend, the database |
| **Customer communication** | Screenshots of any emails/texts with them — especially anything after their window closed, or none at all | Gmail, your phone, Resend |
| **Receipt** | Their purchase email (subjects below), and Stripe's own receipt if enabled | Resend → Emails (search their address); Stripe payment page |
| **Additional (uncategorized) text** | The narrative from section 3 | — |

**Proof they agreed to the terms**
- **The Stripe checkbox** (after the Oct 10, 2026 deploy; listing and both Premium
  checkouts): a required box reading *"I agree that refunds are only available if I
  request them within 7 days of purchase, by emailing support. After 7 days the fee is
  non-refundable."* Stripe records the acceptance on the Checkout Session
  (`consent.terms_of_service = accepted`). **Never assume it was there.** Check that
  purchase's Checkout Session (the payment page in Stripe links to it; or the CLI:
  `stripe checkout sessions retrieve cs_…`). If `consent` is empty, Stripe dropped the box
  — it only appears when Stripe → Settings → Public details has the Terms of Service URL
  set to `https://flowsyncdriver.com/terms`; Vercel logs then show
  `[checkout] Stripe rejected "listing/Premium refund-terms checkbox"`. Use the next lines
  instead.
- **The pages** (after the Oct 10 deploy): the listing's refund terms are printed on
  `/pricing` above the buy button; Premium's on the offer page (`/welcome/premium-offer`)
  and the account's upgrade prompt; both in `/terms` and `/refund-policy`. Print the live
  page to PDF.
- **The purchase email** (after the Oct 10 deploy): the listing emails end with "Refund
  terms you agreed to at checkout …"; the Premium email carries the same line from the
  Oct 10 (evening) deploy on. Subjects to search for in Resend:
  "You're in, <name> — your FlowSync login…" (new buyer), "Payment received — your
  FlowSync listing is paid for" (existing account), "You're in — FlowSync Premium
  (3 quick questions)" (Premium). Emails before Oct 10 said "Same 30-day money-back
  guarantee" — quote that wording for those buyers.
- Resend shows the email delivered (and opened, if open tracking is switched on for the
  domain in Resend and their mail client reports it).

**Proof they received the service (digital)**
The account, the setup guides, the Driver Roadmap and (Premium) the tools open the moment
payment is confirmed. The **directory listing goes live only after** the driver finishes
their profile, uploads license + insurance, and you approve them — the welcome email tells
them so. Say the same in the response, or the attached email contradicts you.

Dates the system records (most live only in the database — the Dispute evidence page
below collects them for you):
- Payment — `Payment.createdAt` (also on the Stripe payment page)
- Account created — `User.createdAt` ("joined <date>" in Admin → Newest signups while they
  are among the 12 newest)
- Profile saved (name, service, vehicle) — `DriverProfile.createdAt`
- License / insurance uploaded — `Document.uploadedAt`
- Trips or P&L entries logged — `Trip` rows (count shown on the driver's ops page)
- Roadmap check-ins — `User.roadmapData.days` ("last active N days ago" on the card once
  they're Verified)
- A later Premium purchase — a second `Payment` row (nobody upgrades a product they
  "never received")
- Listing live now — the green **Verified** badge on their card and
  `https://flowsyncdriver.com/d/<profile id>` opening (print it to PDF)

Facts that exist but have **no date**: they set their own password (= signed in):
`User.mustResetPassword` is false — the "Hasn't set a password" chip is absent in
Admin → Newest signups (12 newest only; otherwise the database). The moment the listing
was approved is not stamped either. **Not recorded at all** — never claim them: sign-in
times, guide opens, Telegram (Verified/Premium buyers aren't given a group).

Refunds you issue in Stripe are mirrored on the site (`charge.refunded` → the payment
becomes REFUNDED + an owner alert) — the evidence for a "credit not processed" dispute —
but only if that event is enabled on the webhook endpoint in Stripe.

**Shortcut: Admin → Dispute evidence** (`/admin/dispute`). Enter the customer's email from
the Stripe dispute and you get all of the above for that buyer in one block — every
payment with its refund window (and whether they're still inside it), the wording they
were shown, whether Stripe recorded the checkbox, the dated profile/upload/trip/roadmap
facts, and what isn't recorded — with a **Copy dispute evidence** button. Also linked as
"Dispute evidence" next to the email on each driver's ops page. Read-only.

---

## 3. The response template

Fill the brackets. Keep it short, factual and chronological — the bank reader has
minutes. No emotion, no opinions about the driver, no income claims. Use the amount on
the disputed charge ($17 listing before Sep 29, 2026; $47 listing; $50 Premium from the
offer page; $97 Premium from the account).

```
FlowSync Drivers (Barham Transport LLC) sells a one-time, digital service to
independent delivery drivers. The disputed charge is the one-time
[Verified listing / Premium upgrade] fee of $[17 / 47 / 50 / 97], paid on [DATE].

WHAT WAS PURCHASED
[Verified listing:] a profile in the FlowSync driver directory
(flowsyncdriver.com/find-a-driver) where customers book the driver directly, the
driver's own service menu, four written setup guides (USDOT + EIN free filing, LLC
filing, medical courier requirements, and signing up with Curri & Dispatch as a
carrier), and the Driver Roadmap action plan in their account.
[Premium:] everything in the listing plus the bidding calculator, the business P&L
tracker, every guide, the Curri course, and the Premium badge with priority
placement and a website link on their profile.
[Legacy buyers (paid $17 before Sep 29, 2026): every guide and tool was included.]
The account, guides, Roadmap [and tools] are delivered digitally and are available
the moment payment is confirmed. The directory listing goes live once the customer
completes their profile, uploads their license and insurance, and we approve it.
It is a one-time fee, not a subscription; nothing recurs.

DELIVERY AND USE
- [DATE] Payment confirmed. Account created for [NAME] at [EMAIL] (the email entered
  at checkout). Welcome email with login details delivered at [TIME] (delivery
  record attached).
- [DATE] The customer saved their profile ([service], [vehicle]). [They have since
  set their own password, which requires signing in.]
- [DATE] The customer uploaded their license and insurance. [Their listing is live at
  flowsyncdriver.com/d/[ID] (copy attached).]  OR  [The customer never completed
  their profile; that step was theirs to finish and the rest of the service was
  available throughout.]
- [DATE] [Logged N trips / checked in on the roadmap / purchased the Premium upgrade]
  — delete what doesn't apply.
The name and email on the account, and the phone given at checkout (on the Stripe
Checkout session), match the cardholder details on the charge. The IP address at
checkout is on file with Stripe.

REFUND TERMS AND HOW THEY WERE AGREED
[After the Oct 10, 2026 deploy:] Before paying, the customer was shown that refunds
are available if requested by email within 7 days of purchase and that the fee is
non-refundable after that — on the [pricing page above the buy button / Premium offer
page], at flowsyncdriver.com/terms and flowsyncdriver.com/refund-policy, and in the
purchase email sent on [DATE] (copies attached). [Only if the Checkout Session shows
consent accepted:] At Stripe Checkout the customer was required to tick a box reading
"I agree that refunds are only available if I request them within 7 days of
purchase, by emailing support. After 7 days the fee is non-refundable." Stripe
recorded this acceptance on the Checkout Session.
[Before the Oct 10, 2026 deploy:] Before paying, the customer was shown a 30-day
money-back policy — a full refund if requested by email within 30 days of purchase —
on the pricing page, at flowsyncdriver.com/refund-policy and in the purchase email
sent on [DATE] (copies attached).

REFUND REQUESTS
[Pick one]
- We received no refund request from the customer before this dispute. The first
  contact about this charge was the dispute itself, [N] days after purchase.
- The customer first asked for a refund on [DATE], [N] days after purchase, which is
  outside the [7 / 30]-day window shown to them. We replied on [DATE] explaining the
  terms (copy attached).

We ask that the dispute be resolved in our favor: the service was delivered and
available in full, the refund terms were disclosed before payment, and the request
falls outside those terms.

Support: support@flowsyncdriver.com — answered personally.
```

**Per dispute reason — what to lead with**
- *Fraudulent / unrecognized:* the matching name/email/phone, the profile and upload
  dates, the IP, and that the receipt went to their address. Mention the statement
  descriptor they'd have seen on their statement.
- *Product not received:* "delivered digitally", then the DELIVERY list with dates — and
  be exact about the listing (live, or waiting on their profile).
- *Credit not processed:* the REFUND TERMS block, the window that applied, and the dates
  of any request vs. the window. If you did refund, attach the Stripe refund.
- *Product unacceptable / not as described:* what `/pricing` listed before purchase
  (print it to PDF), that all of it was available, and the refund window they chose not
  to use.
- *Subscription cancelled:* one-time fee, no renewal, nothing to cancel.

---

## 4. Keeping the dispute rate down (the part that matters most)

Already built (Oct 10, 2026):
- Required refund-terms checkbox at Stripe Checkout for the listing and both Premium
  checkouts (7 days; the fleet has its own "make it back" box) — live only once the Terms
  of Service URL is set in Stripe (to-do 2).
- The 7-day terms on `/pricing`, the Premium offer page, `/terms`, `/refund-policy` and
  in the listing and Premium purchase emails.
- Recovery page → "Paid, can't get in" lists buyers who are locked out before they charge
  back (payments from the last 30 days); the daily job (14:00 UTC, needs `CRON_SECRET` set
  in Vercel) emails you if anyone who paid in the last two days isn't recorded on the site.
- `support@flowsyncdriver.com` in the footer of every page and as the reply-to on every
  email.

Owner to-dos (each one is a known source of disputes):
1. **Statement descriptor.** Stripe → Settings → Public details: make the descriptor
   `FLOWSYNC DRIVERS` with the support phone or site in the short descriptor. "I don't
   recognize this charge" is the #1 dispute reason. Confirm the support email there is
   `support@flowsyncdriver.com` too.
2. **Terms of Service URL** in the same Stripe settings → `https://flowsyncdriver.com/terms`,
   then buy a $47 listing yourself (refund it after) and confirm the checkbox appears.
3. **Stripe receipts on:** Stripe → Settings → Emails → "Successful payments". A second
   receipt, from Stripe itself, with the descriptor on it.
4. **Enable `charge.refunded`** on the webhook endpoint (Stripe → Developers → Webhooks)
   so refunds you issue are recorded on the site.
5. **Answer every refund email within 24 hours** — even a "got it, looking now". Silence
   is what sends people to their bank. Inside the window: refund promptly, no questions.
   Outside it: reply with the terms, kindly, and offer help getting value from what they
   bought.
6. **Concede anything inside the window** rather than fight it. A refund costs the fee
   you'd return; a lost dispute costs the fee, the dispute fee, and a mark on your
   dispute rate.
7. **Check Resend for bounced welcome emails** after each sale. The owner alert only
   fires when the email couldn't be sent at all — a bounce after sending shows up only in
   Resend. A buyer who never got their login is a dispute waiting to happen.
8. Keep the Meta ads honest and current — ads still promising a "30-day money-back"
   create exactly the expectation that ends in a dispute.
9. Have an attorney read `/refund-policy`, `/terms` and this template once.
