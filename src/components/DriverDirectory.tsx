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
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default function DriverDirectory({ drivers }: { drivers: DirectoryCard[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ServiceId | "all">("all");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drivers.filter((d) => {
      const matchService = filter === "all" || d.service === filter;
      const matchQuery =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        d.headline.toLowerCase().includes(q);
      return matchService && matchQuery;
    });
  }, [drivers, query, filter]);

  const featured = results.filter((d) => (d.tier ?? "").toUpperCase() === "PREMIUM");
  const standard = results.filter((d) => (d.tier ?? "").toUpperCase() !== "PREMIUM");

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
      </div>

      <div className="mt-10 flex flex-col gap-4">
        <div className="relative mx-auto w-full max-w-md">
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

      <p className="mt-8 text-sm text-muted">{results.length} driver{results.length === 1 ? "" : "s"} available</p>

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
        <div className="card mt-6 p-10 text-center text-muted">
          No drivers match that search yet. Try a different service or city.
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
            <p className="text-xs text-muted">{d.city}</p>
          </div>
        </div>
        <span className={featured ? "text-amber-300" : "text-accent"}><ServiceIcon id={d.service} className="h-5 w-5" /></span>
      </div>

      <p className="mt-3 flex-1 text-sm text-muted">{d.headline || svc?.profileHeadline}</p>

      <div className={`mt-4 flex items-center justify-between border-t ${featured ? "border-amber-400/20" : "border-border"} pt-4`}>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">{svc?.short}</span>
        {d.rate ? (
          <span className={`text-sm font-semibold ${featured ? "text-amber-300" : "text-accent"}`}>${d.rate}/hr</span>
        ) : (
          <span className="text-xs text-muted">View profile</span>
        )}
      </div>
    </Link>
  );
}
