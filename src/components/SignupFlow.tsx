"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SERVICES, getService, type ServiceId } from "@/lib/services";
import { saveProfile, WEEKDAYS, type DriverProfile } from "@/lib/profile";
import ServiceIcon from "./ServiceIcon";
import { TextField, TextArea, ChipSelect, TagInput } from "./inputs";

const VEHICLE_TYPES = [
  "Sedan",
  "SUV",
  "Cargo van",
  "Sprinter van",
  "Box truck",
  "Pickup truck",
  "Bike / scooter",
];

const STEP_LABELS = ["About you", "Your service", "Vehicle & details", "Build profile"];

function defaultVehicleFor(id: ServiceId | ""): string {
  const map: Record<string, string> = {
    grocery: "SUV",
    food: "Sedan",
    furniture: "Cargo van",
    courier: "Sedan",
    pharmacy: "Sedan",
    senior: "SUV",
    moving: "Box truck",
    "auto-parts": "Sedan",
  };
  return map[id] ?? "Sedan";
}

const LANGUAGE_SUGGESTIONS = ["English", "Spanish", "Mandarin", "French", "Vietnamese", "Tagalog"];

export default function SignupFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const preselected = (params.get("service") as ServiceId | null) ?? "";

  const [step, setStep] = useState(0);
  const [data, setData] = useState<DriverProfile>(() => ({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    primaryService: (getService(preselected)?.id ?? "") as ServiceId,
    additionalServices: [],
    vehicleType: preselected ? defaultVehicleFor(preselected) : "",
    vehicleMakeModel: "",
    vehicleYear: "",
    headline: getService(preselected)?.profileHeadline ?? "",
    bio: "",
    hourlyRate: "",
    yearsExperience: "",
    serviceRadius: "Within 15 mi",
    availability: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    languages: ["English"],
    serviceDetails: {},
  }));

  const primary = useMemo(() => getService(data.primaryService), [data.primaryService]);

  const set = <K extends keyof DriverProfile>(key: K, value: DriverProfile[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const setDetail = (key: string, value: string | string[]) =>
    setData((d) => ({ ...d, serviceDetails: { ...d.serviceDetails, [key]: value } }));

  const pickPrimary = (id: ServiceId) => {
    const svc = getService(id);
    setData((d) => ({
      ...d,
      primaryService: id,
      additionalServices: d.additionalServices.filter((s) => s !== id),
      vehicleType: d.vehicleType || defaultVehicleFor(id),
      headline: d.headline || svc?.profileHeadline || "",
      serviceDetails: {},
    }));
  };

  const toggleAdditional = (id: ServiceId) => {
    if (id === data.primaryService) return;
    setData((d) => ({
      ...d,
      additionalServices: d.additionalServices.includes(id)
        ? d.additionalServices.filter((s) => s !== id)
        : [...d.additionalServices, id],
    }));
  };

  const toggleDay = (day: string) =>
    setData((d) => ({
      ...d,
      availability: d.availability.includes(day)
        ? d.availability.filter((x) => x !== day)
        : [...d.availability, day],
    }));

  const canNext = () => {
    if (step === 0) return data.firstName.trim() && data.city.trim();
    if (step === 1) return !!data.primaryService;
    if (step === 2) return !!data.vehicleType;
    if (step === 3) return data.headline.trim();
    return true;
  };

  const finish = () => {
    saveProfile(data);
    router.push("/profile");
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      {/* Progress */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                    i < step
                      ? "border-accent bg-accent text-[#04130a]"
                      : i === step
                        ? "border-accent text-accent"
                        : "border-border text-muted"
                  }`}
                >
                  {i < step ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="h-4 w-4">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className={`hidden text-xs sm:block ${i === step ? "text-foreground" : "text-muted"}`}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`mx-2 h-px flex-1 ${i < step ? "bg-accent" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-7 sm:p-9">
        {/* Step 0 — About you */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold">Let&apos;s get you set up</h2>
              <p className="mt-1 text-muted">A few basics to create your driver account.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="First name" value={data.firstName} onChange={(v) => set("firstName", v)} placeholder="Jordan" />
              <TextField label="Last name" value={data.lastName} onChange={(v) => set("lastName", v)} placeholder="Rivera" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Email" type="email" value={data.email} onChange={(v) => set("email", v)} placeholder="you@email.com" />
              <TextField label="Phone" type="tel" value={data.phone} onChange={(v) => set("phone", v)} placeholder="(555) 123-4567" />
            </div>
            <TextField label="City / region" value={data.city} onChange={(v) => set("city", v)} placeholder="Austin, TX" hint="Where you'll mostly be working." />
          </div>
        )}

        {/* Step 1 — Service */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Pick your main service</h2>
              <p className="mt-1 text-muted">This shapes your profile. You can add more below.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {SERVICES.map((s) => {
                const active = data.primaryService === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => pickPrimary(s.id)}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                      active ? "border-accent bg-accent-soft" : "border-border hover:border-accent/50"
                    }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${active ? "bg-accent text-[#04130a]" : "bg-surface-2 text-accent"}`}>
                      <ServiceIcon id={s.id} className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{s.name}</span>
                      <span className="mt-0.5 block text-xs text-muted">{s.vehicle} · {s.earnings}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {data.primaryService && (
              <div className="border-t border-border pt-5">
                <p className="text-sm font-medium">Add more services <span className="text-muted">(optional)</span></p>
                <p className="mt-1 text-xs text-muted">Stack extra income streams — switch between them anytime.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SERVICES.filter((s) => s.id !== data.primaryService).map((s) => {
                    const active = data.additionalServices.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleAdditional(s.id)}
                        className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                          active ? "border-accent bg-accent-soft text-foreground" : "border-border text-muted hover:border-accent/50"
                        }`}
                      >
                        <ServiceIcon id={s.id} className="h-4 w-4" />
                        {s.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Vehicle & service-specific details */}
        {step === 2 && primary && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Your vehicle & {primary.short} details</h2>
              <p className="mt-1 text-muted">
                We suggested a vehicle for {primary.short}. Adjust if needed.
              </p>
            </div>

            <ChipSelect
              label="Vehicle type"
              options={VEHICLE_TYPES}
              value={data.vehicleType}
              onChange={(v) => set("vehicleType", v)}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Make & model" value={data.vehicleMakeModel} onChange={(v) => set("vehicleMakeModel", v)} placeholder="Toyota RAV4" />
              <TextField label="Year" value={data.vehicleYear} onChange={(v) => set("vehicleYear", v)} placeholder="2021" />
            </div>

            <div className="space-y-5 border-t border-border pt-5">
              <p className="text-sm font-semibold text-accent">{primary.profileSectionTitle}</p>
              {primary.profileFields.map((field) => {
                const val = data.serviceDetails[field.key];
                if (field.type === "select") {
                  return (
                    <ChipSelect
                      key={field.key}
                      label={field.label}
                      options={field.suggestions ?? []}
                      value={typeof val === "string" ? val : ""}
                      onChange={(v) => setDetail(field.key, v)}
                    />
                  );
                }
                return (
                  <TagInput
                    key={field.key}
                    label={field.label}
                    placeholder={field.placeholder}
                    suggestions={field.suggestions}
                    value={Array.isArray(val) ? val : []}
                    onChange={(v) => setDetail(field.key, v)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3 — Build profile */}
        {step === 3 && primary && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold">Build your profile</h2>
              <p className="mt-1 text-muted">This is what customers see. Make it shine.</p>
            </div>
            <TextField label="Profile headline" value={data.headline} onChange={(v) => set("headline", v)} placeholder={primary.profileHeadline} />
            <TextArea
              label="About you"
              value={data.bio}
              onChange={(v) => set("bio", v)}
              placeholder={`Tell customers why they should book you for ${primary.short.toLowerCase()}…`}
            />
            <div className="grid gap-5 sm:grid-cols-3">
              <TextField label="Hourly rate ($)" type="number" value={data.hourlyRate} onChange={(v) => set("hourlyRate", v)} placeholder="28" />
              <TextField label="Years experience" type="number" value={data.yearsExperience} onChange={(v) => set("yearsExperience", v)} placeholder="3" />
              <div>
                <span className="text-sm font-medium">Service radius</span>
                <select
                  value={data.serviceRadius}
                  onChange={(e) => set("serviceRadius", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent"
                >
                  {["Within 5 mi", "Within 15 mi", "Within 30 mi", "Regional"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <span className="text-sm font-medium">Availability</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const active = data.availability.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`h-10 w-12 rounded-lg border text-sm transition-colors ${
                        active ? "border-accent bg-accent-soft text-foreground" : "border-border text-muted hover:border-accent/50"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <TagInput
              label="Languages"
              value={data.languages}
              onChange={(v) => set("languages", v)}
              placeholder="Add a language…"
              suggestions={LANGUAGE_SUGGESTIONS}
            />
          </div>
        )}

        {/* Nav buttons */}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={`btn-ghost rounded-full px-5 py-2.5 text-sm ${step === 0 ? "invisible" : ""}`}
          >
            Back
          </button>
          {step < 3 ? (
            <button
              type="button"
              disabled={!canNext()}
              onClick={() => setStep((s) => s + 1)}
              className="btn-primary rounded-full px-7 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={!canNext()}
              onClick={finish}
              className="btn-primary rounded-full px-7 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create my profile
            </button>
          )}
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-muted">
        This is a mockup — your details are saved only in your browser and never sent anywhere.
      </p>
    </div>
  );
}
