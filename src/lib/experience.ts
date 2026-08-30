// Driver experience, ratings, and credentials — shared between the admin tools
// and the public profile so both always describe a driver the same way.

/** Credential types a driver can hold. Mirrors the LicenseKind enum in the schema. */
export const LICENSE_LABELS: Record<string, string> = {
  TWIC: "TWIC",
  HAZMAT: "Hazmat",
  TANKER: "Tanker",
  DOUBLES_TRIPLES: "Doubles / Triples",
  CDL_A: "CDL Class A",
  CDL_B: "CDL Class B",
  CDL_C: "CDL Class C",
  PASSENGER: "Passenger",
  AIR_BRAKES: "Air Brakes",
  FORKLIFT: "Forklift",
  MEDICAL_CARD: "DOT Medical Card",
  OSHA_10: "OSHA 10",
  OTHER: "Other",
};

/** Ordered list for dropdowns. */
export const LICENSE_KINDS = Object.keys(LICENSE_LABELS);

export function licenseLabel(kind: string, customLabel?: string | null): string {
  if (kind === "OTHER") return customLabel?.trim() || "Other credential";
  return LICENSE_LABELS[kind] ?? kind;
}

/**
 * A rating average built from very few loads is noise, and one bad early load
 * would follow a driver around unfairly. We withhold the public average until
 * there's enough signal for it to mean something.
 */
export const MIN_RATINGS_FOR_PUBLIC = 3;

export interface RatedLoad {
  rating: number | null;
}

/** Average of rated loads, or null when none are rated yet. */
export function averageRating(loads: RatedLoad[]): number | null {
  const rated = loads.map((l) => l.rating).filter((r): r is number => typeof r === "number");
  if (rated.length === 0) return null;
  return rated.reduce((s, r) => s + r, 0) / rated.length;
}

export function ratedCount(loads: RatedLoad[]): number {
  return loads.filter((l) => typeof l.rating === "number").length;
}

/** Whether a driver's average is solid enough to show to shippers. */
export function showPublicRating(loads: RatedLoad[]): boolean {
  return ratedCount(loads) >= MIN_RATINGS_FOR_PUBLIC;
}

export interface CredentialLike {
  kind: string;
  customLabel?: string | null;
  status: string;
  expiresAt?: Date | string | null;
}

/** Expired credentials must never be presented to a shipper as current. */
export function isExpired(c: CredentialLike, now: Date = new Date()): boolean {
  if (!c.expiresAt) return false;
  return new Date(c.expiresAt).getTime() < now.getTime();
}

/** Only admin-verified, unexpired credentials are shown publicly. */
export function publicCredentials<T extends CredentialLike>(all: T[], now: Date = new Date()): T[] {
  return all.filter((c) => c.status === "VERIFIED" && !isExpired(c, now));
}

/** Formats a 1–5 average for display, e.g. 4.75 -> "4.8". */
export function formatRating(avg: number): string {
  return avg.toFixed(1);
}

// ---------------------------------------------------------------------------
// Public profile assembly
// ---------------------------------------------------------------------------

export interface ProfileExperienceSource {
  trips: { publicPhotos: string[] }[];
  verifiedLoads: {
    id: string;
    date: Date;
    pickupCity: string;
    dropoffCity: string;
    loadType: string | null;
    rating: number | null;
    publicNote: string | null;
    photos: string[];
    photosPublic: boolean;
  }[];
  licenses: { kind: string; customLabel: string | null; status: string; expiresAt: Date | null }[];
  loggedTripCount: number;
}

/**
 * Builds exactly what a shipper is allowed to see. Everything opt-in or
 * unverified is filtered out here, in one place, so no page can accidentally
 * leak a private photo, an unverified credential, or a premature rating.
 */
export function buildProfileExperience(src: ProfileExperienceSource, maxPhotos = 9, maxLoads = 5) {
  const rating = showPublicRating(src.verifiedLoads) ? averageRating(src.verifiedLoads) : null;

  // Driver-approved trip photos first, then admin-approved load photos.
  const photos = [
    ...src.trips.flatMap((t) => t.publicPhotos),
    ...src.verifiedLoads.filter((l) => l.photosPublic).flatMap((l) => l.photos),
  ].slice(0, maxPhotos);

  return {
    loggedDeliveries: src.loggedTripCount,
    verifiedDeliveries: src.verifiedLoads.length,
    rating,
    ratedCount: ratedCount(src.verifiedLoads),
    credentials: publicCredentials(src.licenses).map((c) => licenseLabel(c.kind, c.customLabel)),
    photos,
    recentLoads: src.verifiedLoads.slice(0, maxLoads).map((l) => ({
      id: l.id,
      date: l.date.toISOString(),
      pickupCity: l.pickupCity,
      dropoffCity: l.dropoffCity,
      loadType: l.loadType,
      rating: l.rating,
      publicNote: l.publicNote,
    })),
  };
}
