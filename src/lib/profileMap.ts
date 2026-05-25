import type { DriverProfile as DbProfile, Document } from "@prisma/client";
import { serviceFromEnum, docKeyFromKind } from "./enums";
import type { DriverProfile, DocKey } from "./profile";

/** Convert a Prisma DriverProfile (+documents) into the app-shaped DriverProfile. */
export function dbToAppProfile(db: DbProfile & { documents: Document[] }): DriverProfile {
  const documents: Partial<Record<DocKey, string>> = {};
  for (const d of db.documents) documents[docKeyFromKind(d.kind)] = d.blobUrl;

  return {
    firstName: db.firstName,
    lastName: db.lastName,
    email: "",
    phone: db.phone ?? "",
    city: db.city ?? "",
    primaryService: serviceFromEnum(db.primaryService),
    additionalServices: db.additionalServices.map(serviceFromEnum),
    vehicleType: db.vehicleType ?? "",
    vehicleMakeModel: db.vehicleMakeModel ?? "",
    vehicleYear: db.vehicleYear ?? "",
    headline: db.headline ?? "",
    bio: db.bio ?? "",
    hourlyRate: db.hourlyRate?.toString() ?? "",
    yearsExperience: db.yearsExperience?.toString() ?? "",
    serviceRadius: db.serviceRadius ?? "",
    availability: db.availability,
    languages: db.languages,
    serviceDetails: (db.serviceDetails as Record<string, string | string[]>) ?? {},
    documents,
    verified: db.verified,
  };
}
