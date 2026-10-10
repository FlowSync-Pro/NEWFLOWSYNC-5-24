// Vehicles and their accessories (owner spec 2026-10-09). One source for the
// profile editor (what a driver can tick), the public profile and directory
// card (what to show), and the directory filter (what a customer can narrow
// by). Labels are stored as-is in the database, so never rename one here
// without a data migration.

/** What a driver can pick on their profile. "Bike / scooter" stays for the
 * drivers who already chose it; it just has no directory button. */
export const VEHICLE_TYPES = ["Sedan", "SUV", "Minivan", "Pickup truck", "Cargo van", "Sprinter van", "Box truck", "Bike / scooter"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

/** The directory's filter buttons, in the owner's order. */
export const DIRECTORY_VEHICLE_TYPES = ["Sedan", "Minivan", "SUV", "Pickup truck", "Cargo van", "Sprinter van", "Box truck"] as const;

const VAN_AND_PICKUP = ["2 point rack", "3 point rack", "trailer", "dolly", "tie-downs", "moving blankets", "PPE (steel toe, hard hat and safety vest)"];

/** Exact option lists per vehicle (owner: do not rename, merge, or add). Types
 * missing here — Sedan, Minivan, SUV, Bike / scooter — have no accessories. */
export const ACCESSORIES_BY_TYPE: Record<string, readonly string[]> = {
  "Cargo van": VAN_AND_PICKUP,
  "Pickup truck": VAN_AND_PICKUP,
  "Sprinter van": VAN_AND_PICKUP,
  "Box truck": ["lift-gate", "pallet jack", "PPE (steel toe, hard hat and safety vest)", "tie-downs", "moving blankets", "load locks"],
};

/** The accessories a vehicle type may carry (empty for the small ones). */
export function accessoriesFor(type: string | null | undefined): readonly string[] {
  return ACCESSORIES_BY_TYPE[(type ?? "").trim()] ?? [];
}

/** Keep only the accessories that belong to `type`, in that type's order, once
 * each. Switching to a type with no list (Sedan, Minivan, SUV) clears them. */
export function pruneAccessories(type: string | null | undefined, picked: readonly string[]): string[] {
  const allowed = accessoriesFor(type);
  return allowed.filter((a) => picked.includes(a));
}

export const VIN_LENGTH = 17;

/** Normalise a typed VIN: trim, uppercase, drop spaces and dashes. */
export const normalizeVin = (raw: string | null | undefined) => (raw ?? "").toUpperCase().replace(/[\s-]/g, "");

/** A modern (1981+) VIN: 17 letters and digits, never I, O or Q. */
export const isValidVin = (vin: string) => /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);

/** A vehicle as the directory sees it — the type the driver picked and the
 * accessories on that vehicle. No make/model text, no VIN. */
export interface DirectoryVehicle {
  type: string;
  accessories: string[];
}

/**
 * Does a driver match the directory's vehicle filter? "all" matches everyone,
 * including drivers with no vehicle on file. A specific type matches when ANY
 * of the driver's vehicles is exactly that type (the one they picked — never
 * guessed from make/model text) and carries every selected accessory.
 */
export function matchesVehicleFilter(vehicles: readonly DirectoryVehicle[] | undefined, type: string, accessories: readonly string[]): boolean {
  if (type === "all") return true;
  return (vehicles ?? []).some((v) => v.type.trim() === type && accessories.every((a) => v.accessories.includes(a)));
}

/** The driver's vehicle to show on a card: the one matching the filter, else the main one. */
export function vehicleToShow<T extends DirectoryVehicle>(vehicles: readonly T[], type: string): T | undefined {
  return (type !== "all" && vehicles.find((v) => v.type.trim() === type)) || vehicles[0];
}
