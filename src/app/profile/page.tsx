"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadProfile, clearProfile, type DriverProfile } from "@/lib/profile";
import { getService } from "@/lib/services";
import ServiceIcon from "@/components/ServiceIcon";

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "FS";
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-accent">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" fill={i < Math.round(rating) ? "currentColor" : "none"} stroke="currentColor" className="h-4 w-4">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.6 1-5.8L1.5 7.7l5.9-.9z" strokeWidth="1" />
        </svg>
      ))}
    </div>
  );
}

const MOCK_REVIEWS = [
  { name: "Sarah M.", text: "On time, super friendly, and handled everything with care. Booking again!", days: 2 },
  { name: "James L.", text: "Communication was great and the whole thing was effortless. Highly recommend.", days: 9 },
  { name: "Ana P.", text: "Professional from start to finish. Exactly what I needed.", days: 21 },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<DriverProfile | null | undefined>(undefined);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setProfile(loadProfile()));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Loading
  if (profile === undefined) {
    return <div className="py-24 text-center text-muted">Loading profile…</div>;
  }

  // Empty state
  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <div className="card p-12">
          <h1 className="text-2xl font-bold">No profile yet</h1>
          <p className="mt-3 text-muted">
            Complete the driver signup and we&apos;ll build a profile matched to your service.
          </p>
          <Link href="/signup" className="btn-primary mt-7 inline-flex rounded-full px-7 py-3 text-sm">
            Create your driver profile
          </Link>
        </div>
      </div>
    );
  }

  const primary = getService(profile.primaryService);
  if (!primary) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <p className="text-muted">Something went wrong with this profile.</p>
        <Link href="/signup" className="btn-primary mt-6 inline-flex rounded-full px-6 py-3 text-sm">Start over</Link>
      </div>
    );
  }

  const years = Number(profile.yearsExperience) || 2;
  const jobs = 180 + years * 215;
  const rating = 4.9;
  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || "Your Name";

  const stats = [
    { label: "Rate", value: profile.hourlyRate ? `$${profile.hourlyRate}/hr` : "—" },
    { label: "Jobs done", value: jobs.toLocaleString() },
    { label: "On-time", value: "98%" },
    { label: "Responds", value: "< 10 min" },
  ];

  return (
    <div className="pb-12">
      {/* Cover */}
      <div className="relative h-44 overflow-hidden border-b border-border bg-surface sm:h-52">
        <div className="glow-radial absolute inset-0" />
        <div className="grid-bg absolute inset-0" />
        <div className="absolute right-6 top-6 hidden items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-accent backdrop-blur sm:flex">
          <ServiceIcon id={primary.id} className="h-4 w-4" />
          {primary.profileHeadline}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5">
        {/* Header */}
        <div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-5">
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl border border-border bg-surface-2 text-3xl font-bold text-accent shadow-xl">
              {initials(profile.firstName, profile.lastName)}
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{fullName}</h1>
                <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 19.3 7.2 16.9l.9-5.4L4.2 7.7l5.4-.8z" />
                  </svg>
                  Verified
                </span>
              </div>
              <p className="mt-0.5 text-muted">{profile.headline || primary.profileHeadline}</p>
              <div className="mt-1.5 flex items-center gap-3 text-sm text-muted">
                <Stars rating={rating} />
                <span>{rating} · {jobs.toLocaleString()} jobs</span>
                <span className="hidden sm:inline">· {profile.city || "Your city"}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary rounded-full px-6 py-2.5 text-sm">Request {fullName.split(" ")[0]}</button>
            <Link href="/signup" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Edit</Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface px-5 py-5 text-center">
              <p className="text-xl font-bold text-accent">{s.value}</p>
              <p className="mt-0.5 text-xs text-muted">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Left */}
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
            </section>

            {/* Service-matched section */}
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

            {/* Reviews */}
            <section className="card p-7">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Reviews</h2>
                <div className="flex items-center gap-2 text-sm">
                  <Stars rating={rating} />
                  <span className="text-muted">{rating}</span>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {MOCK_REVIEWS.map((r) => (
                  <div key={r.name} className="rounded-xl border border-border bg-surface-2 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{r.name}</p>
                      <span className="text-xs text-muted">{r.days}d ago</span>
                    </div>
                    <Stars rating={5} />
                    <p className="mt-2 text-sm text-muted">{r.text}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            <section className="card p-6">
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
            </section>

            <section className="card p-6">
              <h3 className="text-sm font-semibold">Availability</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => {
                  const on = profile.availability.includes(d);
                  return (
                    <span
                      key={d}
                      className={`flex h-9 w-10 items-center justify-center rounded-lg text-xs ${
                        on ? "bg-accent-soft text-accent" : "border border-border text-muted/50"
                      }`}
                    >
                      {d}
                    </span>
                  );
                })}
              </div>
              <p className="mt-3 text-sm text-muted">Service radius: {profile.serviceRadius}</p>
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

            <section className="card p-6 text-center">
              <p className="text-sm font-semibold">Like what you see?</p>
              <button className="btn-primary mt-3 w-full rounded-full px-6 py-3 text-sm">Book {fullName.split(" ")[0]}</button>
              <button
                onClick={() => {
                  clearProfile();
                  setProfile(null);
                }}
                className="mt-3 text-xs text-muted underline-offset-2 hover:underline"
              >
                Clear this demo profile
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
