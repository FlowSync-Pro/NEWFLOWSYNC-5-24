"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  DOCUMENTS,
  isVerified,
  hasRequiredDocs,
  VERIFY_REQUIRED,
  WEEKDAYS,
  type DocKey,
  type DriverProfile,
} from "@/lib/profile";
import { getService, SERVICES, type ServiceId } from "@/lib/services";
import { isPremiumTier } from "@/lib/pricing";
import { fileToScaledDataUrl, fileToSquareDataUrl } from "@/lib/image";
import UpgradeButton from "./UpgradeButton";
import { saveDriverProfile, type ProfileInput } from "@/app/actions/profile";
import { saveDocument, removeDocument } from "@/app/actions/documents";
import { logout } from "@/app/actions/auth";
import { TextField, TextArea, ChipSelect, TagInput } from "./inputs";

const VEHICLE_TYPES = ["Sedan", "SUV", "Cargo van", "Sprinter van", "Box truck", "Pickup truck", "Bike / scooter"];
const RADII = ["Within 5 mi", "Within 15 mi", "Within 30 mi", "Regional"];
const LANGS = ["English", "Spanish", "Mandarin", "French", "Vietnamese", "Tagalog"];

function DocCard({
  label,
  description,
  required,
  value,
  onChange,
  square,
}: {
  label: string;
  description: string;
  required: boolean;
  value?: string;
  onChange: (dataUrl: string | null) => void;
  square?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    // Profile photos are square-cropped so they fill the avatar frame correctly.
    const url = square ? await fileToSquareDataUrl(file) : await fileToScaledDataUrl(file);
    setBusy(false);
    onChange(url);
  };

  return (
    <div className="card overflow-hidden">
      <div className="relative flex h-36 items-center justify-center bg-surface-2">
        {value ? (
          // Square (profile) photos show full/contained so the driver sees exactly
          // what customers will; other docs fill the wide preview.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className={`h-full w-full ${square ? "object-contain" : "object-cover"}`} />
        ) : (
          <span className="text-xs text-muted">{busy ? "Processing…" : "No file uploaded"}</span>
        )}
        {value && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-[#04130a]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Uploaded
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{label}</p>
          {required && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-accent">Required</span>}
        </div>
        <p className="mt-1 text-xs text-muted">{description}</p>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="btn-ghost flex-1 rounded-lg px-3 py-2 text-xs">
            {value ? "Replace" : "Upload"}
          </button>
          {value && (
            <button type="button" onClick={() => onChange(null)} className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:text-foreground">
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AccountEditor({ initial, isAdmin = false }: { initial: DriverProfile; isAdmin?: boolean }) {
  const router = useRouter();
  const [profile, setProfile] = useState<DriverProfile>(initial);
  const [savedAt, setSavedAt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const primary = getService(profile.primaryService);

  const flash = () => {
    setSavedAt(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSavedAt(false), 2200);
  };

  const set = <K extends keyof DriverProfile>(key: K, value: DriverProfile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const setDetail = (key: string, value: string | string[]) =>
    setProfile((p) => ({ ...p, serviceDetails: { ...p.serviceDetails, [key]: value } }));

  const setDoc = async (key: DocKey, url: string | null) => {
    const prev = profile.documents?.[key];
    const prevVerified = profile.verified;
    setProfile((p) => {
      const documents = { ...(p.documents ?? {}) };
      if (url) documents[key] = url;
      else delete documents[key];
      // Changing a document sends the driver back to pending review.
      return { ...p, documents, verified: false };
    });
    setError(null);
    try {
      if (url) await saveDocument(key, url);
      else await removeDocument(key);
      flash();
    } catch {
      // revert on failure
      setProfile((p) => {
        const documents = { ...(p.documents ?? {}) };
        if (prev) documents[key] = prev;
        else delete documents[key];
        return { ...p, documents, verified: prevVerified };
      });
      setError("Couldn't save that file. Please try again.");
    }
  };

  const toggleDay = (day: string) =>
    setProfile((p) => ({
      ...p,
      availability: p.availability.includes(day)
        ? p.availability.filter((x) => x !== day)
        : [...p.availability, day],
    }));

  const save = async () => {
    setSaving(true);
    setError(null);
    const input: ProfileInput = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      city: profile.city,
      headline: profile.headline,
      bio: profile.bio,
      hourlyRate: profile.hourlyRate ? Number(profile.hourlyRate) : null,
      yearsExperience: profile.yearsExperience ? Number(profile.yearsExperience) : null,
      serviceRadius: profile.serviceRadius,
      availability: profile.availability,
      languages: profile.languages,
      vehicleType: profile.vehicleType,
      vehicleMakeModel: profile.vehicleMakeModel,
      vehicleYear: profile.vehicleYear,
      additionalServices: profile.additionalServices,
      serviceDetails: profile.serviceDetails,
      externalWebsiteUrl: profile.externalWebsiteUrl,
    };
    try {
      await saveDriverProfile(input);
      flash();
    } catch {
      setError("Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const uploadedCount = DOCUMENTS.filter((doc) => profile.documents?.[doc.key]).length;
  const verified = isVerified(profile);
  const premium = isPremiumTier(profile.tier);
  const docsReady = hasRequiredDocs(profile);
  const missingRequired = VERIFY_REQUIRED.filter((k) => !profile.documents?.[k]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Edit your account</h1>
            {premium && (
              <span className="rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-bold text-amber-300">★ Premium</span>
            )}
          </div>
          <p className="mt-1 text-muted">Update your details, upload documents, and get verified.</p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-sm text-accent">Saved</span>}
          {error && <span className="text-sm text-red-400">{error}</span>}
          {isAdmin && <Link href="/admin" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Admin</Link>}
          {!premium && <UpgradeButton label="★ Upgrade to Premium" className="rounded-full bg-amber-400/20 px-5 py-2.5 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-400/30" />}
          <Link href="/account" className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-[#04130a] transition-opacity hover:opacity-90">Roadmap</Link>
          <Link href="/account/trips" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Operations</Link>
          <Link href="/account/services" className="btn-ghost rounded-full px-5 py-2.5 text-sm">My Services</Link>
          <Link href="/grow" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Resources</Link>
          <Link href="/account/bookings" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Bookings</Link>
          <form action={logout}>
            <button type="submit" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Sign out</button>
          </form>
          <button onClick={save} disabled={saving} className="btn-primary rounded-full px-6 py-2.5 text-sm disabled:opacity-60">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* "Pick your service" nudge — shown when the driver skipped service
          selection at setup. Optional friction-free way to fill it in here. */}
      {!primary && (
        <section className="card mt-8 border-accent/40 bg-accent-soft p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-accent">Pick your main service</h2>
              <p className="mt-1 text-sm text-muted">
                You skipped this at signup — no worries. Pick one whenever you&apos;re ready
                and you&apos;ll be listed in the directory + city pages for that service.
              </p>
            </div>
            <select
              defaultValue=""
              onChange={async (e) => {
                const id = e.target.value as ServiceId;
                if (!id) return;
                set("primaryService", id);
                // Save immediately so they don't have to scroll for the Save button.
                await saveDriverProfile({ primaryService: id });
                flash();
                router.refresh();
              }}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            >
              <option value="" disabled>Choose a service…</option>
              {SERVICES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </section>
      )}

      {/* Verification */}
      <section className="card mt-8 p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${verified ? "bg-accent text-[#04130a]" : "bg-surface-2 text-muted"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 19l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <h2 className="text-lg font-semibold">
                {verified ? "You're verified" : docsReady ? "Pending review" : "Get verified"}
              </h2>
              <p className="text-sm text-muted">
                {verified
                  ? "Your documents are approved — customers see a Verified badge."
                  : docsReady
                    ? "Your documents are submitted. A FlowSync admin will review and approve you shortly."
                    : `Upload your ${missingRequired.map((k) => DOCUMENTS.find((d) => d.key === k)?.label.toLowerCase()).join(" and ")} to submit for verification.`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-accent">{uploadedCount}/{DOCUMENTS.length}</p>
            <p className="text-xs text-muted">documents</p>
          </div>
        </div>
      </section>

      {/* Documents */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Documents &amp; photos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOCUMENTS.map((doc) => (
            <DocCard
              key={doc.key}
              label={doc.label}
              description={doc.description}
              required={doc.required}
              value={profile.documents?.[doc.key]}
              onChange={(url) => setDoc(doc.key, url)}
              square={doc.key === "profilePhoto"}
            />
          ))}
        </div>
      </section>

      {/* Profile details */}
      <section className="card mt-6 space-y-5 p-7">
        <h2 className="text-lg font-semibold">Profile details</h2>
        <TextField label="Headline" value={profile.headline} onChange={(v) => set("headline", v)} placeholder={primary?.profileHeadline} />
        <TextArea label="About you" value={profile.bio} onChange={(v) => set("bio", v)} placeholder="Tell customers why they should book you…" />
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField label="Hourly rate ($)" type="number" value={profile.hourlyRate} onChange={(v) => set("hourlyRate", v)} placeholder="28" />
          <TextField label="Years experience" type="number" value={profile.yearsExperience} onChange={(v) => set("yearsExperience", v)} placeholder="3" />
          <div>
            <span className="text-sm font-medium">Service radius</span>
            <select value={profile.serviceRadius} onChange={(e) => set("serviceRadius", e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent">
              <option value="">Choose…</option>
              {RADII.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div>
          <span className="text-sm font-medium">Availability</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => {
              const on = profile.availability.includes(day);
              return (
                <button key={day} type="button" onClick={() => toggleDay(day)} className={`h-10 w-12 rounded-lg border text-sm transition-colors ${on ? "border-accent bg-accent-soft text-foreground" : "border-border text-muted hover:border-accent/50"}`}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>
        <TagInput label="Languages" value={profile.languages} onChange={(v) => set("languages", v)} placeholder="Add a language…" suggestions={LANGS} />
        {premium ? (
          <TextField label="Your website (Premium)" value={profile.externalWebsiteUrl ?? ""} onChange={(v) => set("externalWebsiteUrl", v)} placeholder="https://yourbusiness.com" />
        ) : (
          <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm">
            <p className="font-medium">Add your own website link <span className="text-amber-300">★ Premium</span></p>
            <p className="mt-1 text-muted">
              <Link href="/pricing" className="text-accent hover:underline">Upgrade to Premium</Link> to link your external website, get the Premium badge, and feature your profile in the directory.
            </p>
          </div>
        )}
      </section>

      {/* Vehicle */}
      <section className="card mt-6 space-y-5 p-7">
        <h2 className="text-lg font-semibold">Vehicle</h2>
        <ChipSelect label="Vehicle type" options={VEHICLE_TYPES} value={profile.vehicleType} onChange={(v) => set("vehicleType", v)} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Make & model" value={profile.vehicleMakeModel} onChange={(v) => set("vehicleMakeModel", v)} placeholder="Toyota RAV4" />
          <TextField label="Year" value={profile.vehicleYear} onChange={(v) => set("vehicleYear", v)} placeholder="2021" />
        </div>
      </section>

      {/* Service-specific */}
      {primary && primary.profileFields.length > 0 && (
        <section className="card mt-6 space-y-5 p-7">
          <h2 className="text-lg font-semibold">{primary.profileSectionTitle}</h2>
          {primary.profileFields.map((field) => {
            const val = profile.serviceDetails[field.key];
            if (field.type === "select") {
              return (
                <ChipSelect key={field.key} label={field.label} options={field.suggestions ?? []} value={typeof val === "string" ? val : ""} onChange={(v) => setDetail(field.key, v)} />
              );
            }
            return (
              <TagInput key={field.key} label={field.label} placeholder={field.placeholder} suggestions={field.suggestions} value={Array.isArray(val) ? val : []} onChange={(v) => setDetail(field.key, v)} />
            );
          })}
        </section>
      )}

      <div className="mt-8 flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary rounded-full px-7 py-3 text-sm disabled:opacity-60">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
