"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SERVICES, getService, type ServiceId } from "@/lib/services";
import ServiceIcon from "./ServiceIcon";

export interface DirectoryCard {
  id: string;
  name: string;
  service: ServiceId;
  city: string;
  rate: number | null;
  verified: boolean;
  headline: string;
  photoUrl?: string;
  /** "PREMIUM" drivers are featured at the top of the directory with a
   * distinctive amber treatment. Anything else is treated as Standard. */
  tier?: string;
  /** Public average rating, or null until enough loads are rated. Optional so
   * callers that don't load experience data still type-check. */
  rating?: number | null;
  /** Verified, unexpired credential labels (TWIC, Hazmat…). */
  credentials?: string[];
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function PinIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export default function DriverDirectory({ drivers }: { drivers: DirectoryCard[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ServiceId | "all">("all");
  const [city, setCity] = useState<string>("all");

  // Every city that actually has a listed driver, so the dropdown can never
  // offer a location that returns nothing.
  const cities = useMemo(() => {
    const set = new Set(drivers.map((d) => d.city.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [drivers]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drivers.filter((d) => {
      const matchService = filter === "all" || d.service === filter;
      const matchCity = city === "all" || d.city.trim() === city;
      const matchQuery =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        d.headline.toLowerCase().includes(q);
      return matchService && matchCity && matchQuery;
    });
  }, [drivers, query, filter, city]);

  const featured = results.filter((d) => (d.tier ?? "").toUpperCase() === "PREMIUM");
  const standard = results.filter((d) => (d.tier ?? "").toUpperCase() !== "PREMIUM");
  const filtersActive = filter !== "all" || city !== "all" || query.trim() !== "";

  return (
    <div className="mx-auto max-w-7xl px-5 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          Find a trusted driver <span className="text-accent">near you.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Browse independent, verified drivers and request a quote directly. You deal with the
          driver — no middleman markups.
        </p>
        {/* Real totals — shows prospective drivers that people have actually
            signed up, and shippers that there's coverage near them. */}
        {drivers.length > 0 && (
          <p className="mt-4 text-sm text-muted">
            <span className="font-semibold text-foreground">{drivers.length}</span> driver{drivers.length === 1 ? "" : "s"} listed
            {cities.length > 0 && (
              <> across <span className="font-semibold text-foreground">{cities.length}</span> {cities.length === 1 ? "city" : "cities"}</>
            )}
          </p>
        )}
      </div>

      <div className="mt-10 flex flex-col gap-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, city, or specialty…"
              className="w-full rounded-full border border-border bg-surface-2 py-3 pl-11 pr-4 text-sm outline-none transition-colors focus:border-accent"
            />
          </div>
          {cities.length > 0 && (
            <div className="relative sm:w-56">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                <PinIcon className="h-4 w-4" />
              </span>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-label="Filter by location"
                className="w-full appearance-none rounded-full border border-border bg-surface-2 py-3 pl-11 pr-9 text-sm outline-none transition-colors focus:border-accent"
              >
                <option value="all">All locations</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter("all")}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
              filter === "all" ? "border-accent bg-accent-soft text-foreground" : "border-border text-muted hover:border-accent/50"
            }`}
          >
            All services
          </button>
          {SERVICES.map((s) => (
            <button
              key={s.id}
              onClick={() => setFilter(s.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                filter === s.id ? "border-accent bg-accent-soft text-foreground" : "border-border text-muted hover:border-accent/50"
              }`}
            >
              <ServiceIcon id={s.id} className="h-4 w-4" />
              {s.short}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted">
          {results.length} driver{results.length === 1 ? "" : "s"}
          {city !== "all" && <> in <span className="text-foreground">{city}</span></>}
        </p>
        {filtersActive && (
          <button
            type="button"
            onClick={() => { setFilter("all"); setCity("all"); setQuery(""); }}
            className="text-xs text-accent hover:underline"
          >
            Show all drivers
          </button>
        )}
      </div>

      {/* Featured (Premium) drivers — visually distinct so customers see the
          difference and Standard drivers see what an upgrade looks like. */}
      {featured.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-bold text-amber-300">★ Featured</span>
            <p className="text-xs text-muted">Premium drivers · listed first</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((d) => <DriverCardItem key={d.id} d={d} featured />)}
          </div>
        </div>
      )}

      {standard.length > 0 && (
        <div className={featured.length > 0 ? "mt-10" : "mt-4"}>
          {featured.length > 0 && (
            <p className="mb-3 text-xs uppercase tracking-widest text-muted">More drivers</p>
          )}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {standard.map((d) => <DriverCardItem key={d.id} d={d} />)}
          </div>
        </div>
      )}

      {results.length === 0 && (
        <div className="card mt-6 p-10 text-center">
          <p className="text-muted">No drivers match that search yet.</p>
          <button
            type="button"
            onClick={() => { setFilter("all"); setCity("all"); setQuery(""); }}
            className="btn-ghost mt-4 inline-flex rounded-full px-6 py-2.5 text-sm"
          >
            Show all drivers
          </button>
        </div>
      )}
    </div>
  );
}

function DriverCardItem({ d, featured = false }: { d: DirectoryCard; featured?: boolean }) {
  const svc = getService(d.service);
  const cardCls = featured
    ? "card card-hover flex flex-col p-6 border-amber-400/40 bg-gradient-to-b from-amber-400/[0.04] to-transparent hover:border-amber-400/60"
    : "card card-hover flex flex-col p-6";
  const creds = d.credentials ?? [];
  return (
    <Link href={`/d/${d.id}`} className={cardCls}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl text-sm font-bold ${featured ? "bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30" : "bg-surface-2 text-accent"}`}>
            {d.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.photoUrl} alt={d.name} className="h-full w-full object-cover" />
            ) : (
              initials(d.name)
            )}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-semibold">{d.name}</p>
              {featured ? (
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">★ Featured</span>
              ) : (
                d.verified && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">Verified</span>
                )
              )}
            </div>
            {/* Location is the first thing a shipper checks, so it reads as
                real content rather than a caption. City is optional at signup,
                so say so plainly instead of rendering an empty line. */}
            <p className={`mt-0.5 flex items-center gap-1 text-sm ${d.city ? "text-foreground" : "text-muted/70"}`}>
              <PinIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
              {d.city || "Location not listed"}
            </p>
          </div>
        </div>
        <span className={featured ? "text-amber-300" : "text-accent"}><ServiceIcon id={d.service} className="h-5 w-5" /></span>
      </div>

      <p className="mt-3 flex-1 text-sm text-muted">{d.headline || svc?.profileHeadline}</p>

      {/* Verified credentials — the fastest way for a shipper to tell whether a
          driver can legally take their load. Capped so the card stays scannable. */}
      {creds.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {creds.slice(0, 3).map((c) => (
            <span key={c} className="rounded-full border border-accent/40 bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
              {c}
            </span>
          ))}
          {creds.length > 3 && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">+{creds.length - 3}</span>
          )}
        </div>
      )}

      <div className={`mt-4 flex items-center justify-between border-t ${featured ? "border-amber-400/20" : "border-border"} pt-4`}>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">{svc?.short}</span>
          {typeof d.rating === "number" && (
            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-300">★ {d.rating.toFixed(1)}</span>
          )}
        </div>
        {d.rate ? (
          <span className={`text-sm font-semibold ${featured ? "text-amber-300" : "text-accent"}`}>${d.rate}/hr</span>
        ) : (
          <span className="text-xs text-muted">View profile</span>
        )}
      </div>
    </Link>
  );
}
