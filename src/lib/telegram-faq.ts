import type { KnowledgeCandidate } from "@/lib/telegram-utils";

// Owner-approved baseline only. Draft offers and external handoff documents must
// never be added here unless the governing business rules are updated first.
export const TELEGRAM_BASELINE_FAQS: KnowledgeCandidate[] = [
  {
    id: "baseline-entry-offer",
    question: "What is included in the FlowSync driver listing?",
    keywords: ["$17", "17 dollars", "$47", "47 dollars", "price", "entry tier", "driver pack", "what is included"],
    // Kept in sync with what the site actually delivers today (VALUE_STACK in
    // lib/pricing.ts and the guide library in lib/guides.ts). Do not list
    // anything here that a driver cannot open in their account after paying.
    answer:
      "The one-time Verified listing ($47) includes a public driver profile in the FlowSync directory, your own service menu with custom pricing, the setup guides (how to get your USDOT number and EIN for free, how to file an LLC, medical courier requirements and licenses, and how to sign up with Curri and Dispatch as a carrier instead of a gig driver), the driver roadmap, and Telegram community access. Premium ($97 one-time including the listing; $50 if you take the offer shown right after buying Verified) adds the bidding calculator, the business profit and loss tracker, every other guide including how to run an ad, the Curri mastermind course, the Premium badge, priority placement, and a website link. Drivers who bought before the change keep everything they had. Both are backed by a 30-day money-back guarantee.",
  },
  {
    id: "baseline-vehicles",
    question: "What vehicles can join FlowSync?",
    keywords: ["vehicle", "car", "sedan", "SUV", "pickup", "van", "sprinter", "box truck", "qualify"],
    answer:
      "FlowSync works for sedans, SUVs, pickups, minivans, cargo vans, sprinter vans, and box trucks — there is a service type for each. Pick the services that match what you drive when you set up your profile.",
  },
  {
    id: "baseline-website-offer",
    question: "What is the $97 Premium upgrade?",
    keywords: ["$97", "97 dollars", "premium", "website", "custom site", "upgrade"],
    answer:
      "Premium is $97 one-time and includes the Verified listing. It adds the bidding calculator, the business profit and loss tracker (cost per mile, rate per mile, net income by week, month and quarter), every guide including how to run an ad for your delivery business, the Curri mastermind course, a Premium badge with elevated styling, priority placement above other drivers in the directory, and the ability to link your own external website. Right after buying Verified there is a one-time offer to add Premium for $50; after that it is $97 from your account.",
  },
  {
    id: "baseline-refund",
    question: "How does the FlowSync refund policy work?",
    keywords: ["refund", "money back", "guarantee", "cancel purchase"],
    // Deliberately points at the guarantee shown at checkout rather than
    // restating terms here, so the bot can never contradict what the buyer was
    // actually promised on the payment page.
    answer:
      "The one-time listing is backed by a 30-day money-back guarantee — the terms shown at checkout are the ones that apply to your purchase. Refunds are never tied to income outcomes. For a specific purchase, contact FlowSync support and Nas will review it with you.",
  },
  {
    id: "baseline-dot-ein-llc",
    question: "Are a DOT number, EIN, and LLC free?",
    keywords: ["DOT", "USDOT", "EIN", "LLC", "business setup", "filing fee"],
    answer:
      "A DOT number and an EIN are free to apply for. Forming an LLC has a small state filing fee that varies by state. FlowSync provides guidance, but drivers should confirm requirements with the appropriate government agency or a qualified professional.",
  },
  {
    id: "baseline-income",
    question: "How much money will I make with FlowSync?",
    keywords: ["income", "earn", "make money", "guaranteed", "revenue", "profit"],
    answer:
      "FlowSync provides tools, setup guidance, and an opportunity to build your own book of direct clients. Results vary by driver, market, effort, pricing, and operating costs, so FlowSync does not guarantee income.",
  },
  {
    id: "baseline-purpose",
    question: "What does FlowSync help drivers do?",
    keywords: ["what is FlowSync", "how does FlowSync work", "direct clients", "middleman"],
    answer:
      "FlowSync helps independent delivery drivers remove the middleman and build their own book of direct clients through business setup guidance, practical tools, community support, and a public driver profile.",
  },
  {
    id: "baseline-community",
    question: "What is the Telegram driver community for?",
    keywords: ["Telegram", "community", "group", "support", "driver community"],
    answer:
      "The Telegram community gives FlowSync drivers a place to ask general questions, share progress, and stay connected. Nas remains the human voice, and questions the assistant cannot answer are sent to him privately for guidance.",
  },
];

export const TELEGRAM_WELCOME_MESSAGE =
  "Welcome to the FlowSync driver community. This group is here to help independent drivers build their own book of direct clients. Start with the roadmap in your account, work through the guides, ask general FlowSync questions here, and the assistant will bring Nas in when a human answer is needed.";

export const TELEGRAM_PAUSED_MESSAGE =
  "The FlowSync assistant is temporarily paused. Your question has not been answered automatically; please try again later or wait for Nas to respond.";
