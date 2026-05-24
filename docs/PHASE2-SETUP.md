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
- `src/lib/storage.ts` — document storage shim (stores the data URL today; swap to Vercel Blob).
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
   Vercel auto-adds `DATABASE_URL` (and a pooled/direct pair) to the project. Map
   the direct connection to `DIRECT_URL`.
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

```bash
npm install                 # also runs `prisma generate`
npx prisma migrate dev --name init   # local: creates tables + a migration
# on first deploy, Vercel/CI runs:
npx prisma migrate deploy
```

## 3. Build order (each is its own PR)

1. **Accounts foundation** *(schema + auth/persistence wiring done — next: cut-over)*
   - DONE: sessions, password hashing, sign-in + reset-password pages, and server
     actions for register/profile/documents (see file list above).
   - CUT-OVER (needs the live DB): point the nav "Sign in" link at `/signin`; make
     `AccountEditor` call `saveDriverProfile` + `saveDocument` instead of localStorage;
     render the public profile and `/find-a-driver` directory from `getMyDriverProfile`
     / `prisma.driverProfile.findMany`. Wrap any page that reads the session with
     `export const dynamic = "force-dynamic"`.
   - OPTIONAL: swap `src/lib/storage.ts` to real Vercel Blob.
2. **Stripe Checkout** — `/api/checkout` creates a Checkout Session for the $17
   listing + selected bumps; `/api/stripe/webhook` marks the `Payment` paid,
   creates the `User` + temp password, and triggers the welcome email.
3. **Resend emails** — verification link + temporary password on signup; receipts;
   booking/quote notifications.
4. **Customer migration** — script reads existing Stripe customers, creates `User`
   rows, and sends sign-in info via Resend. **Run once, with explicit sign-off**, on
   a tested template (irreversible — real customer inboxes).
5. **Bookings loop** — customer request → driver quote → in-app payment (5% fee) →
   completion + review.

## Notes

- Keep all DB access in route handlers / server actions / `force-dynamic` pages so
  `next build` never connects to Postgres during static prerender.
- The mockup's `localStorage` keys (`flowsync.driverProfile`, `flowsync.gameState`,
  `flowsync.pnl`) map cleanly onto the `DriverProfile`, dashboard, and `Payment`
  models when we cut over.
- `DocKind` enum values match the app's `DocKey`s; `ServiceType` matches the eight
  service ids in `src/lib/services.ts`.
