# FlowSync

A fresh, dark/premium marketing + onboarding mockup for **FlowSync** — a driver-owned
marketplace for every kind of delivery and errand. Built with Next.js (App Router),
TypeScript, and Tailwind CSS v4, designed to deploy on **Vercel** with zero config.

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

## Deploy to Vercel

This is a standard Next.js app and deploys to Vercel with no configuration:

1. Import the repository in Vercel.
2. Framework preset is auto-detected as **Next.js**.
3. Deploy — no environment variables required.

> This is a mockup. The signup flow stores profile data only in the browser's
> `localStorage` and never sends it anywhere.
