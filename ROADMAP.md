# FlowSync — Roadmap & To-Do

The "super-hero offer": teach drivers to build a real delivery business, let them deal
**directly** with customers (FlowSync takes only **5%**, driver sets the quote), and give
them tools + education that the app-store gig apps never will. Merges FlowSync's
direct-booking model with Dumpling.us-style "own your business" empowerment.

Domain: **flowsyncdriver.com** (separate from flowsyncdrivers.com).

---

## ✅ Done
- Marketing site mockup (home, services, drivers, how-it-works) — dark/green/white.
- Interactive driver signup → service-matched profile (localStorage mockup).
- Domain config, sitemap, robots, OG/Twitter images, favicon, JSON-LD, www→apex redirect.

## Phase 1 — Frontend / mockup (no backend required)
- [x] **Offer & pricing page** with order bumps (`/pricing`):
  - $17 one-time driver listing (core)
  - +$27 bump — "Step-by-step guide: get your DOT & EIN for free"
  - +$47 bump — Profit & Loss tracker tool
- [x] **Quote calculator** (`/calculator`) — distance/time/costs → fair quote; shows
  "keep 95% vs. lose 20–40% on other apps" math + monthly projection.
- [x] **Marketing playbook + business foundation guides** (`/grow`, `/grow/[slug]`) —
  9 guides (DOT/EIN, LLC, insurance, mistakes, Nextdoor/Yelp/Thumbtack/Craigslist/Indeed),
  each with Article JSON-LD and CTAs.
- [x] **Gamified dashboard** (`/dashboard`) — monthly goal + progress ring, streaks, tiers
  (Rookie→Legend), weekly chart, log-a-job, and unlockable awards.
- [x] **Customer "book a driver" directory** (`/find-a-driver`) — search + service filters,
  request-a-quote modal; shows your own profile if you've created one.
- [x] **P&L tracker tool** (`/tools/profit-loss`) — income/expense logging, period totals
  (7-day/month/all), net profit & margin, category breakdown, and CSV export.
- [x] **SEO deepening** — per-service landing pages (`/services/[id]`) with Service + Breadcrumb
  + FAQ JSON-LD; FAQPage on drivers; Product/Offer on pricing; Article+Breadcrumb on guides;
  ItemList on services; canonicals; web manifest; theme color.
- [x] **Editable account + document upload/verification UI** (`/account`) — edit all profile
  fields + service details, upload 5 docs (image preview, downscaled to localStorage),
  verification status, and a conditional Verified badge on the public profile.

## Phase 2 — Real product (needs infrastructure + secrets + decisions)
- [ ] Database (drivers, customers, profiles, bookings, payments).
- [x] Auth + accounts — **live & tested against Postgres**: register/sign-in/sign-out,
      `/account` auth-gated and reading/writing the DB (profile fields + document uploads,
      auto-verified badge). Initial Prisma migration committed.
- [x] Public profile + directory from DB — `/profile` (owner, auth-gated), `/d/[id]`
      (public, SEO metadata + request-a-quote), and `/find-a-driver` all read from Postgres.
      Demo drivers seeded (`prisma/seed.mjs`). Optional later: Auth.js swap.
- [x] **Vercel Blob document storage** — `src/lib/storage.ts` uploads documents to Vercel
      Blob when `BLOB_READ_WRITE_TOKEN` is set, with an inline fallback for local dev.
- [x] **Dynamic sitemap** — listed driver profiles (`/d/[id]`) are added to `sitemap.xml`
      (build-safe; revalidates hourly). Customer booking **receipt email** added.
- [x] **Stripe Checkout** for $17 + bumps — `/api/checkout` (hosted Checkout Session) and
      `/api/stripe/webhook` (signature-verified; on `checkout.session.completed` creates the
      driver account + records a PAID Payment). Pricing page wired with graceful demo
      fallback when no keys. Verified locally with signed events (create, replay/idempotent,
      bad-signature reject). Needs: real Stripe keys + the temp-password email (Resend, next).
- [x] **Resend** transactional email — branded welcome/temp-password email sent from the
      Stripe webhook, and a welcome email on self-service signup. Lazy + graceful (logged
      no-op without keys; send failures never break the flow). Needs a `RESEND_API_KEY` +
      verified `RESEND_FROM_EMAIL` domain. Later: receipts + booking alerts.
- [ ] Secure file storage for driver documents.
- [x] **Customer migration** — `scripts/migrate-stripe-customers.mjs`: reads Stripe
      customers, creates accounts (temp password, must-reset, linked stripeCustomerId), and
      emails sign-in info. **Dry-run by default**; idempotent; `--apply` to perform.
      Profile-less accounts complete a profile on first sign-in (`/account/setup`). Verified
      in `--demo` mode (dry-run/apply/idempotent/gate). Real run needs live keys + sign-off.
- [x] **Admin / document-verification view** (`/admin`) — gated by the `ADMIN_EMAILS` env
      var; review uploaded license/insurance/photos and Approve/Reject drivers. Verification
      is now admin-controlled (single source of truth) — uploading docs no longer auto-verifies;
      it sets the driver to "pending review." Approving emails the driver; unverified drivers
      are hidden from the public directory and see a "pending verification" banner. Verified
      end-to-end locally.
- [x] **Premium ($97) tier** — two-tier pricing (Standard $17 / Premium $97) with Premium
      highlighted; tier set at checkout (webhook) or via admin "Upgrade to Premium" (emails the
      driver). Premium unlocks **My Services** (`/account/services`, custom service menu) —
      Standard sees an upgrade CTA — plus a Premium badge, an external website field, and a
      services/pricing + website section on the public profile. Migration `premium_tier`.
      Verified end-to-end locally (new flowsyncdriver.com only — old site untouched).

## Phase 2 plan (detail)

**Recommended stack (keeps it Vercel-centric):** Next.js (current app) · Postgres via
Vercel Marketplace (Neon) · Prisma ORM · Auth.js (NextAuth) · Vercel Blob for document
storage · Resend for email · Stripe for payments. DB + storage are managed/billed through
Vercel; Stripe + Resend are the only outside SaaS (both already in use/requested).

**Build order**
1. **Accounts foundation** — Prisma schema (User, DriverProfile, Document, Booking),
   Auth.js setup, migrate the localStorage profile + `/account` doc upload to DB + Vercel Blob.
2. **Stripe Checkout** — $17 listing + $27/$47 bumps → Checkout Session → webhook creates the
   account, marks paid, and triggers email. 5% fee logic for future job payouts.
3. **Resend emails** — email verification link + temporary password on signup; receipts;
   booking/quote notifications.
4. **Customer migration** — import existing Stripe paying customers, create accounts, send
   sign-in info via Resend (the originally-requested blast — now safe to run with a tested
   template and explicit sign-off).
5. **Bookings loop** *(built)* — `/d/[id]` request → driver quotes on `/account/bookings`
   → customer pays at `/book/[id]/pay` (Stripe) → webhook marks PAID + records a BOOKING
   Payment (5% fee). Emails at each step. Verified end-to-end locally.

**What the owner must provide (in Vercel, not the repo)**
- Vercel Postgres (or Supabase) connection string · Vercel Blob token
- Stripe secret + publishable keys + webhook signing secret
- Resend API key + a verified sending domain (e.g., mail.flowsyncdriver.com)
- `AUTH_SECRET` for session signing

**Environment note:** live DB/Stripe/Resend calls can't run from this sandbox. Phase 2 work =
writing the code against env placeholders + setup docs; provisioning + secrets happen in the
owner's Vercel/Stripe/Resend accounts, then deploy.

## 🚧 Pending — 2026-10-09: vehicle filter on the directory + accessories + extra vehicles
Waits for the owner's merge. **RISKY deploy: one new migration**
(`20261009200000_vehicle_accessories`, ADDITIVE: one empty array column on DriverProfile,
one new empty table `DriverVehicle`; nothing dropped, renamed or rewritten — the main
vehicle stays in `vehicleType` / `vehicleMakeModel` / `vehicleYear`, so dispatch, Curri
matching, emails and the fleet page are unchanged). No env vars, no new dependency.
**Backup first** (owner, before merging): `node --env-file=.env.local
scripts/backup-driver-data.mjs` + a Neon snapshot. The backup script now includes the
new table.

Owner answers (2026-10-09): build it; VIN required only for a 2nd+ vehicle; the directory
filter matches ANY of a driver's vehicles while the card and dispatch use vehicle #1;
"Bike / scooter" stays on the profile with no directory button (those drivers show under
All only).

- `src/lib/vehicles.ts` — the single source: `VEHICLE_TYPES` (profile options),
  `DIRECTORY_VEHICLE_TYPES` (the 7 buttons, owner's order), `ACCESSORIES_BY_TYPE` (exact
  lists; Sedan / Minivan / SUV have none), `pruneAccessories` (switching vehicle drops what
  isn't on the new list), `isValidVin`, `matchesVehicleFilter`, `vehicleToShow`. Tests:
  `npm run test:vehicles` (6/6).
- **Profile editor** (`/account/edit`): accessories checklist under the main vehicle when
  its type has one; "More vehicles" section — type, make/model, year, VIN (required, "kept
  private"), accessories, Remove, "+ Add a vehicle". Saved by `saveDriverProfile`
  (`vehicleAccessories`, `vehicles` as the whole list; ids scoped to the driver's own
  profile; invalid VIN → the Save button shows the reason).
- **Public profile** (`/d/[id]`, and the driver's own `/profile` preview): accessories as
  chips under the main vehicle; extra vehicles listed below (type, make/model, year,
  accessories). The VIN is never selected on those pages.
- **Directory** (`/find-a-driver`, and the `/delivery/[service]/[city]` pages, which reuse
  the component without vehicle data): "All vehicles" + the 7 types; picking Cargo van /
  Pickup truck / Sprinter van / Box truck shows a "With" row of that vehicle's accessories
  (pick any number; a driver must have every one). Filters on the type the driver picked,
  never on make/model text. Cards show the vehicle matching the filter (else the main one),
  "+N more", and up to 3 accessory chips.
- **Verify after deploy:** `/api/health` ok; a driver with a Cargo van sees the accessories
  checklist, ticks two, saves, and they show on `/d/[id]`; add a 2nd vehicle with a VIN,
  save, and the VIN is absent from the public page's HTML (view source); on
  `/find-a-driver` pick Cargo van → the "With" row appears and the driver stays listed;
  pick an accessory they didn't tick → they drop out; "All vehicles" brings everyone back,
  including drivers with no vehicle type.

## 🚧 Pending — 2026-10-09 (fleet push day): the "make it back" fleet guarantee
Waits for the owner's merge. RISKY deploy (owner-approved 2026-10-09): changes the fleet
refund terms and the Stripe checkout terms-checkbox text. No migrations, no env vars, no new
dependency, no price change.

- **Guarantee** (owner answers 2026-10-09: 60 days, keep the two-violations exception,
  update everything): fully refundable before activation; after activation, take-home from
  fleet loads in the first 60 days under the fee paid → ask within 30 days after → full
  refund, no questions asked; a refund ends membership. `FLEET.guaranteeDays` /
  `guaranteeClaimDays` / `refundShort` / `refundWhy` / `refundCheckbox` in `lib/pricing.ts`;
  `/refund-policy`, `/terms`, fleet pages, checkout checkbox, fleet invite email, quiz lead
  emails and the abandoned-checkout email all read from them.
- **Fleet texts** (`lib/recovery.ts`, owner-picked): "Hey {name}, Nas from FlowSync. Got a
  van, box truck or pickup + trailer? Join my Curri fleet: I bid the loads, you run the ones
  you want, paid every Friday. / Make your $297 back in your first 60 days or I refund all of
  it. No questions asked. / link". Follow-up: "…If the fleet doesn't pay for itself in your
  first 60 days, I refund the $297. You can't lose." (+ "spots are full, you'd start next
  month" only when true). Recovery page shows the line breaks.
- Applies to purchases after the deploy; earlier fleet buyers agreed to the old terms (the
  owner may extend it to them). Attorney review of the guarantee wording still owed.
- **Verify after deploy:** `/refund-policy` shows the guarantee; a fleet checkout's terms
  checkbox shows the new sentence (start one and abandon it); `/admin/recovery` fleet rows
  show the new text with line breaks.

## ✅ Deployed — 2026-10-09 (fleet push day): one-time Curri fleet invite email
Merged as PR #58 and live (`/admin/fleet-invite` redirects to sign-in when signed out). No
migrations, no env vars, no new dependency. Not yet verified: the owner's first batch.

- `/admin/fleet-invite` (link on `/admin`): one email ("Want loads sent to your phone? (Curri
  fleet)") to every paid, non-refunded driver who isn't in the fleet, 40 per click — the same
  pattern as `/admin/add-city`. Goes through `sendMarketing()` (unsubscribed, refunded, admin
  and fleet members skipped; once per driver, EmailLog kind `fleet-invite-2026-10`; 48h gap).
  Bike / scooter drivers are left out (can't run Curri loads). Drivers inside the 48h gap are
  left out of the count until it passes, so they never block a batch.
- Copy: every price and term from `lib/pricing.ts` — $297, 15% / 20%, refundable until
  activated, two-violations rule, monthly cap, pay-over-time "if you're eligible", the
  $100.45 / $145 / $300 example with "one load, not a promise", not-affiliated-with-Curri
  line. CTA → `/account/curri-fleet` (sign in → Join the fleet). No offer-page prices.
- **Verify after deploy:** open `/admin/fleet-invite`, read the preview, send ONE batch, check
  one arrives (support inbox or a test driver), then send the rest.

## 📍 Checkpoint — 2026-10-09 (afternoon): recovery page + "Paid, can't get in" — verified live
Restore point: commit `1fd110f` on the default branch (merge of PR #57; deployed and
verified on the live site by the owner). No migrations, no env vars, no new dependency;
read-only plus copy. Both pieces touch Stripe-adjacent code, so both went out on the
owner's go. Rollback: the deployment before `d28737a`, which is `fd34191`.

Shipped:
- **Recovery page upgrade** (`d28737a`, owner "go both"): fleet recovery texts link
  `/curri-fleet` (real runs) and mention pay over time (Klarna/Afterpay/Affirm, "if you're
  eligible"); every sales row has its one follow-up ("last one from me on this"; the fleet
  one says "still room this month" only when this month's activations are under the cap of
  10, otherwise "first in line for next month"); new "Fleet drivers — ask for a referral"
  list with each driver's existing link and the $50 terms (read-only, never creates codes).
  The abandoned-checkout owner alert carries the new fleet text too.
- **"Paid, can't get in"** (PR #57, `356df30`, owner "go all 3" after a $47 buyer couldn't
  sign in): first tab on `/admin/recovery` — paid in Stripe but not recorded on the site
  (no Payment row for the session, `src/lib/paid-unrecorded.ts`; fix = Resend in Stripe),
  paid but still on the temporary password (Forgot-password text + link that opens their
  card on `/admin` with Reset password), and paid + signed in but never finished setup;
  name/phone come from the Stripe checkout when there's no profile. Daily safety email from
  `/api/cron/followups` (runs before the marketing gate) when a paid checkout from the last
  2 days isn't recorded. Sign-in page line: "Paid but can't get in? Tap Forgot password? …".
- **Workflow note:** the owner promoted the PR's preview to production in Vercel before
  merging. It was merged minutes later, so main matches live again. Next time: merge first
  (merging deploys); promoting an unmerged preview means the next push to main would undo it.

**Owner-side, done 2026-10-09:** `CRON_SECRET` confirmed in Vercel (Production); Anthony
texted the Forgot-password steps; the $97 Sep 30 buyer contacted; the 8 drivers who lost
documents reached out to; a Neon password reset (which one — account login or database
role — not confirmed) — live `/api/health` afterwards: database, auth, Stripe keys, Resend
and Blob all OK.

**Owner-side, still open ("later", 2026-10-09):**
- **Neon check:** every database env var in Vercel still reads "Added May 24". If the
  DATABASE role password was reset, Vercel may hold the old one and a cold start could fail:
  Redeploy, then `/api/health` must show database ok; if not, paste Neon's new pooled string
  into `DATABASE_URL` and the direct one into `DATABASE_URL_UNPOOLED` (the only two the code
  reads) and redeploy. If only the Neon LOGIN password was reset, the database password that
  appeared in an old screenshot is still the live one and still needs rotating.
- **"Needs Attention" tags** = secrets not marked Sensitive. Re-add `DISPATCH_INTAKE_KEY`
  (same value — the Fly portal bot uses it) and `BLOB_READ_WRITE_TOKEN` as Sensitive, then
  redeploy; leave the Neon-integration variables alone.
- **`OLD_STRIPE_SECRET_KEY`** (unused by the code, like the `TWILIO_*` vars): make sure only
  the current secret key is active in Stripe → Developers → API keys; delete unused vars
  whenever convenient.
- Also: first real portal load end to end; per-driver fleet
onboarding (Activated on Curri, home ZIP, Connect Telegram, /active); Stripe $1 test
transfer + balance top-up + 1099 setting; one tagged attribution purchase; attorney review
(fleet refund clause, contractor terms, earnings claims / FTC business-opportunity question).

## 📍 Checkpoint — 2026-10-09 (stage 2c): Accept / Pass on the fleet page — verified live
Restore point: commit `4736f4b` on the default branch (deployed, Ready, and the Accept
test verified on the live site by the owner).
No migrations, no env vars, no new dependency. Changes the live dispatch path, so it went
out on the owner's "push" after a two-driver test. Rollback: the previous deployment,
`e60ea51`.

Shipped (owner answers 2026-10-09, all yes): each open offer on `/account/curri-fleet` has
**✅ Accept** (asks first: "only accept loads you'll run") and **Pass**. Same first-tap-wins
path as Telegram — `answerMyOffer` checks the offer is the signed-in fleet member's, then
`respondOffer`; `announceOfferAnswer` (now shared with the Telegram button handler) sends
the owner's CLAIM NOW / place-bid / "passed" line first, tagged "(on the website)", then
confirms a page Accept to the driver on Telegram. Drivers not on Telegram can answer too.
The result shows as a notice (`?answer=<fixed code>`), in Telegram's words; driver-specific
reasons (busy, wrong vehicle) show on the offer, which stays open. Limit: the Telegram offer
message keeps its buttons after a page answer (tapping them later says "Already …").
Tested: 24/24 (incl. page-vs-Telegram races, same-driver Accept+Pass, forged / non-member /
signed-out refusals) and the earlier Telegram suite re-run clean.

**Verified live (owner, 2026-10-09):** a test load offered to a driver and accepted on the
fleet page worked end to end. (Pass on the page wasn't separately exercised live; it was
covered by the local tests.)

Still open: the live checks in the checkpoints below and everything owner-side.

## 📍 Checkpoint — 2026-10-09 (overnight): dates right everywhere
Restore point: commit `0ecbd27` on the default branch (deployed, Ready — owner confirmed;
it also carries `98f04f4`). No migrations, no env vars, no stored data changed — display
and form defaults only. `0ecbd27` was an owner-approved RISKY deploy (payout form; driver
P&L display). Rollback: the deployment before both, `3fb7790`.

Shipped:
- **Events show the Pacific day** (`98f04f4`): joined, member since, activated on Curri,
  Stripe form submitted, inspections (admin), review submitted (`ptDay` / `ptTime`).
- **Picked dates show exactly as entered** (`98f04f4`, `0ecbd27`; `calendarDay`, UTC):
  license expiry ("Expires Mar 15", not "3/14"), verified-load dates, and trip dates on the
  trip log, the driver's photo list and the admin driver page. Past trips logged on an
  evening with the old pre-fill now show the date actually saved — a day later than before,
  as the owner approved; nothing in the database changed.
- **No more "tomorrow" pre-fills**: the trip log and the free P&L tool use the driver's own
  calendar (`useDeviceToday`, `src/lib/use-device-today.ts`); the admin "add completed
  load" form and the payout form's "Delivered on" (default and max) use today in PT.
- Unchanged on purpose: the license expired/valid rule (safety: errs a few hours early).

Tested: 15/15 admin/driver date checks (Pacific browser) and 10/10 trip / P&L / payout
checks at 10:43 PM Central, when the UTC date is already tomorrow.

**Not yet verified live:** in the evening, the trip log and P&L tool date boxes show today;
a test trip saves and lists with today's date; "Delivered on" shows today (PT).

Still open: the live checks listed in the checkpoints below (driver message email, Stripe
status on the next driver to finish Stripe, the next fleet purchase's alert wording) and
everything owner-side.

## 📍 Checkpoint — 2026-10-09 (late night): driver messages also reach the owner by email
Restore point: commit `f52e225` on the default branch (deployed, Ready — owner confirmed).
No migrations and no new env vars (uses the existing Resend setup). SAFE deploy.

Shipped (owner decision 2026-10-09): every message a current fleet driver sends the
FlowSync bot that isn't a command is still relayed to the owner's Telegram AND emailed to
the support inbox + ADMIN_EMAILS (`emailOwnerDriverMessage`, `src/lib/alerts.ts`).
Subject "[FlowSync] 💬 Message from <name> (fleet driver)" — name only; the body has the
words (or what media was sent and its note), current load, phone, admin link and how to
answer (reply to the bot's copy in Telegram, or call/text). Replying to the email doesn't
reach the driver. If Telegram to the owner fails but the email goes, the driver hears
"✓ Sent to Nasser by email. If it's urgent, call or text him too." The message is never
written to the server log. Other owner alerts keep their exact wording. Tested locally
with Telegram and email stand-ins (13/13).

**Not yet verified live:** a driver (or a second Telegram account linked to a test driver)
sends the bot "test message" → it shows in the owner's Telegram AND an email
"[FlowSync] 💬 Message from …" lands in the support inbox (check spam the first time).
Rollback: the previous deployment, `dc0d05e`.

Still open: the Stripe-status check on the next driver who finishes Stripe (`031d13a`), the
next real fleet purchase's alert wording (`fcee774`), and everything owner-side below.

## 📍 Checkpoint — 2026-10-09 (night): fleet page reads the real Stripe payouts status
Restore point: commit `031d13a` on the default branch (deployed, Ready — owner confirmed).
No migrations and no new env vars. Owner-approved RISKY deploy (Stripe code path): for a
fleet member with a Stripe account whose saved flag says "not ready", `/account/curri-fleet`
now runs the same `syncConnectStatus` the Payouts page runs — updates the flag, and the
owner's one-time "finished Stripe payouts setup" alert fires when it flips. Capped at 3 s
(saved flag used on a timeout or without a Stripe key); drivers already ready, without an
account, or not in the fleet cost no Stripe call. Reads status only — moves no money.
Tested against a local Stripe stand-in (8/8).

**Not yet verified live:** the next driver who finishes Stripe and opens the fleet page
straight away should see "Payouts are set up ✓", and the owner should get the alert email.
Rollback: the previous deployment, `1efd5ce`.

Known limit (by design): if Stripe later disables a ready driver's payouts, the fleet page
keeps "set up ✓" until the Payouts page, the admin page or a payout run re-syncs; payouts
always re-check before sending.

Still open: the first real fleet purchase's alert email (wording from `fcee774`), and
everything owner-side in the checkpoints below.


## 📍 Checkpoint — 2026-10-09 (evening): owner alert wording for new fleet members
Restore point: commit `fcee774` on the default branch (deployed, Ready — owner confirmed).
No migrations and no new env vars. Owner-approved RISKY-by-file deploy (it lives in the
Stripe webhook, `src/app/api/stripe/webhook/route.ts`), but text only: the "🚚 New Curri
fleet member" alert now says to add them on the carrier account and mark "Activated on
Curri" once they send their city and vehicle, that they set up Stripe payouts themselves
(Payouts page), "Send Stripe setup link" on the admin page if they get stuck — plus a link
to that driver's admin page. No change to what the webhook does.

**Not yet verified:** the new wording appears only on the next real fleet purchase — check
that alert email and tap the admin link. No test purchase needed.

Everything else is unchanged from the checkpoints below (open owner-side items included).

## 📍 Checkpoint — 2026-10-09 (later): fleet sales pages — trust, real proof, SEO, verified live
Restore point: commit `702e52b` on the default branch (deployed, Ready, verified on the live
site by the owner). Copy, images and SEO only — no migrations, no env vars, no checkout,
payment or auth change since the previous checkpoint.

Shipped and verified:
- **Fleet pages explain dispatch before signup** (`c12a64a`,
  `src/components/FleetDispatchExplainer.tsx`): a sample load offer in the real Telegram
  format (labelled as a sample), the four things drivers control, the five steps from
  joining to the first Friday payout, nine plain-answer FAQs, and "Nothing to lose before
  you're activated" next to the real refund rule — on `/curri-fleet`; the homepage fleet
  section shows the sample offer and links there.
- **SEO** (`c12a64a`): `/curri-fleet` added to the sitemap (it was missing); Service (with
  the $297 offer), FAQPage and BreadcrumbList structured data; title "Join the Curri Fleet —
  Loads Dispatched to Your Phone" and a matching description.
- **Income figures softened** (`89874c0`): homepage stat "$40+/hr Top category" → "Yours —
  The rates and the customers"; drivers page "$40–75/hr earning range" → "Your rate — you
  quote every job, we suggest a starting price for each service". Service cards keep their
  "Suggested rate" ranges.
- **Real loads from the fleet** (`702e52b`, images in `public/proof/`): the owner's own
  screenshots — the Sept 21 Chippewa Falls assignment and the driver's reply, the matching
  delivery record (Chippewa Falls → Grantsburg, WI; Curri paid $107.53; driver's share at the
  standard fee computed from `lib/pricing`), and a multi-stop run. Driver Elliot shown by
  first name with his permission; last name, customer photos and the Curri screen behind
  the pop-up blurred; image metadata stripped; no Apple Cash payment shown (the site says
  payouts go through Stripe). "Real loads, not a promise" and the not-affiliated-with-Curri
  line sit under the images.

Urgency stays honest everywhere: the real monthly activation cap and "first Accept gets the
load" — no countdown timers, spot counters or invented scarcity (AGENTS.md section E).

Rules for adding more proof (screenshots, videos, quotes): the driver's OK first; first
name only; blur customer names, addresses, labels and photos; show no payment method other
than Stripe; captions state only what the screenshot shows; keep "not a promise" beside any
dollar figure. Re-run `make-proof`-style cropping (sharp is already installed via Next.js).

Known, not done: nothing open from this checkpoint. (Fixed after it, owner-approved: the
new-fleet-member alert email no longer says "send their Stripe setup link"; and the fleet
page now asks Stripe for the real payouts status when the saved flag says "not ready" —
capped at 3 s, no call for drivers already ready. A driver whose payouts Stripe later
disables still shows "set up ✓" until the Payouts page, the admin page or a payout run
re-syncs; payouts themselves always re-check before sending.)

Open, owner-side: Search Console "Request indexing" for `/curri-fleet`; optionally Apple
Pay / Google Pay in Stripe → Settings → Payment methods; more proof media (delivery-detail
screens with payouts, 10–20 s loading videos, a permitted driver quote); **attorney: real
payout figures on sales pages are earnings claims — ask whether the fleet counts as a
"business opportunity" under FTC rules**, alongside the fleet refund clause and contractor
terms. Plus everything still open from the checkpoint below.

## 📍 Checkpoint — 2026-10-09: driver view of offers + dispatch fixes, verified live
Restore point: commit `e6b23ac` on the default branch (deployed, Ready, verified on the live
site by the owner). No migrations and no new env vars since the 2026-10-08 checkpoints.
(The branch head also carries `21c0916`, a Cursor-built `/curri-fleet` ad landing page —
not part of this checkpoint's review or tests.)

Shipped and verified:
- **Stage 2b** (`bb92981`): `/account/curri-fleet` → "Your offers and loads" — the signed-in
  driver's open offers (pay, "Open until … PT", "Open Telegram to Accept or Pass"), assigned
  loads with plain status lines, last 24 h of lost / cancelled / no-longer-yours. Read-only.
- **Driver ⇄ owner relay** (`f8cfe1d`, hardened in `e6b23ac`): anything a current fleet member
  sends the bot that isn't a command (text, photo, voice, location…) reaches the owner's
  private chat with name, phone, current load and admin link; the owner answers by
  replying to it. Media is always re-sent with the bot's own caption; nothing is stored.
- **Pacific time everywhere** (`src/lib/pt-time.ts`): admin board, load page, Active box,
  Telegram messages, fleet page; the new-load form's pickup field is read as PT; the payout
  pre-fill uses the PT calendar day.
- **Accept / Pass race closed**: the answer is recorded first, so simultaneous taps can't
  both count; buttons vanish once answered; a stuck Accept resumes on the next tap; a
  phone-assigned driver tapping Accept hears "Already yours"; CLAIM NOW is sent before the
  driver's confirmation.
- **Fleet page payouts copy**: self-serve "Set up payouts →" (or "Payouts are set up ✓")
  instead of "ask for your Stripe setup link".

Known, not done (small, ask first):
- The owner's new-fleet-member alert email still says "send their Stripe setup link"
  (`src/app/api/stripe/webhook/route.ts`) — Stripe webhook file, so owner approval needed.
- The fleet page reads the cached Stripe "payouts enabled" flag; it refreshes when the
  driver opens the Payouts page.

Open, owner-side (unchanged): the first real portal load end to end; each fleet driver —
"Activated on Curri", home ZIP, Connect Telegram, `/active`; the Stripe $1 test transfer
before paying any driver; Stripe balance top-up; 1099 setting; Neon password reset; the 8
drivers who lost documents; one tagged attribution purchase; attorney review (fleet refund
clause, contractor terms).

## 📍 Checkpoint — 2026-10-08 (late): automatic offers + portal bot combined
Restore point: commit `233fd67` on the default branch (site code as of `8959755`). No
migrations and no new env vars since the previous checkpoint.

Shipped today after the 1a/1b checkpoint (details in `docs/DISPATCH-FLOW.md`):
- **Stage 2 — automatic offers** (`5386fc4`): every incoming load is offered on Telegram to
  every matching Active driver (nearest 10; 3 min, 2 min for rush); first Accept wins; the
  owner is pinged "CLAIM NOW" (claim lane) or "place bid $X (floor $Y)" (bid lane) and only
  then claims. Drivers see **Active / Inactive** (`/active`, `/inactive`; old commands still
  work; auto-off after their hours). Manual "Assign — confirmed by phone" kept.
- **Owner decisions:** no paid services for dispatch (Google distance shelved); Stripe
  Connect fees are covered by the dispatching fee.
- **Portal bot combined** (`8959755`): the owner's separate "Curri Dispatch" bot
  (`curri-dispatch-relay` on Fly.io, built with Cursor, not in this repo) reads the Curri
  carrier portal feed and posts each new load — addresses, pay, accessories — and each
  "left the feed" to `POST /api/dispatch/intake`. This board does the matching and offers;
  that bot no longer messages drivers (its /on, /end, /dispatch and the "$25 / removal" line
  are gone) and sends one private info card per load to the owner only. Specs:
  `docs/CURSOR-TASK-PORTAL-BOT.md`, `docs/CURSOR-TASK-PORTAL-BOT-2.md`; intake fields in
  `docs/DISPATCH-INTAKE.md`. Reading the portal is the owner's choice and risk (section E).
- **Intake key rotated** after it appeared in a screenshot: a new random
  `DISPATCH_INTAKE_KEY` is set in both Vercel and Fly (owner, 2026-10-08).

- **No-taker ping** (after this checkpoint, free, no migration / env var): when an offer
  window closes — or every driver passes — with nobody accepting, the owner gets "⌛ NO
  TAKER … Don't claim" once per round. Runs on every intake call, every Telegram tap, and
  `POST /api/dispatch/sweep`; the portal bot should call that once a minute
  (`docs/CURSOR-TASK-PORTAL-BOT-3.md`, owner-side). Details: `docs/DISPATCH-FLOW.md`.

- **Stage 2b — drivers' offers and loads on the fleet page** (after this checkpoint, one
  page, read-only, no migration / env var): `/account/curri-fleet` shows the signed-in
  driver's open offers (pay, "Open until … PT", "Open Telegram to Accept or Pass"), their
  assigned loads with plain status lines, and the last 24 h of lost / cancelled / no-longer-
  yours loads. Accept/Pass stays in Telegram. Owner testing live 2026-10-08.
- **Four small dispatch fixes** (after this checkpoint; no migration / env var): driver
  messages to the bot are relayed to the owner, who answers by replying; dispatch times in
  PT everywhere (the new-load form's pickup field too, and the payout pre-fill date); Accept +
  Pass at the same moment can no longer both count (buttons vanish once answered); the fleet
  page points to the self-serve Payouts page instead of "ask for your Stripe setup link".
  Details: `docs/DISPATCH-FLOW.md` → Side findings.

**Not yet verified live:** the first real portal load end to end (card + FlowSync
"Offered to N…" ping + load under /admin/dispatch + driver Accept/Pass). The bot started
after 5 loads were already on the feed and skipped them on purpose. If the card shows a
⚠️ line, the Fly and Vercel keys don't match.

Open, owner-side (unchanged): each fleet driver — "Activated on Curri", home ZIP, Connect
Telegram, `/active`; the Stripe $1 test transfer before paying any driver; Stripe balance
top-up; 1099 setting; Neon password reset; the 8 drivers who lost documents; one tagged
attribution purchase; attorney review (fleet refund clause, contractor terms).

## 📍 Checkpoint — 2026-10-08: Dispatch board live (stages 1a + 1b)
Restore point: commit `ddcdd2c` on the default branch, verified live by the owner: Connect
Telegram linked his own account, `/status` answered, an intake test load produced the
COVERED / NOT COVERED ping, a bid-lane offer's **Accept** tap worked after the Telegram
webhook was re-registered with `callback_query` (command in docs/DISPATCH-FLOW.md).
Database restore points taken BEFORE each migration: Neon snapshots
`before-dispatch-2026-10-08` and `before-telegram-2026-10-08` on main (never expire).

**Migrations applied to production 2026-10-08 (both ADDITIVE):**
`20261008040000_dispatch_board` (enums VehicleClass / DispatchLane / DispatchStatus /
OfferResponse; DriverProfile.baseZip, curriActivatedAt, onDutyUntil, dutyRadiusMiles,
dutyMaxTripMiles; tables DispatchLoad, DispatchOffer, DispatchEvent) and
`20261008060000_telegram_chat_id` (User.telegramChatId). **New env var:**
`DISPATCH_INTAKE_KEY` (set by the owner in Vercel). Rolling the code back to `5c7f889` is
safe with these in place.

Shipped — design in `docs/DISPATCH-FLOW.md`, agent spec in `docs/DISPATCH-INTAKE.md`:
- `/admin/dispatch` + `/admin/dispatch/[id]`: enter a load (ZIP or city; Curri's miles),
  COVERED / NOT COVERED verdict from on-duty, Curri-activated drivers (vehicle class,
  radius, max trip, not busy, rush reach), suggested bid with cost floor, claim lane
  (Assign only when covered → Claimed in Curri) and bid lane (Offer → Accept → Bid placed →
  Awarded / Lost), lane switch, Delivered → pre-filled payout, append-only log.
- Drivers: home base ZIP on the profile; on/off duty on `/account/curri-fleet` or by
  Telegram `/onduty` `/offduty` `/status`; "Connect Telegram"; ASSIGNED / offer with
  Accept–Pass / confirmed / lost messages. Admin marks "Activated on Curri".
- Owner's Telegram: verdict on every intake load, accepted / underbid / won pings.
- Intake door `POST /api/dispatch/intake` for the email-reading agent: the five Curri
  email types (new opportunity, bid placed, won, lost, underbid) create NEW loads or
  mirror status; never assigns or claims. Bundled Census ZIP + places tables for
  distance (no maps API).

Open, owner-side:
- Hand `docs/DISPATCH-INTAKE.md` and the intake key to the Cursor agent; start it on new
  emails only. First week: compare each ping against the portal before claiming.
- Each fleet driver: mark "Activated on Curri" (admin), ask for their home ZIP and a
  Connect Telegram tap, then `/onduty` when they're ready to run.
- Still open from earlier: the Stripe $1 test transfer before paying any driver; Stripe
  balance top-up; 1099 setting in Stripe Connect; Neon password reset; the 8 drivers who
  lost documents; one tagged attribution test purchase.

Next candidates (docs/DISPATCH-FLOW.md): stage 3 — driving distance / ETA via a maps
provider (a `GOOGLE_MAPS_API_KEY` already exists in `.env.example`) and optional live
location while on duty; no-answer timers for offers; SMS fallback for drivers not on
Telegram; weekly payout summary email.

## 📍 Checkpoint — 2026-10-07 (night): Stripe Connect phase 2 live — drivers can be paid
Restore point: commit `5c7f889` on the default branch, deployed and Ready. **The live
transfer call has NOT been exercised yet** (corrected 2026-10-07 late: the owner reported
the $1 test as done to move forward, then clarified it was not run). Verified live so far:
the migration applied, the admin card and /admin/payouts render, and (phase 1) the site
creates Express accounts and reads their status. **Before any driver is paid: one $1.18
delivery → "Log and pay now" → confirm the $1.00 transfer in Stripe → Connect → Transfers,
the receipt email, and the row PAID.** Database restore point taken BEFORE this migration:
Neon snapshot `before-payouts-2026-10-07` on main (never expires), on top of the phase-1
branch + snapshot below.

Resolved 2026-10-07: a hand-made duplicate connected account for one driver was closed in
the Stripe dashboard; the site's account (the one on her admin card) is the only one left.
Rule of thumb: never create connected accounts by hand — the admin button or the driver's
Payouts page creates the one the site will pay.

**Migration `20261007230000_fleet_payouts` (ADDITIVE, applied to production 2026-10-07):**
enums `PayPlan`, `PayoutStatus`; `User.payPlan` (default STANDARD); new table
`DriverPayout`. Rolling the code back to `2d151aa` is safe with these in place.

Shipped: `src/lib/payouts.ts` (log a delivery → PENDING; pay = live Stripe-readiness check +
`stripe.transfers.create` with the payout id as idempotency key, $1,500 cap, PAID / FAILED
with reason + owner alert / retry; Pay all pending; cancel), the "Fleet payouts" card on the
admin driver page (plan, Log delivery with net preview, Log for Friday / Log and pay now,
per-row Pay now / Retry / Cancel), `/admin/payouts` (Friday run + history, linked from
/admin), the driver's own history on `/account/payouts`, and the payout receipt email.

**How the owner pays drivers now:** log each delivery on the driver's page as it happens.
Standard drivers: Friday → /admin/payouts → Pay all pending. Faster drivers: Log and pay
now. Keep the FlowSync Stripe balance topped up (Stripe → Balances → Add to balance);
a short balance fails the transfer cleanly and the row stays pending for retry.

Open, owner-side: in Stripe → Settings → Connect turn on tax-form (1099) generation;
contractor terms are attorney territory. Phase 3 candidates: reversal handling
(`transfer.reversed` → mark the row), a weekly payout summary email, CSV export of payouts.

## 📍 Checkpoint — 2026-10-07 (evening): Stripe Connect phase 1 live
Restore point: commit `2d151aa` on the default branch, verified live by the owner as far
as: a real driver's Express account created from the admin button with live status and
requirements shown; existing drivers' trips and documents still render. (Corrected
2026-10-07 late: Stripe's Connected accounts list shows no account for the owner, so the
driver-side form was not walked through by him; four drivers' accounts exist, all
"Restricted" until each finishes Stripe's form.) Database restore points taken
BEFORE this migration: Neon branch `backup-before-stripe-connect` and snapshot
`before-stripe-connect-2026-10-07` on main (never expires).

**Migration `20261007190000_stripe_connect_accounts` (ADDITIVE, applied to production
2026-10-07):** `User.stripeConnectAccountId` (unique, nullable),
`User.stripeConnectOnboardedAt` (nullable), `User.stripeConnectPayoutsEnabled`
(default false). Rolling back the code to `d4cd287` is safe with these columns in place.

Shipped: `src/lib/stripe-connect.ts` (Express account per fleet driver, onboarding links
on click, Express dashboard login links, status sync + owner email when payouts become
enabled), `/account/payouts` (fleet members; Set up / Continue / Manage in Stripe), the
admin driver page's "Stripe payouts" card (status, requirements due, Send Stripe setup
link, Refresh status), the "Set up your fleet payouts" email, and copy changes in the
fleet welcome email + fleet guide (no more "email for your Stripe link"). No webhook:
status is read from Stripe on page load. Transfers (paying per delivery) are NOT built.

**Next: Stripe Connect phase 2 — pay per delivery.** Needs: a `DriverPayout` table
(driver, load amount, fee %, net, note/load ref, Stripe transfer id, who/when) — a
migration (backup first); an admin "Pay driver" form on the driver page (load amount,
standard 15% / faster 20%, shows net, confirm → `stripe.transfers.create` to the
driver's account) with a receipt email; a payouts history. Transfers draw on the
FlowSync Stripe balance — the owner tops it up (Curri pays the bank, not Stripe). First
real transfer must be $1 to the owner's own account. Open decisions: faster-pay
mechanics (Stripe instant payout is the driver's choice/fee on Express; "faster pay" here
means we transfer sooner), and whether a weekly Friday batch screen comes in phase 2 or 3.

## 📍 Checkpoint — 2026-10-07 (morning)
Restore point: commit `d4cd287` on the default branch, verified live on flowsyncdriver.com
by the owner. To roll back, promote that deployment in Vercel → Deployments, or redeploy
that commit. None of the changes below added migrations, schema changes or env var names.

Shipped since the 2026-10-01 checkpoint (this session; the other session's PRs #17–#55
are recorded in their own commits):
- **Document upload no longer deletes silently** (`3f67c6f`, 2026-09-30/10-01): a PDF or an
  undecodable file (HEIC on most browsers) now shows "Please upload a photo — JPG or PNG."
  inside the card and leaves the existing document alone. Before, it deleted the Document
  row with no message. Roadmap step "Upload your license & documents" now opens
  `/account/edit`. `scripts/find-missing-documents.mjs` (read-only) lists drivers whose
  files exist in Blob with no Document row; it was run 2026-10-01 (8 drivers / 12 docs) —
  outreach is the owner's.
- **Fleet buyers land on the fleet page** (`595fbc3`): after a homepage/pricing or offer-page-B
  fleet purchase, activation / sign-in / temp-password reset all end on
  `/account/curri-fleet?welcome=1` (next-steps copy, no second Purchase pixel). Someone already
  signed in is sent straight there. `next` is honored only for in-app `/account…` paths.
- **First-touch attribution** (`1f05529`): `AttributionCapture` (root layout) stores one
  30-day first-party cookie (`fs_attr`: referrer host, UTM tags, fbclid, landing path, time).
  The checkout route copies it plus the pixel's `_fbp`/`_fbc` into every Checkout Session's
  metadata (`attr_source`, `attr_medium`, `attr_campaign`, `attr_content`, `attr_referrer`,
  `attr_landing`, `attr_fbclid`, `attr_first_seen`, `fbp`, `fbc`); the webhook forwards
  `fbp`/`fbc` to the Conversions API. Privacy policy has a paragraph on the cookie. Read it
  per sale in Stripe → payment → Metadata.
- **Tagged links** (`501eb45`, `d4cd287`): `docs/ads/tagged-links.md` has the ad / bio / reel /
  text / Telegram links (same campaign names as `meta-ad-copy.md`). Every automatic email
  tags its own site links (`utm_source=email&utm_campaign=<email name>`) via `send()` in
  `lib/email.ts`; Telegram, Stripe, `/api/` and password-reset links are never tagged.

Open, owner-side:
- Neon password reset (the role password was exposed in chat/screenshots): Neon → production
  branch → Roles → `neondb_owner` → Reset password; confirm Vercel's `DATABASE_URL` /
  `DATABASE_URL_UNPOOLED` updated (Vercel-managed store), redeploy, check `/api/health`.
  Owner declined to rotate the Blob token (2026-10-06).
- Remove `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` from the LOCAL cloud environment's
  variables if still there (they were added only to run the missing-documents script).
- Reach out to the 8 drivers from the missing-documents CSV (owner's local `backups/`).
- One tagged test purchase (`/pricing?utm_source=test&utm_campaign=attribution`, then refund)
  to confirm the `attr_*` fields in Stripe and the match keys in Meta Events Manager.
- Still from 10-01: run `scripts/send-test-email.mjs`; check the support email in Stripe's
  public details; confirm an abandoned-checkout alert reaches the inbox.

Next candidates: Phase 2 of attribution (nullable `Payment` columns + source on `/admin`
signups — a migration, backup-first); PDF support for insurance cards (needs the
server-action body limit raised or direct-to-Blob upload).

## 📍 Checkpoint — 2026-10-01
Restore point: commit `62bd1c3` (the merge of PR #16 into the default branch), live on
flowsyncdriver.com. Earlier same-day point, before the alert change: `1484112` (PR #14). To roll back, promote that deployment in Vercel → Deployments, or
redeploy that commit. Today's changes added no migrations, schema changes or new env var
names, so rolling back to it is code-only for them.

Shipped today (pixel, Stripe charging/pricing, auth and data untouched):
- **Admin "Newest signups"** on `/admin` — reads the User table, so a buyer shows up the
  moment they pay, before they finish `/account/setup` (the old list only showed profiles).
- **Telegram is fleet-only** — removed from `/account` and the driver welcome email; shown
  on `/account/curri-fleet` (members) and in the fleet welcome email via
  `src/lib/telegram-invite.ts`. `NEXT_PUBLIC_TELEGRAM_INVITE_URL` now points at the Curri
  relay group (set by the owner in Vercel as a Config variable).
- **No "listed"/"active" claims before approval** — welcome email, both offer pages, the
  fleet guide and the homepage fleet card now say "paid for" / "You're in".
- **`scripts/find-missing-documents.mjs`** (read-only) ran on 2026-10-01: 8 drivers,
  12 documents lost to the old PDF-upload bug. Outreach is the owner's; the CSV is in the
  owner's local `backups/` folder (PII, never committed).
- **Owner alerts moved from Telegram to email** (PR #16) — `src/lib/alerts.ts` emails
  `SUPPORT_EMAIL` (support@flowsyncdriver.com) plus `ADMIN_EMAILS`, always logs `[alert]`
  first. The support inbox is a recipient in code, deliberately NOT in `ADMIN_EMAILS`
  (that list grants admin, and a buyer can claim an account for any email at checkout).
  Trade-off: the "welcome email FAILED" alert now rides the same email service.
- **`support@flowsyncpro.io` retired** (owner has no access), alongside the already-dead
  `drivers@flowsyncpro.io`. No code used either; all mail already replies to
  support@flowsyncdriver.com.
- **`scripts/send-test-email.mjs`** — sends one Resend test email to the support inbox,
  key read from `RESEND_API_KEY` (never hardcoded). Not yet run by the owner.

Open, owner-side:
- Approval still gates the public directory; buyers can sign in, upload and use their
  tools without it.
- Run `node --env-file=.env.local scripts/send-test-email.mjs` locally to prove the Resend
  key works. If this is a new Resend account: put the new key in Vercel `RESEND_API_KEY`,
  verify `flowsyncdriver.com` in Resend → Domains, set `RESEND_FROM_EMAIL` to an address on
  it, and redeploy.
- In Stripe → Settings → Public details, make sure the support email is
  support@flowsyncdriver.com, not the retired flowsyncpro.io address.
- Confirm a real abandoned-checkout alert reaches the support inbox (use an email that has
  never paid; the alert is skipped for paid accounts).

## ⚠️ Blocked / needs owner decision
- **Email blast to Stripe customers** — deferred to Phase 2 step 4 (needs auth + Resend +
  tested template + explicit sign-off). Irreversible; will not run without confirmation.

## Ideas to make the driver experience even better
- Earnings/tax export, mileage tracking, downloadable invoices & receipts for customers.
- Driver "playbooks" library + checklist onboarding; verified-badge tiers.
- Referral program (driver-refers-driver, customer-refers-customer).
- Reviews/ratings, repeat-customer CRM, saved customers, rebook in one tap.
- Goal gamification: levels, monthly leaderboards (opt-in), milestone payouts/perks.
- In-app quote → invoice → paid flow so the driver never leaves FlowSync.

## Working agreement
After each completed task, recommend the next best task.
