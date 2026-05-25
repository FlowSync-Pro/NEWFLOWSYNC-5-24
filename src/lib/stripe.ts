import Stripe from "stripe";

// Lazily instantiate so the app builds/runs without Stripe keys (the mockup
// stays functional). Returns null when STRIPE_SECRET_KEY isn't set.
let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) client = new Stripe(key);
  return client;
}

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
