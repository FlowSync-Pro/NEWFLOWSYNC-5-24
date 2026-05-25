# FlowSync

A fresh, dark/premium marketing + onboarding mockup for **FlowSync** — a driver-owned
marketplace for every kind of delivery and errand. Built with Next.js (App Router),
TypeScript, and Tailwind CSS v4, designed to deploy on **Vercel** with zero config.

## ⚡ Continue here (handoff for any editor / agent)

**Current state:** Phase 1 (the full marketing + onboarding frontend) **and** Phase 2
(a real backend) are built and verified locally against Postgres + Stripe/Resend test events.

- **Phase 2 stack:** Postgres + Prisma · built-in cookie-session auth (scrypt — the schema
  also keeps Auth.js adapter tables if you'd rather swap) · Stripe Checkout + webhooks ·
  Resend email · Vercel Blob document storage.
- **What works end to end:** paid driver signup → temp-password email → sign in → edit
  profile + upload/verify documents; a DB-backed public directory + profiles (`/find-a-driver`,
  `/d/[id]`); and the full customer booking loop (request → quote → pay, 5% fee). Plus a
  Stripe customer-migration script (`scripts/migrate-stripe-customers.mjs`, dry-run by default).

**To pick up the work, read:**
- [`ROADMAP.md`](ROADMAP.md) — what's done and what's left, checkbox by checkbox.
- [`docs/PHASE2-SETUP.md`](docs/PHASE2-SETUP.md) — the step-by-step deploy runbook.

**Immediate next step: deploy a Vercel preview** (see the runbook) — create the Postgres + Blob
stores, set env vars (`AUTH_SECRET`, Stripe **test** keys + webhook secret, `RESEND_API_KEY` /
`RESEND_FROM_EMAIL`, `NEXT_PUBLIC_SITE_URL`), run `npx prisma migrate deploy`, wire the Stripe
webhook, then smoke-test on the `*.vercel.app` URL. Secrets go in `.env.local` (gitignored) —
copy [`.env.example`](.env.example). A clean `npm ci && npm run build` is verified to pass.

> ⚠️ Deploy to its **own** Vercel project/domain (`flowsyncdriver.com`, singular). Never point it
> at the existing `flowsyncdrivers.com` site. Stay on Stripe **test** keys until verified.

## What's inside

- **Home** (`/`) — dark hero, service showcase, how-it-works, driver perks, testimonials.
- **Services** (`/services`) — the eight service categories with vehicle types, tasks,
  requirements, and earnings.
- **For Drivers** (`/drivers`) — benefits, earnings, FlowSync vs. typical gig apps, FAQ.
- **How it works** (`/how-it-works`) — the four onboarding steps + profile-matching explainer.
- **Become a driver** (`/signup`) — an interactive multi-step signup that collects identity,
  service selection, vehicle, and profile details. Saves to the browser (no backend).
- **Driver profile** (`/profile`) — a profile page that **dynamically adapts to the chosen
  service** (e.g. a Pharmacy driver shows certifications & handling; a Mover shows truck,
  crew & capabilities).

### Service types

| Service | Typical vehicle |
| --- | --- |
| Grocery Shopping & Delivery | Sedan / SUV |
| Food / Restaurant Delivery | Any |
| Furniture & Large Item Delivery | Cargo van / Box truck |
| Courier / Package Delivery | Any |
| Pharmacy / Medical Delivery | Sedan |
| Senior Errands & Personal Shopping | Sedan / SUV |
| Moving & Hauling | Box truck / Sprinter |
| Auto Parts Delivery | Sedan / Van |

All service data lives in [`src/lib/services.ts`](src/lib/services.ts) — the single source of
truth that drives the catalog, the signup flow, and the service-matched profile sections.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

## Deploy to Vercel (domain: flowsyncdriver.com)

This is a standard Next.js app and deploys to Vercel with no configuration. It
is intended to live on its **own domain, `flowsyncdriver.com`** — completely
separate from the existing `flowsyncdrivers.com` site.

1. In a **separate Vercel account** (so the two sites stay isolated), import this
   repository and the `claude/nice-allen-aFq38` branch.
2. Framework preset is auto-detected as **Next.js**. Build/output settings need
   no changes.
3. (Optional) Set `NEXT_PUBLIC_SITE_URL` to your final URL — it defaults to
   `https://flowsyncdriver.com` and feeds canonical/OG tags, `sitemap.xml`, and
   `robots.txt`.
4. Add the custom domain `flowsyncdriver.com` in **Project → Settings → Domains**
   and point your registrar's DNS at Vercel (an `A` record to `76.76.21.21`, or a
   `CNAME` to `cname.vercel-dns.com` for the `www` subdomain).

> **Two layers:** the marketing/demo flows (multi-step `/signup`, the gamified dashboard,
> the P&L and quote tools) run client-side in `localStorage`. The **authenticated app**
> — `/signin`, `/account`, `/profile`, `/find-a-driver`, `/d/[id]`, bookings, and Stripe
> checkout — is backed by Postgres + Stripe + Resend + Vercel Blob once the env vars from
> [`docs/PHASE2-SETUP.md`](docs/PHASE2-SETUP.md) are set. Without keys it degrades gracefully
> (demo confirmations, inline file storage) so the app still builds and runs.
