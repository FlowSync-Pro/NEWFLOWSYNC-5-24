// The Driver Roadmap — the "stay on track" system. Three layers:
//   1. Launch checklist  — one-time onboarding steps to a first booking
//   2. Daily habits       — the recurring routine that builds a daily streak
//   3. Milestones         — the growth path, each linked to a guide/tool/upsell
//
// Static config (like the guides). Progress is stored per-user in User.roadmapData.

export interface RoadmapTask {
  id: string;
  label: string;
  detail?: string;
  href?: string; // optional deep-link to the relevant page/tool/guide
}

export interface Milestone {
  id: string;
  label: string;
  detail: string;
  href?: string;
}

/** One-time setup steps. Completing these gets a driver to their first job. */
export const LAUNCH_CHECKLIST: RoadmapTask[] = [
  { id: "profile", label: "Complete your profile", detail: "Add your photo, bio, vehicle, and the services you offer.", href: "/account" },
  { id: "rates", label: "Set your rates", detail: "Use the quote calculator to price your services fairly.", href: "/calculator" },
  { id: "documents", label: "Upload your license & documents", detail: "Get verified so customers trust you from day one.", href: "/account" },
  { id: "services", label: "List your services", detail: "Pick every service you can offer to get found for more jobs.", href: "/account/services" },
  { id: "first-customers", label: "Invite your first customers", detail: "Share your profile with friends, family, and neighbors.", href: "/account" },
  { id: "first-review", label: "Earn your first review", detail: "Ask a happy customer for a quick rating — reviews drive bookings.", href: "/grow/get-your-first-10-reviews" },
];

/** Recurring daily/weekly habits. Checking the day logs a streak. */
export const DAILY_HABITS: RoadmapTask[] = [
  { id: "check-bookings", label: "Check for new bookings & leads", detail: "Respond fast — speed wins jobs.", href: "/account/bookings" },
  { id: "log-trips", label: "Log today's trips", detail: "Record miles and expenses while they're fresh.", href: "/account/trips" },
  { id: "update-pnl", label: "Update your Profit & Loss", detail: "Know your real take-home, every day.", href: "/tools/profit-loss" },
  { id: "ask-review", label: "Ask one customer for a review", detail: "A steady review habit compounds into more bookings.", href: "/grow/get-your-first-10-reviews" },
];

/** The growth path. Each milestone points at the guide/tool that helps reach it. */
export const MILESTONES: Milestone[] = [
  { id: "m-first-job", label: "Book your first job", detail: "Get listed and land your first booking.", href: "/grow/get-customers-on-nextdoor" },
  { id: "m-five-jobs", label: "Complete 5 jobs", detail: "Build momentum and your first reviews.", href: "/grow/get-your-first-10-reviews" },
  { id: "m-ten-reviews", label: "Reach 10 reviews", detail: "The tipping point where bookings multiply.", href: "/grow/get-your-first-10-reviews" },
  { id: "m-price-right", label: "Dial in your pricing", detail: "Make sure every job leaves real profit.", href: "/grow/price-your-jobs-for-profit" },
  { id: "m-taxes", label: "Set up your tax system", detail: "Set aside for quarterly taxes and track write-offs.", href: "/grow/quarterly-taxes-for-delivery-drivers" },
  { id: "m-llc", label: "Form your LLC", detail: "Protect your personal assets as you grow.", href: "/grow/llc-sole-prop-or-dba" },
  { id: "m-premium", label: "Upgrade to Premium", detail: "Custom service menu, premium badge, priority placement.", href: "/account/services" },
];

export interface RoadmapProgress {
  tasks: string[]; // completed launch-checklist + milestone ids
  days: string[]; // YYYY-MM-DD daily check-in dates
}

export function emptyProgress(): RoadmapProgress {
  return { tasks: [], days: [] };
}

/** Coerce whatever is in the JSON column into a safe RoadmapProgress. */
export function parseProgress(raw: unknown): RoadmapProgress {
  if (!raw || typeof raw !== "object") return emptyProgress();
  const r = raw as Record<string, unknown>;
  const tasks = Array.isArray(r.tasks) ? r.tasks.filter((x): x is string => typeof x === "string") : [];
  const days = Array.isArray(r.days) ? r.days.filter((x): x is string => typeof x === "string") : [];
  return { tasks, days };
}

export const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/** Current consecutive-day streak ending today or yesterday. */
export function currentStreak(days: string[]): number {
  if (days.length === 0) return 0;
  const set = new Set(days);
  let streak = 0;
  const cursor = new Date();
  // Allow the streak to "hold" if they haven't checked in yet today.
  if (!set.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(todayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const LAUNCH_IDS = LAUNCH_CHECKLIST.map((t) => t.id);

/** Percent of the one-time launch checklist completed (0–100). */
export function launchPercent(tasks: string[]): number {
  const done = LAUNCH_IDS.filter((id) => tasks.includes(id)).length;
  return Math.round((done / LAUNCH_IDS.length) * 100);
}
