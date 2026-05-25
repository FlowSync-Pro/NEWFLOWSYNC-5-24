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
      Demo drivers seeded (`prisma/seed.mjs`). Remaining: swap storage shim to Vercel Blob;
      add driver profiles to the sitemap; optional Auth.js.
- [x] **Stripe Checkout** for $17 + bumps — `/api/checkout` (hosted Checkout Session) and
      `/api/stripe/webhook` (signature-verified; on `checkout.session.completed` creates the
      driver account + records a PAID Payment). Pricing page wired with graceful demo
      fallback when no keys. Verified locally with signed events (create, replay/idempotent,
      bad-signature reject). Needs: real Stripe keys + the temp-password email (Resend, next).
- [ ] **Resend** transactional email (verify, temp password, receipts, booking alerts).
- [ ] Secure file storage for driver documents.
- [ ] **Customer migration**: import existing Stripe paying customers → create accounts →
      email sign-in info via Resend. ⚠️ Blocked until auth + Resend exist (see below).

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
5. **Bookings loop** — customer request → driver quote → pay in-app → 5% taken → review.

**What the owner must provide (in Vercel, not the repo)**
- Vercel Postgres (or Supabase) connection string · Vercel Blob token
- Stripe secret + publishable keys + webhook signing secret
- Resend API key + a verified sending domain (e.g., mail.flowsyncdriver.com)
- `AUTH_SECRET` for session signing

**Environment note:** live DB/Stripe/Resend calls can't run from this sandbox. Phase 2 work =
writing the code against env placeholders + setup docs; provisioning + secrets happen in the
owner's Vercel/Stripe/Resend accounts, then deploy.

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
