import type { ServiceId } from "./services";

export interface DirectoryDriver {
  id: string;
  name: string;
  service: ServiceId;
  city: string;
  rating: number;
  reviews: number;
  rate: number; // $/hr
  vehicle: string;
  specialties: string[];
  blurb: string;
}

export const DIRECTORY_DRIVERS: DirectoryDriver[] = [
  {
    id: "marcus-t",
    name: "Marcus T.",
    service: "grocery",
    city: "Atlanta, GA",
    rating: 4.9,
    reviews: 212,
    rate: 30,
    vehicle: "SUV",
    specialties: ["Organic / fresh produce", "Costco runs", "Same-day"],
    blurb: "Careful shopper who texts photos for every substitution.",
  },
  {
    id: "priya-r",
    name: "Priya R.",
    service: "pharmacy",
    city: "Austin, TX",
    rating: 5.0,
    reviews: 168,
    rate: 33,
    vehicle: "Sedan",
    specialties: ["HIPAA trained", "Refrigerated meds", "Background verified"],
    blurb: "Discreet, on-time medical courier customers request by name.",
  },
  {
    id: "devon-k",
    name: "Devon K.",
    service: "moving",
    city: "Phoenix, AZ",
    rating: 4.8,
    reviews: 143,
    rate: 58,
    vehicle: "16 ft box truck",
    specialties: ["Full-home moves", "2-person crew", "Appliance moves"],
    blurb: "Box truck + crew for moves and hauling, blankets and straps included.",
  },
  {
    id: "sofia-l",
    name: "Sofia L.",
    service: "senior",
    city: "Denver, CO",
    rating: 5.0,
    reviews: 97,
    rate: 29,
    vehicle: "SUV",
    specialties: ["Grocery runs", "Doctor visits", "Bilingual"],
    blurb: "Patient, friendly errands and companion help for seniors.",
  },
  {
    id: "james-h",
    name: "James H.",
    service: "furniture",
    city: "Dallas, TX",
    rating: 4.9,
    reviews: 121,
    rate: 49,
    vehicle: "Cargo van",
    specialties: ["Store pickups", "Assembly", "Stairs OK"],
    blurb: "Large-item delivery with white-glove placement and setup.",
  },
  {
    id: "ana-p",
    name: "Ana P.",
    service: "food",
    city: "Miami, FL",
    rating: 4.8,
    reviews: 256,
    rate: 24,
    vehicle: "Sedan",
    specialties: ["Peak-hour ready", "Insulated bags", "Downtown"],
    blurb: "Fast, friendly restaurant delivery during lunch and dinner rushes.",
  },
  {
    id: "tre-w",
    name: "Tré W.",
    service: "courier",
    city: "Chicago, IL",
    rating: 4.9,
    reviews: 188,
    rate: 27,
    vehicle: "Sedan",
    specialties: ["Legal / signature", "Same-day batches", "Fragile"],
    blurb: "Reliable same-day courier with proof-of-delivery on every drop.",
  },
  {
    id: "lena-m",
    name: "Lena M.",
    service: "auto-parts",
    city: "Detroit, MI",
    rating: 4.7,
    reviews: 84,
    rate: 26,
    vehicle: "Van",
    specialties: ["Dealership parts", "Batteries", "Rush delivery"],
    blurb: "Keeps repair shops moving with fast parts runs and returns.",
  },
  {
    id: "carlos-g",
    name: "Carlos G.",
    service: "grocery",
    city: "San Diego, CA",
    rating: 4.9,
    reviews: 139,
    rate: 28,
    vehicle: "Sedan",
    specialties: ["Specialty diets", "Farmers market", "Floral"],
    blurb: "Personal grocery shopper for busy families and dietary needs.",
  },
  {
    id: "nina-b",
    name: "Nina B.",
    service: "moving",
    city: "Seattle, WA",
    rating: 5.0,
    reviews: 76,
    rate: 62,
    vehicle: "Sprinter van",
    specialties: ["Junk removal", "Single-item", "Packing"],
    blurb: "Hauling, junk removal, and small moves — solo or with a crew.",
  },
];
