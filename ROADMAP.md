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
- [ ] **Marketing playbook** — how to advertise on Nextdoor, Yelp, Thumbtack,
  Craigslist, Indeed; local SEO; getting first customers.
- [ ] **Business foundation guide** — DOT, EIN, LLC, insurance; "mistakes new drivers make."
- [x] **Gamified dashboard** (`/dashboard`) — monthly goal + progress ring, streaks, tiers
  (Rookie→Legend), weekly chart, log-a-job, and unlockable awards.
- [ ] **Customer "book a driver" directory** — browse/filter drivers, request a quote.
- [ ] **P&L tracker tool** (mockup) — weekly/monthly income vs. expenses.
- [ ] **SEO deepening** — per-page metadata, Service + FAQ + Breadcrumb JSON-LD, performance.

## Phase 2 — Real product (needs infrastructure + secrets + decisions)
- [ ] Database (drivers, customers, profiles, bookings, payments).
- [ ] Auth + **email verification** + temp-password sign-in; profile editing
      (profile/vehicle/license/insurance/driving-record uploads).
- [ ] **Stripe Checkout** (live) for $17 + bumps; webhooks; 5% payout logic.
- [ ] **Resend** transactional email (verify, temp password, receipts, booking alerts).
- [ ] Secure file storage for driver documents.
- [ ] **Customer migration**: import existing Stripe paying customers → create accounts →
      email sign-in info via Resend. ⚠️ Blocked until auth + Resend exist (see below).

## ⚠️ Blocked / needs owner decision
- **Email blast to Stripe customers** — cannot run yet: (1) no Resend connected here,
  (2) no account system to generate "sign-in info" for, (3) sending real customers
  emails is irreversible and needs explicit sign-off + tested content.

## Ideas to make the driver experience even better
- Earnings/tax export, mileage tracking, downloadable invoices & receipts for customers.
- Driver "playbooks" library + checklist onboarding; verified-badge tiers.
- Referral program (driver-refers-driver, customer-refers-customer).
- Reviews/ratings, repeat-customer CRM, saved customers, rebook in one tap.
- Goal gamification: levels, monthly leaderboards (opt-in), milestone payouts/perks.
- In-app quote → invoice → paid flow so the driver never leaves FlowSync.

## Working agreement
After each completed task, recommend the next best task.
