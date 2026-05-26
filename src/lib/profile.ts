import type { ServiceId } from "./services";

export interface DriverProfile {
  // identity
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  // service
  primaryService: ServiceId;
  additionalServices: ServiceId[];
  // vehicle
  vehicleType: string;
  vehicleMakeModel: string;
  vehicleYear: string;
  // profile
  headline: string;
  bio: string;
  hourlyRate: string;
  yearsExperience: string;
  serviceRadius: string;
  availability: string[];
  languages: string[];
  // service-specific fields keyed by ProfileField.key
  serviceDetails: Record<string, string | string[]>;
  // uploaded documents/photos as data URLs, keyed by DocKey
  documents?: Partial<Record<DocKey, string>>;
  // admin-approved verification status (from the DB)
  verified?: boolean;
  // "STANDARD" | "PREMIUM"
  tier?: string;
  externalWebsiteUrl?: string;
}

export type DocKey =
  | "profilePhoto"
  | "vehiclePhoto"
  | "license"
  | "insurance"
  | "drivingRecord";

export interface DocConfig {
  key: DocKey;
  label: string;
  description: string;
  required: boolean;
}

export const DOCUMENTS: DocConfig[] = [
  { key: "profilePhoto", label: "Profile photo", description: "A clear headshot customers will see.", required: true },
  { key: "vehiclePhoto", label: "Vehicle photo", description: "Show the vehicle you'll deliver with.", required: false },
  { key: "license", label: "Driver's license", description: "Required to verify your identity.", required: true },
  { key: "insurance", label: "Valid insurance", description: "Proof of current auto insurance.", required: true },
  { key: "drivingRecord", label: "Driving record", description: "A recent clean driving record.", required: false },
];

/** Docs that must be present before a driver can be approved. */
export const VERIFY_REQUIRED: DocKey[] = ["license", "insurance"];

/** Admin-approved verification (the badge customers see). */
export function isVerified(profile: DriverProfile): boolean {
  return !!profile.verified;
}

/** Whether the required documents have been uploaded (ready for admin review). */
export function hasRequiredDocs(profile: DriverProfile): boolean {
  const docs = profile.documents ?? {};
  return VERIFY_REQUIRED.every((k) => !!docs[k]);
}

const KEY = "flowsync.driverProfile";

export function saveProfile(profile: DriverProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(profile));
}

export function loadProfile(): DriverProfile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DriverProfile;
  } catch {
    return null;
  }
}

export function clearProfile() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
