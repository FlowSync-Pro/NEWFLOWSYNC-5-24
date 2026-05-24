export type ServiceId =
  | "grocery"
  | "food"
  | "furniture"
  | "courier"
  | "pharmacy"
  | "senior"
  | "moving"
  | "auto-parts";

export type ProfileFieldType = "text" | "textarea" | "number" | "tags" | "select";

export interface ProfileField {
  /** key stored on the profile */
  key: string;
  label: string;
  type: ProfileFieldType;
  placeholder?: string;
  /** suggestion chips the driver can tap to fill a tags/select field */
  suggestions?: string[];
  hint?: string;
}

export interface Service {
  id: ServiceId;
  name: string;
  /** short label used in compact chips */
  short: string;
  vehicle: string;
  tagline: string;
  description: string;
  /** the headline shown on the matched profile page */
  profileHeadline: string;
  earnings: string;
  demand: "High" | "Very high" | "Steady";
  tasks: string[];
  /** requirements the driver must meet */
  requirements: string[];
  /** the service-specific section rendered on the profile */
  profileSectionTitle: string;
  /** the extra fields the signup collects for this service */
  profileFields: ProfileField[];
}

export const SERVICES: Service[] = [
  {
    id: "grocery",
    name: "Grocery Shopping & Delivery",
    short: "Grocery",
    vehicle: "Sedan / SUV",
    tagline: "Shop the list, deliver the smile.",
    description:
      "Hand-pick fresh groceries from local stores and deliver them to busy households. Build a loyal base of repeat customers.",
    profileHeadline: "Personal Grocery Shopper",
    earnings: "$22 – $34 / hr",
    demand: "Very high",
    tasks: [
      "Accept shopping lists from nearby customers",
      "Hand-select produce, dairy, and pantry items",
      "Handle substitutions with quick customer chat",
      "Deliver chilled and bagged to the door",
    ],
    requirements: [
      "Reliable sedan or SUV with trunk space",
      "Cooler bags for cold items",
      "Smartphone for in-store communication",
    ],
    profileSectionTitle: "Stores I Shop & Specialties",
    profileFields: [
      {
        key: "stores",
        label: "Stores you shop at",
        type: "tags",
        placeholder: "Add a store…",
        suggestions: ["Whole Foods", "Costco", "Trader Joe's", "Kroger", "Aldi", "Local farmers market"],
      },
      {
        key: "specialties",
        label: "Shopping specialties",
        type: "tags",
        placeholder: "Add a specialty…",
        suggestions: ["Organic / fresh produce", "Gluten-free", "Bulk & warehouse", "Specialty diets", "Floral"],
      },
    ],
  },
  {
    id: "food",
    name: "Food / Restaurant Delivery",
    short: "Food",
    vehicle: "Any vehicle",
    tagline: "Hot food, fast hands.",
    description:
      "Pick up from restaurants and deliver meals fast and fresh. Flexible hours that fit lunch and dinner rushes.",
    profileHeadline: "Restaurant Delivery Pro",
    earnings: "$18 – $30 / hr",
    demand: "Very high",
    tasks: [
      "Accept orders during peak meal windows",
      "Verify order accuracy at pickup",
      "Keep food hot and upright in transit",
      "Contactless or hand-to-door delivery",
    ],
    requirements: [
      "Any vehicle, bike, or scooter",
      "Insulated delivery bag",
      "Phone mount for navigation",
    ],
    profileSectionTitle: "Cuisines & Delivery Zones",
    profileFields: [
      {
        key: "cuisines",
        label: "Cuisines you deliver",
        type: "tags",
        placeholder: "Add a cuisine…",
        suggestions: ["Pizza", "Sushi", "Burgers", "Thai", "Mexican", "Coffee & bakery"],
      },
      {
        key: "zones",
        label: "Delivery zones",
        type: "tags",
        placeholder: "Add a zone / neighborhood…",
        suggestions: ["Downtown", "Midtown", "Uptown", "University district", "Suburbs"],
      },
    ],
  },
  {
    id: "furniture",
    name: "Furniture & Large Item Delivery",
    short: "Furniture",
    vehicle: "Cargo van / Box truck",
    tagline: "Big items, handled with care.",
    description:
      "Move couches, mattresses, and large purchases from store to home. Premium pay for premium care.",
    profileHeadline: "Large Item Delivery Specialist",
    earnings: "$35 – $60 / hr",
    demand: "High",
    tasks: [
      "Pick up bulky items from stores or warehouses",
      "Secure and protect items in transit",
      "Carry up stairs and through tight doorways",
      "Basic assembly and placement on request",
    ],
    requirements: [
      "Cargo van or box truck",
      "Moving blankets, straps & dolly",
      "Able to lift 75+ lbs (or 2-person crew)",
    ],
    profileSectionTitle: "Capacity & Handling Equipment",
    profileFields: [
      {
        key: "capacity",
        label: "Max load capacity",
        type: "select",
        suggestions: ["Up to 500 lbs", "500–1,500 lbs", "1,500–3,000 lbs", "3,000+ lbs"],
      },
      {
        key: "equipment",
        label: "Equipment you carry",
        type: "tags",
        placeholder: "Add equipment…",
        suggestions: ["Furniture dolly", "Moving blankets", "Ratchet straps", "Shoulder dollies", "Tool kit"],
      },
    ],
  },
  {
    id: "courier",
    name: "Courier / Package Delivery",
    short: "Courier",
    vehicle: "Any vehicle",
    tagline: "On time, every drop.",
    description:
      "Same-day pickup and delivery of packages, documents, and parcels across town. Great for high-volume routes.",
    profileHeadline: "Same-Day Courier",
    earnings: "$20 – $32 / hr",
    demand: "Steady",
    tasks: [
      "Route multiple pickups and drop-offs",
      "Scan and confirm proof of delivery",
      "Handle time-sensitive documents",
      "Maintain chain-of-custody for parcels",
    ],
    requirements: [
      "Any reliable vehicle",
      "Smartphone for scanning & POD",
      "Clean driving record",
    ],
    profileSectionTitle: "Routes & Package Types",
    profileFields: [
      {
        key: "packageTypes",
        label: "Package types you handle",
        type: "tags",
        placeholder: "Add a type…",
        suggestions: ["Documents", "Small parcels", "Legal / signature", "Fragile", "Same-day batches"],
      },
      {
        key: "maxRoute",
        label: "Comfortable daily route radius",
        type: "select",
        suggestions: ["Within 10 mi", "Within 25 mi", "Within 50 mi", "Regional / 50+ mi"],
      },
    ],
  },
  {
    id: "pharmacy",
    name: "Pharmacy / Medical Delivery",
    short: "Pharmacy",
    vehicle: "Sedan",
    tagline: "Care that arrives on time.",
    description:
      "Deliver prescriptions and medical supplies with discretion and reliability. Trusted, verified drivers earn more.",
    profileHeadline: "Medical & Pharmacy Courier",
    earnings: "$24 – $38 / hr",
    demand: "High",
    tasks: [
      "Pick up prescriptions from pharmacies",
      "Verify recipient identity at delivery",
      "Maintain temperature-sensitive items",
      "Handle deliveries with full discretion",
    ],
    requirements: [
      "Clean sedan & spotless record",
      "Background check + HIPAA acknowledgment",
      "Insulated / lockable carrier",
    ],
    profileSectionTitle: "Certifications & Handling",
    profileFields: [
      {
        key: "certifications",
        label: "Certifications",
        type: "tags",
        placeholder: "Add a certification…",
        suggestions: ["HIPAA trained", "Cold-chain certified", "Bloodborne pathogen", "Background verified", "CPR/First Aid"],
      },
      {
        key: "handling",
        label: "Special handling",
        type: "tags",
        placeholder: "Add capability…",
        suggestions: ["Refrigerated meds", "Controlled substances", "Lab specimens", "Medical equipment"],
      },
    ],
  },
  {
    id: "senior",
    name: "Senior Errands & Personal Shopping",
    short: "Senior care",
    vehicle: "Sedan / SUV",
    tagline: "Helpful, patient, dependable.",
    description:
      "Run errands and shop for seniors and busy families with a personal touch. Build trusted, recurring relationships.",
    profileHeadline: "Senior Errand & Personal Assistant",
    earnings: "$22 – $36 / hr",
    demand: "High",
    tasks: [
      "Grocery and pharmacy pickups",
      "Companion errands and appointments",
      "Personal shopping with check-ins",
      "Friendly, patient service",
    ],
    requirements: [
      "Sedan or SUV",
      "Background check verified",
      "Warm, dependable communication",
    ],
    profileSectionTitle: "How I Help & Trust Signals",
    profileFields: [
      {
        key: "helpTypes",
        label: "Ways you help",
        type: "tags",
        placeholder: "Add a service…",
        suggestions: ["Grocery runs", "Pharmacy pickup", "Doctor visits", "Companion errands", "Light household"],
      },
      {
        key: "trust",
        label: "Trust & soft skills",
        type: "tags",
        placeholder: "Add a badge…",
        suggestions: ["Background verified", "Patient & friendly", "CPR certified", "Bilingual", "References available"],
      },
    ],
  },
  {
    id: "moving",
    name: "Moving & Hauling",
    short: "Moving",
    vehicle: "Box truck / Sprinter",
    tagline: "Heavy lifting, lighter day.",
    description:
      "Help customers move homes, haul junk, and transport big loads. The highest-earning category on FlowSync.",
    profileHeadline: "Moving & Hauling Pro",
    earnings: "$40 – $75 / hr",
    demand: "High",
    tasks: [
      "Load, transport, and unload household goods",
      "Junk and debris hauling",
      "Single-item heavy moves (appliances, gym)",
      "Optional crew and labor-only jobs",
    ],
    requirements: [
      "Box truck or Sprinter van",
      "Dolly, straps, blankets & ramp",
      "Able to lift 100+ lbs / crew available",
    ],
    profileSectionTitle: "Truck, Crew & Capabilities",
    profileFields: [
      {
        key: "truckSize",
        label: "Truck / van size",
        type: "select",
        suggestions: ["Sprinter van", "10–12 ft box truck", "16 ft box truck", "20+ ft box truck"],
      },
      {
        key: "crew",
        label: "Crew size",
        type: "select",
        suggestions: ["Solo", "2-person crew", "3-person crew", "On-demand crew"],
      },
      {
        key: "capabilities",
        label: "Capabilities",
        type: "tags",
        placeholder: "Add a capability…",
        suggestions: ["Full-home moves", "Junk removal", "Appliance moves", "Piano / specialty", "Packing service"],
      },
    ],
  },
  {
    id: "auto-parts",
    name: "Auto Parts Delivery",
    short: "Auto parts",
    vehicle: "Sedan / Van",
    tagline: "Parts there before the wrench turns.",
    description:
      "Deliver parts from suppliers to repair shops and customers fast. Reliable routes with steady business clients.",
    profileHeadline: "Auto Parts Courier",
    earnings: "$20 – $33 / hr",
    demand: "Steady",
    tasks: [
      "Pick up parts from warehouses & dealers",
      "Rush deliveries to repair shops",
      "Handle batteries, fluids & heavy components",
      "Manage returns and cores",
    ],
    requirements: [
      "Sedan or van with cargo room",
      "Able to lift 50+ lbs",
      "Clean driving record",
    ],
    profileSectionTitle: "Partner Shops & Parts Handling",
    profileFields: [
      {
        key: "partners",
        label: "Shops & suppliers you serve",
        type: "tags",
        placeholder: "Add a partner…",
        suggestions: ["NAPA", "AutoZone", "O'Reilly", "Dealership parts", "Independent shops"],
      },
      {
        key: "partsHandling",
        label: "Parts you handle",
        type: "tags",
        placeholder: "Add a type…",
        suggestions: ["Batteries", "Fluids & chemicals", "Tires", "Heavy components", "Electronics"],
      },
    ],
  },
];

export function getService(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}
