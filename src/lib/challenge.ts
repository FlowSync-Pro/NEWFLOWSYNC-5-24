import { listingPrice } from "@/lib/pricing";

// The First-$47 Challenge (owner-approved 2026-10-02): a 7-day, step-by-step
// plan aimed at landing the job that pays the listing back. A GOAL, not a
// promise (AGENTS.md §E) — and it has NOTHING to do with refunds: the 30-day,
// no-questions money-back guarantee applies either way (§D). Progress lives in
// the driver's existing Roadmap record (User.roadmapData.tasks) — no schema.
//
// Client-safe: no server imports.

export const CHALLENGE_DAYS = 7;

/**
 * New buyers only (owner decision): drivers whose first paid listing/fleet
 * payment is at or after this moment (owner approval) see the challenge.
 * Moving it earlier would show it to existing drivers.
 */
export const CHALLENGE_STARTS_AT = new Date("2026-10-02T08:25:00Z");

/** "First-$47 Challenge" — the dollar amount always follows the real listing price. */
export const challengeName = () => `First-$${listingPrice()} Challenge`;

export interface ChallengeStep {
  id: string;
  day: number;
  label: string;
  detail: string;
  href?: string;
  /** Show the copy-ready share message (needs the driver's public profile link). */
  share?: "personal" | "group";
}

/** Only things a $47 Verified buyer can open — no Premium-only guides. */
export const CHALLENGE_STEPS: ChallengeStep[] = [
  { id: "c47-1", day: 1, label: "Finish your profile", detail: "Upload your license and insurance so we can approve you — you go live in the directory once we do.", href: "/account/edit" },
  { id: "c47-2", day: 2, label: "Set your prices", detail: "Price a typical job with the quote calculator, then fill in My Services so customers see what you do and what it costs.", href: "/account/services" },
  { id: "c47-3", day: 3, label: "Send your profile link to 10 people you know", detail: "Friends, family, old coworkers, local businesses. A copy-ready text is below.", share: "personal" },
  { id: "c47-4", day: 4, label: "Post your service in 2 local groups", detail: "Nextdoor and a local Facebook group are good starts. A copy-ready post is below.", share: "group" },
  { id: "c47-5", day: 5, label: "Start your carrier setup", detail: "USDOT and EIN (both free to apply for), or sign up as a carrier on Curri and Dispatch — your guides walk you through it.", href: "/grow/sign-up-as-a-carrier-curri-dispatch" },
  { id: "c47-6", day: 6, label: "Follow up", detail: "Message everyone who replied and offer a time slot for a first job." },
  { id: "c47-7", day: 7, label: "Ask your first customer for a review", detail: "No job yet? Ask in the Telegram group what's working in your area." },
];

/** Optional self-report button — shown to the owner in /admin/challenge. */
export const CHALLENGE_MADE_IT_ID = "c47-made";

/** Day of the challenge (1-based) for someone who paid at `paidAt`; null once it's over. */
export function challengeDay(paidAt: Date, now: Date = new Date()): number | null {
  const day = Math.floor((now.getTime() - paidAt.getTime()) / 86_400_000) + 1;
  return day >= 1 && day <= CHALLENGE_DAYS ? day : null;
}

export function shareMessage(kind: "personal" | "group", profileUrl: string): string {
  return kind === "personal"
    ? `Hey! I just started my own delivery business — same-day pickups and drop-offs around town. If you or anyone you know ever needs something moved or delivered, you can book me here: ${profileUrl}`
    : `Local, independent delivery driver here. Same-day pickups and drop-offs — packages, store runs and more. I set fair prices and show up on time. See my services and book me directly: ${profileUrl}`;
}
