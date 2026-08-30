import type { ReactNode } from "react";
import { isVerified, type DriverProfile } from "@/lib/profile";
import { isPremiumTier } from "@/lib/pricing";
import { getService } from "@/lib/services";
import ServiceIcon from "@/components/ServiceIcon";

export interface ProfileServiceItem {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
}

/**
 * Experience shown to shippers. Deliberately reports two separate numbers:
 * `loggedDeliveries` is what the driver recorded themselves (their P&L tracker
 * covers all their work, not just FlowSync jobs), while `verifiedDeliveries`
 * is what FlowSync recorded and rated. Conflating the two would tell a shipper
 * FlowSync dispatched work it didn't.
 */
export interface ProfileExperience {
  loggedDeliveries: number;
  verifiedDeliveries: number;
  /** Average rating, or null while there aren't enough rated loads to show one. */
  rating: number | null;
  ratedCount: number;
  /** Admin-verified, unexpired credentials only. */
  credentials: string[];
  /** Opt-in photos only — driver-approved trip photos plus admin-approved load photos. */
  photos: string[];
  recentLoads: {
    id: string;
    date: string;
    pickupCity: string;
    dropoffCity: string;
    loadType: string | null;
    rating: number | null;
    publicNote: string | null;
  }[];
}

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rounded ? "text-amber-300" : "text-muted/30"}>★</span>
      ))}
    </span>
  );
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "FS";
}

/** Render only safe http(s) links — guards against legacy rows that may hold a
 * javascript:/data: URL saved before server-side validation existed. */
function safeHref(raw?: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}


export default function ProfileView({
  profile,
  services = [],
  headerActions,
  sidebarCta,
  experience,
}: {
  profile: DriverProfile;
  services?: ProfileServiceItem[];
  headerActions?: ReactNode;
  sidebarCta?: ReactNode;
  experience?: ProfileExperience;
}) {
  const primary = getService(profile.primaryService);
  if (!primary) return null;
  const premium = isPremiumTier(profile.tier);
  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const years = Number(profile.yearsExperience) || 0;
  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || "Driver";

  const totalDeliveries = (experience?.loggedDeliveries ?? 0) + (experience?.verifiedDeliveries ?? 0);

  // No fabricated stats. Every value below is either something the driver
  // actually entered or something FlowSync actually recorded; anything we don't
  // have yet reads as "New" rather than an invented number.
  const stats = [
    { label: "Rate", value: profile.hourlyRate ? `$${profile.hourlyRate}/hr` : "—" },
    { label: "Experience", value: years > 0 ? `${years} yr${years === 1 ? "" : "s"}` : "New" },
    { label: "Service area", value: profile.serviceRadius || profile.city || "Local" },
    {
      label: experience?.rating != null ? `Rating · ${experience.ratedCount} loads` : "Rating",
      value: experience?.rating != null ? `★ ${experience.rating.toFixed(1)}` : "New",
    },
  ];

  return (
    <div className="pb-12">
      {/* Featured banner for Premium drivers — visible "this driver is
          Premium" signal beyond the small badge inline below. */}
      {premium && (
        <div className="border-b border-amber-400/30 bg-gradient-to-r from-amber-400/10 via-amber-400/[0.06] to-transparent px-5 py-2 text-center text-xs font-medium text-amber-300">
          ★ Featured FlowSync driver
        </div>
      )}
      <div className={`relative h-44 overflow-hidden border-b sm:h-52 ${premium ? "border-amber-400/30 bg-gradient-to-b from-amber-400/[0.08] to-surface" : "border-border bg-surface"}`}>
        <div className="glow-radial absolute inset-0" />
        <div className="grid-bg absolute inset-0" />
        <div className="absolute right-6 top-6 hidden items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-accent backdrop-blur sm:flex">
          <ServiceIcon id={primary.id} className="h-4 w-4" />
          {primary.profileHeadline}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5">
        <div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-5">
            <div className="h-28 w-28 overflow-hidden rounded-3xl border border-border bg-surface-2 shadow-xl">
              {profile.documents?.profilePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.documents.profilePhoto} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-accent">
                  {initials(profile.firstName, profile.lastName)}
                </div>
              )}
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{fullName}</h1>
                {isVerified(profile) && (
                  <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 19.3 7.2 16.9l.9-5.4L4.2 7.7l5.4-.8z" />
                    </svg>
                    Verified
                  </span>
                )}
                {premium && (
                  <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-300">★ Premium</span>
                )}
              </div>
              <p className="mt-0.5 text-muted">{profile.headline || primary.profileHeadline}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                {totalDeliveries > 0 ? (
                  <>
                    <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs">
                      {experience!.loggedDeliveries} deliveries logged
                    </span>
                    {experience!.verifiedDeliveries > 0 && (
                      <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                        {experience!.verifiedDeliveries} verified by FlowSync
                      </span>
                    )}
                  </>
                ) : (
                  <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs">New driver</span>
                )}
                <span className="hidden sm:inline">{profile.city || "Local area"}</span>
              </div>
              {experience && experience.credentials.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {experience.credentials.map((c) => (
                    <span
                      key={c}
                      title="Credential verified by FlowSync"
                      className="flex items-center gap-1 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-0.5 text-[11px] font-medium text-accent"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {headerActions && <div className="flex gap-2">{headerActions}</div>}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface px-5 py-5 text-center">
              <p className="text-xl font-bold text-accent">{s.value}</p>
              <p className="mt-0.5 text-xs text-muted">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <section className="card p-7">
              <h2 className="text-lg font-semibold">About</h2>
              <p className="mt-3 whitespace-pre-line text-muted">
                {profile.bio ||
                  `${fullName.split(" ")[0]} is a ${primary.profileHeadline.toLowerCase()} on FlowSync, serving ${profile.city || "the local area"} with reliable, friendly service.`}
              </p>
              {profile.languages.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs uppercase tracking-widest text-muted">Languages</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profile.languages.map((l) => (
                      <span key={l} className="rounded-full border border-border bg-surface-2 px-3 py-1 text-sm">{l}</span>
                    ))}
                  </div>
                </div>
              )}
              {premium && safeHref(profile.externalWebsiteUrl) && (
                <div className="mt-5">
                  <p className="text-xs uppercase tracking-widest text-muted">Website</p>
                  <a href={safeHref(profile.externalWebsiteUrl)!} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                    {profile.externalWebsiteUrl!.replace(/^https?:\/\//, "")}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </a>
                </div>
              )}
            </section>

            {services.length > 0 && (
              <section className="card overflow-hidden">
                <div className={`flex items-center gap-2 border-b border-border px-7 py-4 ${premium ? "bg-amber-400/10" : "bg-surface"}`}>
                  {premium && <span className="text-amber-300">★</span>}
                  <h2 className="text-lg font-semibold">Services &amp; pricing</h2>
                </div>
                <div className="divide-y divide-border">
                  {services.map((s) => (
                    <div key={s.id} className="flex items-start justify-between gap-4 px-7 py-4">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        {s.description && <p className="mt-0.5 text-sm text-muted">{s.description}</p>}
                      </div>
                      <span className="shrink-0 font-bold text-accent">{money(s.priceCents)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Delivery history recorded and rated by FlowSync. Only city names
                appear — never the customer's full address. */}
            {experience && experience.recentLoads.length > 0 && (
              <section className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-7 py-4">
                  <h2 className="text-lg font-semibold">Delivery history</h2>
                  <span className="text-xs text-muted">
                    {experience.verifiedDeliveries} verified by FlowSync
                    {experience.rating != null && <> · ★ {experience.rating.toFixed(1)} average</>}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {experience.recentLoads.map((l) => (
                    <div key={l.id} className="flex items-start justify-between gap-4 px-7 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{l.pickupCity} → {l.dropoffCity}</p>
                        <p className="text-xs text-muted">
                          {new Date(l.date).toLocaleDateString()}
                          {l.loadType ? ` · ${l.loadType}` : ""}
                        </p>
                        {l.publicNote && <p className="mt-1 text-sm text-muted">“{l.publicNote}”</p>}
                      </div>
                      {l.rating != null && (
                        <span className="shrink-0 text-sm"><Stars value={l.rating} /></span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Photos the driver (or FlowSync) explicitly approved for public
                display. Delivery photos often show addresses and plates, so
                nothing appears here without an explicit opt-in. */}
            {experience && experience.photos.length > 0 && (
              <section className="card p-7">
                <h2 className="text-lg font-semibold">Work photos</h2>
                <p className="mt-1 text-sm text-muted">Completed deliveries shared by {fullName.split(" ")[0]}.</p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {experience.photos.map((p, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={p}
                      alt={`Completed delivery by ${fullName}`}
                      loading="lazy"
                      className="aspect-square w-full rounded-xl border border-border object-cover"
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="card p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <ServiceIcon id={primary.id} className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-semibold">{primary.profileSectionTitle}</h2>
              </div>
              <div className="mt-5 space-y-5">
                {primary.profileFields.map((field) => {
                  const val = profile.serviceDetails[field.key];
                  const hasValue = Array.isArray(val) ? val.length > 0 : !!val;
                  return (
                    <div key={field.key}>
                      <p className="text-xs uppercase tracking-widest text-muted">{field.label}</p>
                      {!hasValue ? (
                        <p className="mt-1 text-sm text-muted/60">Not specified</p>
                      ) : Array.isArray(val) ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {val.map((v) => (
                            <span key={v} className="rounded-full border border-accent/40 bg-accent-soft px-3 py-1.5 text-sm">{v}</span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 font-medium">{val}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="card p-7">
              <h2 className="text-lg font-semibold">Reviews</h2>
              <div className="mt-5 rounded-xl border border-dashed border-border bg-surface-2 p-6 text-center">
                <p className="text-sm font-medium">No reviews yet</p>
                <p className="mt-1 text-sm text-muted">
                  Be the first to book {profile.firstName} — your honest review helps the whole community.
                </p>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="card overflow-hidden">
              {profile.documents?.vehiclePhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.documents.vehiclePhoto} alt="Vehicle" className="h-36 w-full object-cover" />
              )}
              <div className="p-6">
                <h3 className="text-sm font-semibold">Vehicle</h3>
                <div className="mt-3 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <ServiceIcon id={primary.id} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium">{profile.vehicleType || primary.vehicle}</p>
                    <p className="text-sm text-muted">
                      {[profile.vehicleMakeModel, profile.vehicleYear].filter(Boolean).join(" · ") || "Vehicle on file"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="card p-6">
              <h3 className="text-sm font-semibold">Availability</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => {
                  const on = profile.availability.includes(d);
                  return (
                    <span key={d} className={`flex h-9 w-10 items-center justify-center rounded-lg text-xs ${on ? "bg-accent-soft text-accent" : "border border-border text-muted/50"}`}>
                      {d}
                    </span>
                  );
                })}
              </div>
              {profile.serviceRadius && <p className="mt-3 text-sm text-muted">Service radius: {profile.serviceRadius}</p>}
            </section>

            {profile.additionalServices.length > 0 && (
              <section className="card p-6">
                <h3 className="text-sm font-semibold">Also offers</h3>
                <div className="mt-3 space-y-2">
                  {profile.additionalServices.map((id) => {
                    const svc = getService(id);
                    if (!svc) return null;
                    return (
                      <div key={id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                        <span className="text-accent"><ServiceIcon id={id} className="h-5 w-5" /></span>
                        <span className="text-sm">{svc.name}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {sidebarCta}
          </div>
        </div>
      </div>
    </div>
  );
}
