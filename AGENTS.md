<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project state & where to continue

Phase 1 (marketing + onboarding frontend) and Phase 2 (real backend) are built and verified
locally. Before changing code, read **`ROADMAP.md`** (status, checkbox by checkbox) and
**`docs/PHASE2-SETUP.md`** (the deploy runbook). The immediate next step is deploying a Vercel
preview — provision Postgres + Blob, set env vars (see `.env.example`), `npx prisma migrate
deploy`, wire the Stripe webhook, smoke-test on `*.vercel.app`.

Key conventions already chosen (don't undo without reason):
- **Auth** is a self-contained cookie session (`src/lib/session.ts`, scrypt in `src/lib/password.ts`),
  not Auth.js — the sandbox couldn't install `next-auth`. The Prisma schema keeps the Auth.js
  adapter tables if a future swap is wanted.
- **External services degrade gracefully** when keys are absent: Stripe (`src/lib/stripe.ts`),
  Resend (`src/lib/email.ts`), and Vercel Blob (`src/lib/storage.ts`) all no-op/fall back so the
  app builds and runs without secrets. Keep that pattern.
- DB access stays in server actions / route handlers / `force-dynamic` pages so `next build`
  never needs a database.
- Deploy target is **flowsyncdriver.com** (singular) — never the existing `flowsyncdrivers.com`.
