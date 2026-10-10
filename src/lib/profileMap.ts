import type { DriverProfile as DbProfile, DriverVehicle, Document } from "@prisma/client";
import { serviceFromEnum, docKeyFromKind } from "./enums";
import type { DriverProfile, DocKey } from "./profile";

/** The extra-vehicle columns a public page may load — never `vin`. */
export type PublicVehicle = Pick<DriverVehicle, "id" | "type" | "makeModel" | "year" | "accessories">;

/**
 * Convert a Prisma DriverProfile (+documents, optionally +vehicles) into the
 * app-shaped DriverProfile. Pass `vehicles` selected WITHOUT `vin` on public
 * pages (PublicVehicle) and the VIN comes through blank; the account editor
 * includes the full rows so the driver can see and fix their own VINs.
 */
export function dbToAppProfile(db: DbProfile & { documents: Document[]; vehicles?: (PublicVehicle & { vin?: string | null })[] }): DriverProfile {
  const documents: Partial<Record<DocKey, string>> = {};
  for (const d of db.documents) documents[docKeyFromKind(d.kind)] = d.blobUrl;

  return {
    firstName: db.firstName,
    lastName: db.lastName,
    email: "",
    phone: db.phone ?? "",
    city: db.city ?? "",
    primaryService: serviceFromEnum(db.primaryService),
    // additionalServices values are never null (the array can be empty but each
    // entry is a real enum), so the strict overload of serviceFromEnum applies.
    additionalServices: db.additionalServices.map((e) => serviceFromEnum(e)),
    vehicleType: db.vehicleType ?? "",
    vehicleMakeModel: db.vehicleMakeModel ?? "",
    vehicleYear: db.vehicleYear ?? "",
    vehicleAccessories: db.vehicleAccessories ?? [],
    vehicles: (db.vehicles ?? []).map((v) => ({
      id: v.id,
      type: v.type,
      makeModel: v.makeModel ?? "",
      year: v.year ?? "",
      vin: v.vin ?? "",
      accessories: v.accessories ?? [],
    })),
    baseZip: db.baseZip ?? "",
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
    tier: db.tier,
    externalWebsiteUrl: db.externalWebsiteUrl ?? "",
  };
}
