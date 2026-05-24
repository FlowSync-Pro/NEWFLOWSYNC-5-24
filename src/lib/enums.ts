import { ServiceType } from "@prisma/client";
import type { ServiceId } from "./services";

// Bridge between the app's lowercase service ids (src/lib/services.ts) and the
// Prisma `ServiceType` enum.

const TO_ENUM: Record<ServiceId, ServiceType> = {
  grocery: ServiceType.GROCERY,
  food: ServiceType.FOOD,
  furniture: ServiceType.FURNITURE,
  courier: ServiceType.COURIER,
  pharmacy: ServiceType.PHARMACY,
  senior: ServiceType.SENIOR,
  moving: ServiceType.MOVING,
  "auto-parts": ServiceType.AUTO_PARTS,
};

const FROM_ENUM = Object.fromEntries(
  Object.entries(TO_ENUM).map(([id, e]) => [e, id])
) as Record<ServiceType, ServiceId>;

export function serviceToEnum(id: ServiceId): ServiceType {
  return TO_ENUM[id];
}

export function serviceFromEnum(e: ServiceType): ServiceId {
  return FROM_ENUM[e];
}
