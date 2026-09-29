// Curri mastermind course — Premium (Tier 2) content. Structure lives here;
// the owner supplies the videos and notes. A lesson with no videoUrl renders
// as "video coming" so nothing is promised on the page that isn't there.

export interface Lesson {
  slug: string;
  title: string;
  summary: string;
  /** Loom / YouTube / Vimeo share URL. Null until the owner records it. */
  videoUrl: string | null;
  keyPoints: string[];
}

export const COURSE = {
  title: "Curri mastermind",
  intro:
    "How Barham Transport went from one rented cargo van to four Sprinters on one app — and the exact habits behind it. Watch in order; each lesson builds on the last.",
  disclaimer:
    "FlowSync and Barham Transport are independent and are not owned by, affiliated with, or part of Curri. This is our experience as a carrier, not a promise of what you'll earn. Platform rules change — read the app's current terms.",
};

export const LESSONS: Lesson[] = [
  {
    slug: "carrier-not-gig",
    title: "Carrier, not gig: the account type that changes everything",
    summary: "Why the same app pays a business three times what it pays a worker, and how to walk through the right door.",
    videoUrl: null,
    keyPoints: [
      "A gig account claims listed prices one job at a time; a carrier account bids, adds vehicles and drivers, and sees the bigger loads.",
      "What to have ready: EIN, business name, commercial auto + cargo COI, W-9, vehicle photos.",
      "How to run under our fleet's carrier account while your own application waits.",
    ],
  },
  {
    slug: "bidding",
    title: "Bidding: how a $100 listed load becomes $300",
    summary: "The math and the nerve. What a load is worth to the shipper, when to bid high, and when to let it go.",
    videoUrl: null,
    keyPoints: [
      "Never accept the listed price on a load that needs a bigger vehicle, a tight window, or a long deadhead.",
      "Use the bidding calculator: break-even first, then your hourly target, then the bid.",
      "The $100.45 / $145 / $300 load, start to finish — and why we let the other driver have it.",
    ],
  },
  {
    slug: "vehicle-classes",
    title: "List every vehicle class you can legally run",
    summary: "Loads get posted for the vehicle the shipper thinks they need, not the one the pallet actually needs.",
    videoUrl: null,
    keyPoints: [
      "A 'box truck' posting with one 400-lb pallet fits a pickup — and pays box-truck money.",
      "Only take it if the load truly fits your vehicle and the customer is fine with it.",
      "How this one habit changed our profit per mile.",
    ],
  },
  {
    slug: "two-logins",
    title: "Two logins, two devices",
    summary: "The app hides other opportunities until your current delivery is complete. Carriers can add drivers under their account; here's how we use that.",
    videoUrl: null,
    keyPoints: [
      "A second driver login on a second device lets you see what's posting near your drop-off while one login is on a run.",
      "Read the app's current terms before you do this. It's your account and your call.",
      "Keep both logins clean: violations on a carrier account affect every driver on it.",
    ],
  },
  {
    slug: "filling-the-gaps",
    title: "Filling the gaps: dollars per mile, not loyalty to an app",
    summary: "One app for the backbone, others for the dead time. How we decide what to run each hour.",
    videoUrl: null,
    keyPoints: [
      "Score every hour by dollars per mile, not by which app it came from.",
      "Scheduled routes (Dispatch-style) fill the gaps between bids.",
      "Track it all in the P&L tracker so you know your real cost per mile.",
    ],
  },
  {
    slug: "getting-paid",
    title: "Fridays: pay, fees, Stripe, and your 1099",
    summary: "Exactly how money moves from the shipper to you when you run under a carrier account.",
    videoUrl: null,
    keyPoints: [
      "Curri pays the carrier account; the carrier pays you as an independent contractor.",
      "Standard pay every Friday with a 15% dispatching fee; 20% for 1–2 business days.",
      "Stripe Connect setup, and what your 1099 looks like at year end.",
    ],
  },
];
