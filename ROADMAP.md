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

## 📍 Checkpoint — 2026-10-07
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
