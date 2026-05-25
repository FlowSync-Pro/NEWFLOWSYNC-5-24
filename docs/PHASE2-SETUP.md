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
2. **Blob** — Vercel Dashboard → Storage → Create → Blob. Adds `BLOB_READ_WRITE_TOKEN`.
3. **Stripe** — from the Stripe dashboard copy the secret key and the publishable
   key. Create a webhook endpoint (after first deploy) pointed at
   `/api/stripe/webhook` and copy its signing secret.
4. **Resend** — create an API key and verify a sending domain (e.g.
   `mail.flowsyncdriver.com`). Set `RESEND_FROM_EMAIL` to an address on it.
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
