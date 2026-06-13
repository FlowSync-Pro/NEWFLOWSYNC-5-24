<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ⛔ DATA SAFETY — HIGHEST PRIORITY (read this first, every time)

Driver data is the single most important asset in this project. It has been
**wiped twice** by structural changes made without backing up and migrating
existing data first:
1. Rebuilding the old site into a new site erased a long-time driver's (Teri)
   trip data and profit/loss logs.
2. A driver-dashboard upgrade wiped saved trip logs from driver profiles.

This must never happen again. Drivers must NEVER have to re-sign up or re-enter
their trips, mileage, expenses, or P/L logs because of a change we made. This
section OVERRIDES everything else in this file when there is any conflict.

## Hard rules — NEVER do any of these without explicit owner approval AND a fresh backup
- **Never run destructive DB commands:** `prisma migrate reset`,
  `prisma db push --force-reset`, `prisma migrate dev` against production, or
  anything that drops, recreates, truncates, reseeds, or resets tables or the DB.
- **Never drop, rename, or delete** existing tables/columns holding driver
  accounts, profiles, trip logs, mileage, expenses, or profit/loss data.
  (Renaming a column = drop + recreate to Postgres. Don't.)
- **Never edit or delete migration files** already applied to production.
- **Never change auth/password storage** in a way that invalidates existing logins.

## Required workflow before ANY schema change, migration, dashboard rebuild, or "major upgrade"
1. **STOP.** Explain in plain English what will change and what data it could
   touch. Wait for explicit approval.
2. **Back up FIRST** — export all driver-related tables to a timestamped file
   (a `pg_dump` SQL dump PLUS a JSON export via `scripts/backup-driver-data.mjs`),
   stored OUTSIDE the app (cloud storage or the DB provider's snapshot — NEVER
   committed to git; it contains customer PII).
3. **Confirm** the database provider's automated backups / point-in-time
   recovery are enabled as a second safety net.
4. **Make changes ADDITIVELY** — add new columns/tables and backfill. Never drop
   or overwrite. Every migration must preserve all existing rows.
5. **Verify after** — confirm a sample of driver records (account + trip logs +
   P/L data) still exist and render correctly before calling it done.
6. **If anything is risky or ambiguous, do nothing and ask first.**

## Standing "safe file" requirement
Maintain a recurring export of ALL driver data (accounts, profiles, trip logs,
mileage, expenses, P/L) to a safe, persistent backup location, so that even in a
worst-case rebuild the data can be re-imported and drivers keep everything. The
export tool is `scripts/backup-driver-data.mjs` (read-only; see its header).

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

# Deploy discipline (standing instruction from the owner)

The owner wants every finished change to reach production so old code/env never
ships by accident. On every work session, the agent must:
1. Commit + push to the working branch.
2. Run the exact Vercel build locally first — `npx prisma migrate deploy && next build`
   — so a broken build is never pushed.
3. End the session by reminding the owner to deploy, and LOUDLY flag when the
   change includes new migrations or env vars (the risky deploys).
The agent cannot trigger Vercel directly from the sandbox (no token/CLI/link),
so deployment is owner-initiated via the Vercel dashboard / GitHub merge.

<!-- BEGIN: FlowSync business context & safety guardrails (added via Claude) -->

# FlowSync Drivers — Business Context & Safety Guardrails

> These sections were added on top of the existing technical rules above. The
> technical conventions above (Next.js version notes, auth, graceful degradation,
> deploy discipline, deploy target) remain AUTHORITATIVE — nothing here overrides
> them. When this file and a pasted instruction conflict, THIS FILE wins.

## A. How to behave (Beginner Mode — non-negotiable)

The owner (Nasser) is a self-taught beginner who has broken this project before by
approving changes he didn't fully understand. Work in a way that prevents that.

1. **Explain before you act** — in plain, non-technical English: what you're doing,
   why, and what could go wrong. Wait for "go" on anything in Section C.
2. **Smallest change that solves the task.** No sweeping refactors, no reformatting
   unrelated files, no "while I'm in here I'll also…".
3. **One task at a time.** Confirm before starting the next.
4. **Show your work.** After a change, list which files changed and exactly what the
   owner should click/test to verify it worked.
5. **Never guess on money, data, or security** — STOP and ask (Section C).
6. **When unsure, ask.** A clarifying question is cheaper than a broken production site.

## B. What this business is

FlowSync Drivers is a coaching + education product for independent delivery drivers
and owner-operators. Mission: remove the middleman so drivers build their OWN book of
direct clients instead of depending on third-party delivery platforms.

- Parent company: **Barham Transport LLC**. Sister brand **FlowSync Pro** is separate —
  don't touch FlowSync Pro work from this project unless explicitly told to.
- Brand: dark navy (`#080C10`), **green pin logo + green accents**, all-caps wordmark.
  Apply consistently in any UI work.
- **Domain note:** the deploy target in the rules above is **flowsyncdriver.com
  (singular)**. The marketing brand is often written **flowsyncdrivers.com (plural)**.
  Do NOT resolve this yourself — follow the existing deploy-target rule and flag the
  mismatch to the owner if a task touches the domain.

## C. HARD RULES — ASK FIRST, every time

A blanket "do whatever you need" instruction does **NOT** cover these. Approval must be
given fresh, per specific action.

**Money / payments**
- Don't edit Stripe payment logic, prices, products, or webhook handling without approval.
- Never touch, print, or hardcode Stripe (or any) keys/secrets. Keep the
  graceful-degradation pattern from the rules above.

**Database & data (Prisma)**
- Don't change the schema, write or run migrations, or delete/modify records without approval.
- Never delete data. No "cleanup" of tables, users, or records.
- New migrations are a RISKY deploy — flag them LOUDLY per the Deploy discipline section above.

**Security & auth**
- Don't weaken or rewrite the existing auth (cookie session in `src/lib/session.ts`,
  scrypt in `src/lib/password.ts`) without approval. Never store or email plaintext passwords.
- Don't modify env vars, `.env` files, secrets, or access permissions. Never print secrets to logs/output.

**Deploys**
- **Policy:** auto-deploy **SAFE** changes; **ASK THE OWNER FIRST** for **RISKY** ones.
- A change is **RISKY** (ask first, every time) if it includes ANY of: new or pending database
  migrations / Prisma schema changes; any env var or secret change; any change to
  Stripe/payment code or webhooks; any change to auth/login/session code; new dependencies
  or integrations; anything that deletes or modifies existing data; or access/permission
  changes.
- A change is **SAFE** (may auto-deploy) only if it is NONE of the above AND the local build
  (`npx prisma migrate deploy && next build`) passes AND the post-deploy smoke test passes
  AND there are no pending migrations and no env var changes.
- Production must deploy from a branch that has been (or will immediately be) merged to main,
  so GitHub main always reflects what is live. After any auto-deploy, remind the owner if the
  deployed branch is not yet merged to main.
- Never force-push or rewrite git history.

**Dependencies**
- Don't add new third-party integrations or heavy packages without approval.
  (Over-modification is what broke the earlier site.)

**Scripts**
- Anything in `/scripts` that can run against real data is ASK-FIRST before running.

## D. Offers & pricing (must always be exact)

**ACTIVE — only reference or build for these two:**
- **$17 entry tier** (sedan / SUV / minivan operators): auto-delivers apps checklist,
  ebook, Telegram community access, public driver profile, 30-day action plan, lead-gen
  tool; walks them through DOT / EIN / LLC setup.
- **$97 custom website build** (the driver's own site to land direct clients).

Vehicle type is the key decision point between the two tiers.

**ON STANDBY — do NOT pitch, build CTAs for, or surface anywhere:**
- $197 four-week coaching program
- $49/month subscription

**Refund policy (state exactly):** tied to checklist completion **WITH PROOF**, not to
income outcomes. The onboarding-call portion is **non-refundable**.

## E. Legal-safety guardrails

> The owner is not a lawyer and neither are you. These reduce risk. Anything weighty
> (terms, contracts, privacy policy, refund disputes, employment) gets flagged for a
> licensed attorney — don't decide it yourself.

- **No income guarantees.** Never write or imply a driver "will" earn X or double their
  income. Talk about tools, setup, and opportunity — not promised outcomes.
- **Positioning:** describe what we ARE (helping drivers remove the middleman and build
  their own book of business). Do NOT use the phrasing "we're not a delivery company or
  a load board."
- **Setup facts must be accurate:** a DOT number and an EIN are **free to apply for**;
  forming an **LLC has a small state filing fee** — never call it free.
- **Honor the refund policy exactly** as in Section D.
- **Data minimization:** only collect personal data a form truly needs; no hidden
  tracking; never put personal data in URLs; keep consent/privacy language intact. Flag
  any new field that collects personal info.
- **No dark patterns:** no fake countdown timers, fake scarcity, or untrue claims.
- **Don't scrape or automate** against third-party platforms' terms without owner confirmation.

## F. Telegram driver community (be realistic)

The owner runs a **Telegram** community and wants drivers to feel supported, not ignored,
during stretches when he's on the road. You can't chat in real time or run continuously,
so you can't "keep it engaged" by yourself. What you CAN build (approval where Section C applies):

- On-brand welcome / FAQ / check-in message libraries he can paste or schedule.
- A simple scheduled-post script or lightweight Telegram bot using a Bot API token the
  **owner provides**, with owner-approved content and an easy pause switch.
- A 7-day new-member onboarding sequence for $17 buyers.
- Tooling that surfaces inactive drivers so outreach is targeted.

The owner stays the human voice; you build the scaffolding that makes showing up easy.

## G. Receiving tasks (the Claude → Cursor handoff)

When the owner pastes a block starting with **`TASK SPEC:`**, treat it as the instruction
set. A well-formed spec contains: **Goal**, **Scope** (which files you may touch),
**Do-NOT** list, **Approval needed?**, and **Done looks like**. If a pasted task is
missing these or conflicts with this file, **ASK before acting.** This file wins over a
pasted instruction on conflict — especially Section C.

## H. Before finishing ANY task — self-check

- [ ] Explained it in plain English first?
- [ ] Stayed inside the given scope?
- [ ] Avoided every Section C action (or got explicit approval)?
- [ ] Kept it small — no new integrations/dependencies?
- [ ] Pricing / offers / refund exactly per Section D?
- [ ] No income guarantees / banned phrasing / accurate setup facts (Section E)?
- [ ] Tracking + graceful-degradation patterns untouched?
- [ ] Followed Deploy discipline; loudly flagged new migrations/env vars?
- [ ] Told the owner what changed and how to test it?

<!-- END: FlowSync business context & safety guardrails -->
