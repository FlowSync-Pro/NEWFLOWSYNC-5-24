import type { KnowledgeCandidate } from "@/lib/telegram-utils";

// Owner-approved baseline only. Draft offers and external handoff documents must
// never be added here unless the governing business rules are updated first.
export const TELEGRAM_BASELINE_FAQS: KnowledgeCandidate[] = [
  {
    id: "baseline-entry-offer",
    question: "What is included in the $17 FlowSync driver offer?",
    keywords: ["$17", "17 dollars", "entry tier", "driver pack", "what is included"],
    answer:
      "The $17 entry tier is for sedan, SUV, and minivan operators. It includes the apps checklist, ebook, Telegram community access, a public driver profile, a 30-day action plan, the lead-generation tool, and guidance for DOT, EIN, and LLC setup.",
  },
  {
    id: "baseline-website-offer",
    question: "What is the $97 website offer?",
    keywords: ["$97", "97 dollars", "website", "custom site"],
    answer:
      "The $97 offer is a custom website build for the driver’s own business, designed to help the driver present their services and land direct clients.",
  },
  {
    id: "baseline-refund",
    question: "How does the FlowSync refund policy work?",
    keywords: ["refund", "money back", "guarantee", "cancel purchase"],
    answer:
      "Refund eligibility is tied to completing the checklist with proof; it is not tied to income outcomes. Any onboarding-call portion is non-refundable. For a specific purchase, contact FlowSync support so Nas can review it with you.",
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
  "Welcome to the FlowSync driver community. This group is here to help independent drivers build their own book of direct clients. Start with your 30-day action plan, ask general FlowSync questions here, and the assistant will bring Nas in when a human answer is needed.";

export const TELEGRAM_PAUSED_MESSAGE =
  "The FlowSync assistant is temporarily paused. Your question has not been answered automatically; please try again later or wait for Nas to respond.";
