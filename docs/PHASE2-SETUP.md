# Phase 2 setup — accounts foundation

This is the runbook for turning the FlowSync mockup into a real product on the
**Vercel-native stack**: Postgres (Neon via Vercel) · Prisma · Auth.js · Vercel
Blob · Resend · Stripe.

Phase 1 (the whole front-end) stays exactly as-is and keeps working. Phase 2 adds
a backend underneath it, one milestone at a time.

---

## What's already in the repo (this milestone)

- `prisma/schema.prisma` — the full data model (users, driver profiles, documents,
  bookings, payments, plus the Auth.js adapter tables).
- `src/lib/db.ts` — the shared Prisma client.
- `.env.example` — every environment variable Phase 2 needs.
- `postinstall: prisma generate` in `package.json` so Vercel builds the client.

Nothing here connects to a live database yet — that needs the steps below.

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

1. **Accounts foundation** *(schema done — next: wiring)*
   - `src/auth.ts` — Auth.js config (Credentials provider + Prisma adapter).
   - `src/app/api/auth/[...nextauth]/route.ts` — auth route handler.
   - Sign-in page + "must reset password" flow.
   - Move `/account` profile edits and document uploads from `localStorage` to the
     DB + Vercel Blob (the UI already exists — swap the persistence layer).
   - Render the public profile + `/find-a-driver` directory from the DB.
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
