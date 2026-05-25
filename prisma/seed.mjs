import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hash(pw) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

// Demo drivers so the directory isn't empty before real drivers join.
// Safe to run on any environment; upserts by email. Remove before launch if
// you don't want sample profiles in production.
const DRIVERS = [
  { name: "Marcus Thompson", service: "GROCERY", city: "Atlanta, GA", rate: 30, vehicle: "SUV", headline: "Careful shopper who texts photos for every substitution." },
  { name: "Priya Raman", service: "PHARMACY", city: "Austin, TX", rate: 33, vehicle: "Sedan", headline: "Discreet, on-time medical courier customers request by name." },
  { name: "Devon Knight", service: "MOVING", city: "Phoenix, AZ", rate: 58, vehicle: "Box truck", headline: "Box truck + crew for moves and hauling — blankets and straps included." },
  { name: "Sofia Lopez", service: "SENIOR", city: "Denver, CO", rate: 29, vehicle: "SUV", headline: "Patient, friendly errands and companion help for seniors." },
  { name: "James Howard", service: "FURNITURE", city: "Dallas, TX", rate: 49, vehicle: "Cargo van", headline: "Large-item delivery with white-glove placement and setup." },
  { name: "Ana Pereira", service: "FOOD", city: "Miami, FL", rate: 24, vehicle: "Sedan", headline: "Fast, friendly restaurant delivery during lunch and dinner rushes." },
  { name: "Tre Wallace", service: "COURIER", city: "Chicago, IL", rate: 27, vehicle: "Sedan", headline: "Reliable same-day courier with proof-of-delivery on every drop." },
  { name: "Lena Martin", service: "AUTO_PARTS", city: "Detroit, MI", rate: 26, vehicle: "Van", headline: "Keeps repair shops moving with fast parts runs and returns." },
  { name: "Carlos Gomez", service: "GROCERY", city: "San Diego, CA", rate: 28, vehicle: "Sedan", headline: "Personal grocery shopper for busy families and dietary needs." },
  { name: "Nina Brooks", service: "MOVING", city: "Seattle, WA", rate: 62, vehicle: "Sprinter van", headline: "Hauling, junk removal, and small moves — solo or with a crew." },
];

function emailFor(name) {
  return `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@demo.flowsyncdriver.com`;
}

async function main() {
  for (const d of DRIVERS) {
    const [firstName, ...rest] = d.name.split(" ");
    const lastName = rest.join(" ");
    const email = emailFor(d.name);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) continue;
    await prisma.user.create({
      data: {
        email,
        name: d.name,
        role: "DRIVER",
        hashedPassword: hash("demo-password-123"),
        emailVerified: new Date(),
        driverProfile: {
          create: {
            firstName,
            lastName,
            city: d.city,
            primaryService: d.service,
            headline: d.headline,
            hourlyRate: d.rate,
            vehicleType: d.vehicle,
            verified: true,
            listedAt: new Date(),
            availability: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            languages: ["English"],
          },
        },
      },
    });
    console.log(`seeded ${d.name}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
