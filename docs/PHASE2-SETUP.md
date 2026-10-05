# Phase 2 setup — accounts foundation

This is the runbook for turning the FlowSync mockup into a real product on the
**Vercel-native stack**: Postgres (Neon via Vercel) · Prisma · Auth.js · Vercel
Blob · Resend · Stripe.

Phase 1 (the whole front-end) stays exactly as-is and keeps working. Phase 2 adds
a backend underneath it, one milestone at a time.

---

## What's already in the repo (this milestone)

**Data + client**
- `prisma/schema.prisma` — the full data model (users, driver profiles, documents,
  bookings, payments, plus Auth.js adapter tables for if/when you switch to Auth.js).
- `src/lib/db.ts` — the shared Prisma client.
- `.env.example` — every environment variable Phase 2 needs.
- `postinstall: prisma generate` in `package.json` so Vercel builds the client.

**Auth + persistence wiring (ready to flip on)**
- `src/lib/password.ts` — scrypt password hashing (Node built-in).
- `src/lib/session.ts` — signed-cookie sessions (`createSession`/`getSession`/`destroySession`).
- `src/lib/enums.ts` — maps app service ids ↔ Prisma `ServiceType`.
- `src/lib/storage.ts` — uploads documents to Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set (inline fallback for local dev).
- `src/app/actions/auth.ts` — `registerDriver`, `login`, `logout`, `setPassword`.
- `src/app/actions/profile.ts` — `getMyDriverProfile`, `saveDriverProfile`.
- `src/app/actions/documents.ts` — `saveDocument`, `removeDocument` (auto-sets `verified`).
- `src/app/signin` + `src/app/reset-password` — working forms (need the DB to authenticate).

Nothing connects to a live database yet, and the Phase 1 localStorage UI is still the
default — flip the pages over to these actions during cut-over (below).

### Why a built-in auth layer instead of Auth.js?

The chosen stack named Auth.js, but the build sandbox couldn't install
`next-auth`/`@vercel/blob`/`bcryptjs` (a corrupted lockfile state). So auth is wired
with zero extra dependencies (Node `crypto`), which builds and runs cleanly. On your
clean environment you can **either** keep this lightweight layer **or** swap to Auth.js:
the Prisma schema already includes the `Account`/`Session`/`VerificationToken` adapter
tables. If you install Auth.js and hit peer-dependency errors, add an `.npmrc` with
`legacy-peer-deps=true`. Same for `@vercel/blob` (then implement `src/lib/storage.ts`
per the comment in that file).

---

## 1. Provision infrastructure (owner, ~20 min)

All of this is created once and lives under your Vercel account.

1. **Postgres** — Vercel Dashboard → Storage → Create Database → Neon Postgres.
   Vercel adds `DATABASE_URL`. Set it to the **direct/non-pooled** string (the host
   WITHOUT `-pooler`) so migrations run cleanly.
   **Preview branching is ON (2026-10-02):** Storage → neon-carmine-fence → Projects →
   newflowsync-5-24 → Update Project Connection → "Create Database Branch For
   Deployment" has Preview ticked (Production was already ticked; prefix left empty).
   Each preview build gets its own Neon copy named `preview/<git-branch>`, and its
   `prisma migrate deploy` runs on that copy. The real database is only migrated when
   a preview is promoted to Production (promote rebuilds with production env), so the
   backup-before-migration rule still applies before promoting. The copy holds real
   customer data and preview can still send email: don't email drivers from a
   preview, and never complete a payment there (the Stripe webhook only reaches
   production, which won't find the buyer).
2. **Blob** — Vercel Dashboard → Storage → Create → Blob. Adds `BLOB_READ_WRITE_TOKEN`.
3. **Stripe** — from the Stripe dashboard copy the secret key and the publishable
   key. Create a webhook endpoint (after first deploy) pointed at
   `/api/stripe/webhook` and copy its signing secret.
4. **Resend** — create an API key and verify a sending domain (e.g.
   `mail.flowsyncdriver.com`). Set `RESEND_FROM_EMAIL` to an address on it.
   **Live setup (2026-10-04): email is sent from `flowsyncdrivers.com` (plural),
   while the website stays on `flowsyncdriver.com` (singular). This is on purpose —
   don't "fix" it back.** The singular domain's DNS (Google nameservers, registered
   at Squarespace) became unreachable when the owner lost the Gmail tied to that
   Squarespace account, and Resend reported it unverified for the current API key.
   The plural domain's DNS is on Vercel (Vercel → Domains → flowsyncdrivers.com),
   where the Resend records live: an apex `resend-domain-verification` TXT (domain
   claim — keep it), `resend._domainkey` TXT (DKIM), and `send` MX + TXT (bounces /
   SPF). Verified in Resend team "flowsyncdriver", region us-east-1.
   `RESEND_FROM_EMAIL` = `Nasser <hello@flowsyncdrivers.com>`. Replies still go to
   `SUPPORT_EMAIL` (`support@flowsyncdriver.com`, Google Workspace on the singular
   domain) — if that domain's DNS is ever lost, replies stop arriving. When the
   singular domain is recovered, sending can move back, but nothing requires it.
5. **Auth secret** — run `npx auth secret` (or `openssl rand -base64 32`) and set
   `AUTH_SECRET`.

Put all of these in **Vercel → Project → Settings → Environment Variables**, and in
a local `.env.local` for development (see `.env.example` for the full list).

## 2. Create the database tables

**Automatic on Vercel** — `vercel.json` runs `prisma migrate deploy` before each build,
so the tables are created/updated on deploy with no terminal step. (Locally, run
`npm install` then `npx prisma migrate dev` if you're developing.)

## 3. Build order (each is its own PR)

1. **Accounts foundation** *(schema + auth/persistence wiring done — next: cut-over)*
   - DONE: sessions, password hashing, sign-in + reset-password pages, and server
     actions for register/profile/documents (see file list above).
   - CUT-OVER (needs the live DB): point the nav "Sign in" link at `/signin`; make
     `AccountEditor` call `saveDriverProfile` + `saveDocument` instead of localStorage;
     render the public profile and `/find-a-driver` directory from `getMyDriverProfile`
     / `prisma.driverProfile.findMany`. Wrap any page that reads the session with
     `export const dynamic = "force-dynamic"`.
2. **Stripe Checkout** *(built — needs keys)* — `/api/checkout` creates a hosted
   Checkout Session for the $17 listing + selected bumps; `/api/stripe/webhook`
   verifies the signature and, on `checkout.session.completed`, creates the driver
   `User` (temp password, must-reset) + `DriverProfile` and records a PAID `Payment`.
   Uses the official `stripe` SDK. To go live: set `STRIPE_SECRET_KEY` +
   `STRIPE_WEBHOOK_SECRET`, and register the webhook endpoint at
   `https://flowsyncdriver.com/api/stripe/webhook` for the `checkout.session.completed`
   event. The temp-password email is currently logged — wire it to Resend in step 3.
3. **Resend emails** *(built — needs keys)* — `src/lib/email.ts` sends a branded
   welcome + temporary-password email from the Stripe webhook, and a welcome email on
   self-service signup, via the `resend` SDK. Graceful no-op (logged) without keys. To
   go live: set `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL` (e.g.
   `FlowSync <hello@mail.flowsyncdriver.com>`). Later: receipts + booking notifications.
4. **Customer migration** *(built)* — `scripts/migrate-stripe-customers.mjs` reads Stripe
   customers, creates `User` rows (temp password, must-reset, linked `stripeCustomerId`),
   and emails sign-in info via Resend. **Dry run by default**; idempotent. Usage:
   `node --env-file=.env scripts/migrate-stripe-customers.mjs` (preview), then
   `--apply` to perform (`--limit=N` for a test batch). Run the real `--apply` once, with
   explicit sign-off — it hits real inboxes and can't be undone. Migrated accounts with no
   profile complete one on first sign-in via `/account/setup`.
5. **Bookings loop** *(built)* — customer request → driver quote → in-app payment (5% fee) →
   completion + review.

## Notes

- Keep all DB access in route handlers / server actions / `force-dynamic` pages so
  `next build` never connects to Postgres during static prerender.
- The mockup's `localStorage` keys (`flowsync.driverProfile`, `flowsync.gameState`,
  `flowsync.pnl`) map cleanly onto the `DriverProfile`, dashboard, and `Payment`
  models when we cut over.
- `DocKind` enum values match the app's `DocKey`s; `ServiceType` matches the eight
  service ids in `src/lib/services.ts`.
- **Prisma stays on 6.19.x (owner decision, 2026-10-02).** `npm audit` reports 3 high
  findings, all one package (`deepmerge-ts` < 8, GHSA-ggr8-5vv4-36mx) pulled in by
  `@prisma/config`. It only runs at build time on our own config files, so it is not
  reachable from the live site. No stable Prisma fixes it: 6.19.3, 7.10.0 and the 8.0.0
  RC all still ship `deepmerge-ts` 7.1.5; the fix exists only in 8.1.0-dev builds.
  Prisma 7 is also a rewrite of the DB layer (driver adapter, `prisma.config.ts`,
  new generated-client import path in 15 files + 7 scripts). Re-check when a stable
  Prisma ≥ 8.1 ships; do the upgrade on a preview branch with a backup first. Do not
  downgrade to 6.12 (audit's "fix") and do not force `deepmerge-ts` via `overrides`.

---

## Deploy & domains checklist

> ⚠️ **Two near-identical domains.** This new build belongs on **`flowsyncdriver.com`**
> (singular, no "s"). The existing live site is **`flowsyncdrivers.com`** (plural). One
> letter apart — slow down at every step below so the new project never lands on the
> existing site.

**Before you attach any custom domain**
- [ ] Confirm you actually own `flowsyncdriver.com` (singular). Register it if not — and
      don't reflexively grab the plural.
- [ ] Deploy this repo as a **brand-new, separate Vercel project** (not the one serving
      `flowsyncdrivers.com`, if that's also on Vercel).
- [ ] Verify on the temporary `*.vercel.app` URL first. It's fully isolated from both real
      domains — nothing public until you attach a custom domain.

**Environment variables (Vercel → Project → Settings → Environment Variables)**
- [ ] `DATABASE_URL` (from the Vercel Postgres DB — use the non-pooled string)
- [ ] `AUTH_SECRET` (`npx auth secret`)
- [ ] `BLOB_READ_WRITE_TOKEN` (when you enable Blob)
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- [ ] `NEXT_PUBLIC_SITE_URL=https://flowsyncdriver.com`

**Attaching the domain (do this deliberately)**
- [ ] In the new project → Settings → Domains, type **`flowsyncdriver.com`** and read it
      back letter-by-letter before saving. No "s".
- [ ] Add DNS records **only** at the registrar entry for `flowsyncdriver.com`.
- [ ] Do **not** touch `flowsyncdrivers.com`'s DNS or domain settings at all.
- [ ] After it resolves, confirm the address bar shows the singular domain.

**Database migration on first deploy**
- [ ] Run `npx prisma migrate deploy` against the production DB (Vercel build step or one-off).

**Safety**
- [ ] The customer email blast (Phase 2 step 4) stays off until explicitly signed off on a
      tested template — it hits real inboxes and can't be undone.
