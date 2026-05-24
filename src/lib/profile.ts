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
