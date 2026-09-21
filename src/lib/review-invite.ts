import { createHmac, timingSafeEqual } from "node:crypto";

// Review invites are signed links, not database rows. The owner sends one to a
// driver who is actively running loads with us; only a valid, unexpired invite
// for the signed-in driver unlocks the review form. Stateless on purpose: no
// schema change, nothing to clean up, and a leaked link is useless to anyone
// who isn't signed in as that exact driver.
//
// Token shape: `<userId>.<expiryMs>.<sig>` where sig = HMAC-SHA256 over
// "review-invite:<userId>.<expiryMs>". The "review-invite:" prefix keeps these
// tokens from ever being mistaken for a session cookie, which uses the same
// AUTH_SECRET but a different payload shape.

export const REVIEW_INVITE_DAYS = 90;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

function sign(userId: string, exp: number): string {
  return createHmac("sha256", getSecret()).update(`review-invite:${userId}.${exp}`).digest("base64url");
}

export function createReviewInviteToken(userId: string): string {
  const exp = Date.now() + REVIEW_INVITE_DAYS * 86_400_000;
  return `${userId}.${exp}.${sign(userId, exp)}`;
}

/** Returns the invited user's id, or null if the token is malformed, forged, or expired. */
export function verifyReviewInviteToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (!userId || !Number.isFinite(exp) || exp < Date.now()) return null;
  const expected = sign(userId, exp);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

/** True when `token` is a valid invite for exactly this signed-in user. */
export function inviteMatchesUser(token: string | null | undefined, userId: string): boolean {
  return verifyReviewInviteToken(token) === userId;
}
