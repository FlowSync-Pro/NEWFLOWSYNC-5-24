export type GuideCategory = "foundation" | "money" | "marketing";

export interface GuideSection {
  heading: string;
  body?: string[];
  steps?: string[];
  tip?: string;
}

export interface Guide {
  slug: string;
  category: GuideCategory;
  title: string;
  excerpt: string;
  metaDescription: string;
  readMinutes: number;
  sections: GuideSection[];
  cta?: { label: string; href: string; note: string };
}

export const CATEGORY_LABEL: Record<GuideCategory, string> = {
  foundation: "Business foundation",
  money: "Money & taxes",
  marketing: "Marketing your business",
};

const DOT_EIN_CTA = {
  label: "Get listed for $17",
  href: "/pricing",
  note: "Get listed for a one-time $17 — the full DOT & EIN setup guide is included, and you set your own rates.",
};

const GET_LISTED_CTA = {
  label: "Get listed for $17",
  href: "/pricing",
  note: "List your profile in the FlowSync directory and take direct bookings — you set your own rates.",
};

const PNL_CTA = {
  label: "Track it with your P&L tool",
  href: "/tools/profit-loss",
  note: "Your FlowSync Profit & Loss tracker does this math for you — log income and expenses and see your real take-home.",
};

export const GUIDES: Guide[] = [
  {
    slug: "get-dot-and-ein-free",
    category: "foundation",
    title: "How to get your USDOT number and EIN for free",
    excerpt:
      "Skip the $300+ filing services. Here's how to get your EIN and USDOT number straight from the government at no cost.",
    metaDescription:
      "Step-by-step guide to getting your EIN and USDOT number for free as a delivery driver — no paid filing service required.",
    readMinutes: 6,
    sections: [
      {
        heading: "Get your EIN free from the IRS",
        body: [
          "An EIN (Employer Identification Number) is your business's tax ID. It's free, takes about 10 minutes, and you get it instantly online.",
        ],
        steps: [
          "Go to the official IRS website and search 'apply for an EIN online'.",
          "Choose 'Sole Proprietor' (or LLC if you've formed one) as your entity type.",
          "Enter your name, SSN, and business address.",
          "Download and save the confirmation letter (CP-575) the moment it's issued.",
        ],
        tip: "Only use IRS.gov. Any site charging a fee for an EIN is reselling a free government service.",
      },
      {
        heading: "Decide if you need a USDOT number",
        body: [
          "You generally need a USDOT number if you operate a commercial vehicle across state lines or over certain weight limits. Many local delivery drivers don't — but moving, hauling, and box-truck operators often do.",
          "Check your state's rules too: some states require a DOT number for intrastate commercial vehicles.",
        ],
      },
      {
        heading: "Register for your USDOT number",
        steps: [
          "Create a login on the FMCSA registration portal.",
          "Complete the MCSA-1 form with your business and vehicle details.",
          "Submit — registration itself is free; you'll receive your USDOT number.",
        ],
        tip: "Keep your EIN handy — you'll use it during DOT registration.",
      },
    ],
    cta: DOT_EIN_CTA,
  },
  {
    slug: "llc-sole-prop-or-dba",
    category: "foundation",
    title: "LLC, sole proprietor, or DBA: how to structure your delivery business",
    excerpt:
      "A plain-English breakdown of the three most common setups for a one-person delivery business — and when each makes sense.",
    metaDescription:
      "Compare LLC, sole proprietor, and DBA structures for a delivery business. Understand liability, taxes, and cost before you choose.",
    readMinutes: 5,
    sections: [
      {
        heading: "Sole proprietor (the default)",
        body: [
          "If you start working without filing anything, you're a sole proprietor. It's free and simple, but your personal assets aren't separated from the business.",
        ],
      },
      {
        heading: "DBA ('doing business as')",
        body: [
          "A DBA just lets you operate under a business name (e.g., 'Rivera Rapid Delivery') instead of your legal name. It doesn't create liability protection — it's branding.",
        ],
      },
      {
        heading: "LLC (limited liability company)",
        body: [
          "An LLC separates your personal assets from your business. If your business is sued, your personal savings and home are generally protected.",
          "It costs a state filing fee (often $50–$200) and a little paperwork, but it's the most common upgrade once a driver is earning steadily.",
        ],
        tip: "Many drivers start as a sole proprietor, then form an LLC once they're consistently booked. There's no wrong order — just don't skip insurance.",
      },
    ],
    cta: GET_LISTED_CTA,
  },
  {
    slug: "insurance-delivery-drivers-need",
    category: "foundation",
    title: "The insurance every delivery driver actually needs",
    excerpt:
      "Personal auto policies often exclude delivery work. Here are the coverages that keep you protected on the job.",
    metaDescription:
      "Learn which insurance delivery drivers need: commercial auto, cargo, and liability — and why personal policies may not cover delivery work.",
    readMinutes: 5,
    sections: [
      {
        heading: "Why your personal policy may not be enough",
        body: [
          "Most personal auto policies exclude 'business use.' If you're in an accident while delivering, a claim can be denied — leaving you to pay out of pocket.",
        ],
      },
      {
        heading: "Coverages to ask about",
        steps: [
          "Commercial auto or a 'business use' rider on your existing policy.",
          "Cargo insurance if you carry customer goods (essential for furniture, moving, auto parts).",
          "General liability for damage or injury that happens during a job.",
        ],
        tip: "Call your current insurer first and ask for a delivery/business-use rider — it's often cheaper than a separate policy.",
      },
      {
        heading: "Keep proof handy",
        body: [
          "Customers trust verified drivers. Keep a current insurance document ready to upload to your FlowSync profile — it's one of the biggest trust signals you can show.",
        ],
      },
    ],
    cta: GET_LISTED_CTA,
  },
  {
    slug: "mistakes-new-delivery-drivers-make",
    category: "foundation",
    title: "9 mistakes new delivery drivers make (and how to avoid them)",
    excerpt:
      "The avoidable errors that cost new drivers money and customers in their first 90 days.",
    metaDescription:
      "The most common mistakes new delivery and errand drivers make when starting out — and exactly how to avoid each one.",
    readMinutes: 7,
    sections: [
      {
        heading: "Pricing and money mistakes",
        steps: [
          "Quoting too low because you forgot mileage, time, and wear-and-tear — use a calculator every time.",
          "Spreading yourself across five apps that each take 20–40% instead of building direct customers.",
          "Not tracking income vs. expenses, so you never know your real take-home.",
        ],
      },
      {
        heading: "Trust and professionalism mistakes",
        steps: [
          "Skipping insurance and a clean, verified profile.",
          "Poor communication — not confirming pickup, ETA, or substitutions.",
          "No reviews strategy — forgetting to ask happy customers to leave a rating.",
        ],
      },
      {
        heading: "Growth mistakes",
        steps: [
          "Waiting for an app to send work instead of marketing locally.",
          "Treating it like a gig instead of a business with repeat customers.",
          "Never setting a goal — drivers who track a monthly target earn measurably more.",
        ],
        tip: "Fixing just the pricing and direct-customer mistakes can double your effective hourly pay.",
      },
    ],
    cta: GET_LISTED_CTA,
  },
  {
    slug: "quarterly-taxes-for-delivery-drivers",
    category: "money",
    title: "Quarterly taxes for 1099 delivery drivers, made simple",
    excerpt:
      "As an independent driver, no one withholds taxes for you. Here's how estimated quarterly taxes work — and how to never get a surprise bill.",
    metaDescription:
      "A plain-English guide to estimated quarterly taxes for 1099 delivery and gig drivers: who owes, the four deadlines, how much to set aside, and how to pay.",
    readMinutes: 6,
    sections: [
      {
        heading: "Why you owe quarterly taxes",
        body: [
          "When you drive as an independent contractor (1099), taxes aren't taken out of your pay. The IRS still wants its share throughout the year, so you pay it yourself in four estimated installments.",
          "This covers both income tax and self-employment tax (Social Security + Medicare, about 15.3%). Most drivers are caught off guard by the self-employment portion.",
        ],
        tip: "A safe rule of thumb: set aside 25–30% of your net profit (after expenses) in a separate account for taxes as you earn.",
      },
      {
        heading: "The four deadlines",
        body: [
          "Estimated taxes are due roughly four times a year — mid-April, mid-June, mid-September, and mid-January of the following year.",
          "Miss one and the IRS can charge a small underpayment penalty, so mark them on your calendar.",
        ],
      },
      {
        heading: "How to estimate and pay",
        steps: [
          "Total your income, then subtract your business expenses (mileage, fuel, tolls, supplies) to get your net profit.",
          "Set aside ~25–30% of that profit for taxes.",
          "Pay online through IRS Direct Pay or the EFTPS system each quarter — keep the confirmation.",
          "Track everything as you go so tax time is just adding up numbers you already have.",
        ],
        tip: "This is not formal tax advice — a quick session with a tax pro in year one pays for itself. But knowing the basics keeps you from a painful April surprise.",
      },
    ],
    cta: PNL_CTA,
  },
  {
    slug: "mileage-deduction-and-write-offs",
    category: "money",
    title: "The mileage deduction and write-offs that save drivers thousands",
    excerpt:
      "Every business mile you drive can lower your taxes. Here are the deductions delivery drivers most often miss — and how to track them.",
    metaDescription:
      "A guide to tax write-offs for delivery drivers: the standard mileage deduction, what counts as a business mile, and the expenses you can legally deduct.",
    readMinutes: 5,
    sections: [
      {
        heading: "The mileage deduction is your biggest win",
        body: [
          "The IRS lets you deduct a set amount for every business mile you drive (the standard mileage rate). For an active driver that can add up to thousands of dollars off your taxable income.",
          "A business mile is any mile driven for work — driving to a pickup, between jobs, and on a delivery. Your commute from home to your first job generally doesn't count, so know the difference.",
        ],
        tip: "You usually choose between the standard mileage rate OR actual vehicle expenses — not both. For most drivers with an older car, the mileage rate wins.",
      },
      {
        heading: "Other write-offs drivers forget",
        steps: [
          "Phone and data plan (the business-use percentage).",
          "Hot bags, dollies, moving blankets, straps, and supplies.",
          "Tolls and parking paid on the job.",
          "A percentage of car washes, maintenance, and your insurance if you use actual expenses.",
          "Fees and commissions you pay to platforms.",
        ],
      },
      {
        heading: "Track it or lose it",
        body: [
          "The deduction is only as good as your records. If you can't show the miles and expenses, you can't safely claim them.",
          "Log every trip's miles and costs the day you drive — reconstructing it at tax time is where drivers leave money on the table.",
        ],
        tip: "Your FlowSync trip tracker records loaded and deadhead miles per trip, and the P&L tool totals your deductible expenses for you.",
      },
    ],
    cta: PNL_CTA,
  },
  {
    slug: "price-your-jobs-for-profit",
    category: "money",
    title: "How to price your jobs so you actually profit",
    excerpt:
      "Most drivers underprice, burn out, and quit. Here's how to set rates that cover your costs and pay you what you're worth.",
    metaDescription:
      "Learn how delivery drivers should price jobs: cover mileage and time, account for deadhead miles, and set rates that leave real profit after expenses.",
    readMinutes: 5,
    sections: [
      {
        heading: "Price the whole job, not just the drop-off",
        body: [
          "The most common mistake is quoting only for the delivery itself. You also drive to the pickup and back home empty — those 'deadhead' miles cost you fuel and time with no pay attached unless you build them into your rate.",
          "Add up your time, all your miles (loaded and deadhead), fuel, tolls, and wear on the vehicle before you quote.",
        ],
      },
      {
        heading: "Build in profit, not just break-even",
        body: [
          "Covering costs isn't a business — it's a job that's slowly wearing out your car. Add a profit margin on top so each job moves you forward.",
          "Know your floor: the minimum you'll accept for a job. Below it, politely pass. Drivers who hold their floor earn more than drivers who chase every cheap job.",
        ],
        tip: "Use the FlowSync fair-quote calculator to price every job in seconds so you're never guessing.",
      },
      {
        heading: "Raise rates as your reviews grow",
        body: [
          "When you have reviews and repeat customers, you've earned the right to charge more. Reputation is leverage — use it.",
          "You don't compete on being the cheapest. You compete on being reliable, professional, and easy to book again.",
        ],
        tip: "A driver with 20 five-star reviews can charge noticeably more than a brand-new one for the exact same job.",
      },
    ],
    cta: {
      label: "Open the quote calculator",
      href: "/calculator",
      note: "Price any job fairly in seconds with the FlowSync calculator — you set the number.",
    },
  },
  {
    slug: "get-your-first-10-reviews",
    category: "money",
    title: "Get your first 10 reviews (and why they 10x your bookings)",
    excerpt:
      "Reviews are the single biggest driver of new bookings. Here's a simple system to earn your first ten and keep them coming.",
    metaDescription:
      "How delivery drivers can get their first reviews: when to ask, how to ask, and why a handful of five-star ratings dramatically increases bookings.",
    readMinutes: 4,
    sections: [
      {
        heading: "Why reviews matter more than anything",
        body: [
          "Customers choosing a driver they've never met rely on social proof. A profile with even a handful of five-star reviews gets booked far more often than an empty one — often several times more.",
          "Reviews compound: more reviews → more bookings → more reviews. The first ten are the hardest and the most valuable.",
        ],
      },
      {
        heading: "A simple system to earn them",
        steps: [
          "Do the job a little better than expected — communicate ETA, handle items with care, send a quick 'delivered!' note.",
          "Ask every happy customer in the moment: 'If you were happy with today, a quick review really helps my small business.'",
          "Make it easy — hand them the direct link to your FlowSync profile.",
          "Start with friends, family, and neighbors for your very first jobs and first reviews.",
        ],
        tip: "The best time to ask is right after a smooth delivery, while the customer is still smiling. Don't wait.",
      },
      {
        heading: "Turn reviews into repeat business",
        body: [
          "A customer who leaves a review is telling you they'd book you again. Save their info and check in before the next holiday, move, or big grocery week.",
          "Ten reviews and a few repeat customers is the difference between quitting in a month and building a real business.",
        ],
        tip: "Keep your FlowSync profile sharp — a clear photo, services, and rates — so every review lands on a profile that converts.",
      },
    ],
    cta: GET_LISTED_CTA,
  },
  {
    slug: "get-customers-on-nextdoor",
    category: "marketing",
    title: "How to get delivery customers on Nextdoor",
    excerpt:
      "Nextdoor reaches the neighbors most likely to need a reliable local driver. Here's how to show up the right way.",
    metaDescription:
      "A practical guide to finding delivery and errand customers on Nextdoor — set up your business page, post without spamming, and earn recommendations.",
    readMinutes: 5,
    sections: [
      {
        heading: "Set up a business presence",
        steps: [
          "Create a Nextdoor business page with a clear name and your service area.",
          "Add a friendly photo, your services, and a link to your FlowSync profile.",
        ],
      },
      {
        heading: "Earn recommendations (the real currency)",
        body: [
          "Nextdoor runs on neighbor recommendations. After every job, ask the customer to recommend you in their neighborhood — it's worth more than any ad.",
        ],
        tip: "Reply helpfully to 'Does anyone know someone who can...' posts. Be useful first; the work follows.",
      },
      {
        heading: "Post without getting muted",
        steps: [
          "Share occasional, genuinely helpful posts (e.g., 'Senior grocery runs this week — DM me').",
          "Never spam the main feed; use your business page and local recommendations instead.",
        ],
      },
    ],
    cta: GET_LISTED_CTA,
  },
  {
    slug: "win-local-jobs-on-yelp",
    category: "marketing",
    title: "Win local delivery jobs on Yelp",
    excerpt:
      "Yelp customers are ready to hire. A complete profile and fast replies put you ahead of slower competitors.",
    metaDescription:
      "How delivery drivers can use Yelp to get hired: create a business listing, collect reviews, and respond to leads fast.",
    readMinutes: 4,
    sections: [
      {
        heading: "Claim and complete your listing",
        steps: [
          "Create a free Yelp for Business listing in the right category (courier, movers, errands).",
          "Add photos, your service area, hours, and your FlowSync booking link.",
        ],
      },
      {
        heading: "Speed wins the job",
        body: [
          "Yelp highlights fast responders. Turn on notifications and reply to requests within minutes — most jobs go to whoever answers first.",
        ],
        tip: "Ask your first few happy customers for a Yelp review. Three to five reviews dramatically increase calls.",
      },
    ],
    cta: GET_LISTED_CTA,
  },
  {
    slug: "land-gigs-on-thumbtack",
    category: "marketing",
    title: "Land delivery and hauling gigs on Thumbtack",
    excerpt:
      "Thumbtack connects you with customers who already need help today. Here's how to bid smart and protect your margin.",
    metaDescription:
      "Use Thumbtack to find delivery, moving, and hauling jobs. Learn how to set up your profile, bid efficiently, and move customers to direct booking.",
    readMinutes: 5,
    sections: [
      {
        heading: "Build a strong pro profile",
        steps: [
          "Pick the services you actually want (moving, hauling, courier, errands).",
          "Set your service area and showcase photos of past work and your vehicle.",
        ],
      },
      {
        heading: "Bid without burning money",
        body: [
          "Thumbtack charges you per lead, so don't bid on everything. Respond to well-matched, serious requests with a clear, fair quote.",
        ],
        tip: "Use your fair-quote calculator before you respond so you never underbid a Thumbtack lead.",
      },
      {
        heading: "Turn one-time leads into repeat customers",
        body: [
          "After a great job, invite the customer to book you directly through FlowSync next time — no per-lead fee, and you set the price.",
        ],
      },
    ],
    cta: {
      label: "Open the quote calculator",
      href: "/calculator",
      note: "Price every Thumbtack lead fairly before you respond.",
    },
  },
  {
    slug: "find-delivery-work-on-craigslist",
    category: "marketing",
    title: "Find delivery work on Craigslist (safely)",
    excerpt:
      "Craigslist still moves real local work — gigs, deliveries, and hauling. Here's how to use it effectively and stay safe.",
    metaDescription:
      "How to find delivery and hauling work on Craigslist safely: where to look, how to post, and red flags to avoid.",
    readMinutes: 5,
    sections: [
      {
        heading: "Where the work is",
        steps: [
          "Browse the 'gigs' (labor/moving) and 'services' sections for your city.",
          "Post your own ad in 'services' offering delivery, errands, and hauling.",
        ],
      },
      {
        heading: "Write an ad that gets replies",
        body: [
          "Lead with the outcome ('Same-day furniture delivery & hauling — insured, 5-star') and include your service area and a way to book.",
        ],
      },
      {
        heading: "Stay safe",
        steps: [
          "Meet in public or verify the job before going to a private address.",
          "Never pay 'fees' to get a gig, and avoid anyone who won't talk by phone.",
          "Get paid through a traceable method, and confirm scope in writing.",
        ],
        tip: "Move good Craigslist customers to a FlowSync booking so future jobs are tracked, reviewed, and paid cleanly.",
      },
    ],
    cta: GET_LISTED_CTA,
  },
  {
    slug: "find-recurring-work-on-indeed",
    category: "marketing",
    title: "Use Indeed to find recurring delivery contracts",
    excerpt:
      "Beyond one-off gigs, Indeed lists steady delivery and courier contracts with local businesses. Here's how to find them.",
    metaDescription:
      "How delivery drivers can use Indeed to find recurring courier, pharmacy, and auto-parts delivery contracts with local businesses.",
    readMinutes: 4,
    sections: [
      {
        heading: "Search for the right contracts",
        steps: [
          "Search 'independent contractor delivery', 'courier', 'medical courier', or 'auto parts driver' in your city.",
          "Filter for contract and part-time roles that fit around your direct customers.",
        ],
      },
      {
        heading: "Stand out as a pro, not just an applicant",
        body: [
          "Many local businesses need a reliable delivery partner. Position yourself as an insured, verified independent driver with your own vehicle — link your FlowSync profile in your application.",
        ],
        tip: "A recurring weekday contract (pharmacy or auto parts) plus weekend direct jobs is a powerful, stable mix.",
      },
    ],
    cta: GET_LISTED_CTA,
  },
  {
    slug: "sedan-drivers-earn-with-dumpling",
    category: "marketing",
    title: "Sedan drivers: stack a grocery-delivery business with Dumpling.us",
    excerpt:
      "Got a sedan or SUV? Dumpling.us lets you run your own grocery-shopping and delivery business — free to join — and it stacks perfectly with your FlowSync listing.",
    metaDescription:
      "How sedan drivers can earn more by joining Dumpling.us — a free platform to run your own grocery delivery business — and stack it with a FlowSync directory listing.",
    readMinutes: 5,
    sections: [
      {
        heading: "Why Dumpling is a great fit for sedan drivers",
        body: [
          "You don't need a truck or van to earn well. Grocery and personal-shopping deliveries fit perfectly in a regular sedan or SUV — and that's exactly what Dumpling.us is built for.",
          "Dumpling lets you run your own grocery-shopping and delivery business: you bring on your own customers, set your own schedule, and keep the relationship instead of being a faceless worker for a big app.",
        ],
        tip: "If you're already listed on FlowSync for grocery delivery, Dumpling is a natural second income stream using the same vehicle and the same skills.",
      },
      {
        heading: "It's free to sign up",
        body: [
          "Creating a Dumpling account to start is free — there's no cost to set up your shopper profile and begin building your business. (Dumpling also offers a paid Pro plan with extra business tools, but you don't need it to get going.)",
          "That means you can test grocery delivery as an income stream with zero upfront cost, then decide later whether the paid tier is worth it.",
        ],
        steps: [
          "Go to dumpling.us and sign up for a free account.",
          "Set up your shopper profile — your name, your area, and the stores you'll shop.",
          "Invite your first customers (friends, family, neighbors) to book you for a grocery run.",
          "Shop, deliver, and get paid directly — you own the customer, not an algorithm.",
        ],
      },
      {
        heading: "How Dumpling stacks with FlowSync",
        body: [
          "FlowSync gets you found: your directory listing puts you in front of local customers searching for a driver, and your fair-quote calculator and tools help you run every job like a pro.",
          "Dumpling gives you a dedicated grocery-shopping toolset for the customers you bring on yourself. Run them side by side and you've got two ways to earn from one sedan — direct bookings through FlowSync, and grocery-shopping clients through Dumpling.",
        ],
        tip: "Slow grocery day on one platform? Take a job on the other. Diversifying who you earn from is how independent drivers stay booked all week.",
      },
      {
        heading: "Make the most of both",
        steps: [
          "Use your FlowSync profile as your professional home base and share it with every customer.",
          "Bring repeat grocery customers onto Dumpling so you keep the relationship and the schedule.",
          "Track all of it — income, mileage, and expenses — in your FlowSync Profit & Loss tracker so you know your real take-home across both.",
        ],
        tip: "Customers trust drivers who look established. Linking a clean FlowSync profile makes it easy for a Dumpling customer to see you're a verified, professional driver.",
      },
    ],
    cta: GET_LISTED_CTA,
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function guidesByCategory(category: GuideCategory): Guide[] {
  return GUIDES.filter((g) => g.category === category);
}
