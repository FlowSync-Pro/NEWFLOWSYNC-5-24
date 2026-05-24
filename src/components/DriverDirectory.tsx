"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DIRECTORY_DRIVERS, type DirectoryDriver } from "@/lib/directory";
import { SERVICES, getService, type ServiceId } from "@/lib/services";
import { loadProfile } from "@/lib/profile";
import ServiceIcon from "./ServiceIcon";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5 text-accent">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.6 1-5.8L1.5 7.7l5.9-.9z" />
      </svg>
      {rating.toFixed(1)}
    </span>
  );
}

interface Card extends DirectoryDriver {
  isYou?: boolean;
}

export default function DriverDirectory() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ServiceId | "all">("all");
  const [you, setYou] = useState<Card | null>(null);
  const [quoteFor, setQuoteFor] = useState<Card | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const p = loadProfile();
      if (p && p.primaryService) {
        const svc = getService(p.primaryService);
        const details = Object.values(p.serviceDetails)
          .flat()
          .filter((v): v is string => typeof v === "string")
          .slice(0, 3);
        setYou({
          id: "you",
          name: `${p.firstName} ${p.lastName}`.trim() || "You",
          service: p.primaryService,
          city: p.city || "Your city",
          rating: 5,
          reviews: 0,
          rate: Number(p.hourlyRate) || 28,
          vehicle: p.vehicleType || svc?.vehicle || "",
          specialties: details.length ? details : ["New on FlowSync"],
          blurb: p.bio || `${svc?.profileHeadline ?? "Driver"} serving ${p.city || "your area"}.`,
          isYou: true,
        });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const results = useMemo(() => {
    const base: Card[] = you ? [you, ...DIRECTORY_DRIVERS] : [...DIRECTORY_DRIVERS];
    const q = query.trim().toLowerCase();
    return base.filter((d) => {
      const matchService = filter === "all" || d.service === filter;
      const matchQuery =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        d.specialties.some((s) => s.toLowerCase().includes(q));
      return matchService && matchQuery;
    });
  }, [you, query, filter]);

  const openQuote = (d: Card) => {
    setSent(false);
    setQuoteFor(d);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-12">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          Find a trusted driver <span className="text-accent">near you.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Browse independent, verified drivers and request a quote directly. You deal with the
          driver — no middleman markups.
        </p>
      </div>

      {/* Controls */}
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

      {/* Results */}
      <p className="mt-8 text-sm text-muted">{results.length} drivers available</p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((d) => {
          const svc = getService(d.service);
          return (
            <div key={d.id} className="card card-hover flex flex-col p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-sm font-bold text-accent">
                    {initials(d.name)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{d.name}</p>
                      {d.isYou && (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">You</span>
                      )}
                    </div>
                    <p className="text-xs text-muted">{d.city}</p>
                  </div>
                </div>
                <span className="text-accent">
                  <ServiceIcon id={d.service} className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3 text-sm">
                <Stars rating={d.rating} />
                <span className="text-muted">{d.reviews ? `${d.reviews} reviews` : "New"}</span>
                <span className="ml-auto font-semibold text-accent">${d.rate}/hr</span>
              </div>

              <p className="mt-3 text-sm text-muted">{d.blurb}</p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">
                  {svc?.short}
                </span>
                {d.specialties.slice(0, 3).map((s) => (
                  <span key={s} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex gap-2 border-t border-border pt-4">
                {d.isYou ? (
                  <Link href="/profile" className="btn-ghost flex-1 rounded-full px-4 py-2.5 text-center text-sm">
                    View your profile
                  </Link>
                ) : (
                  <button onClick={() => openQuote(d)} className="btn-primary flex-1 rounded-full px-4 py-2.5 text-sm">
                    Request a quote
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {results.length === 0 && (
        <div className="card mt-6 p-10 text-center text-muted">
          No drivers match that search. Try a different service or city.
        </div>
      )}

      {/* Quote modal */}
      {quoteFor && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setQuoteFor(null)}
        >
          <div
            className="card w-full max-w-md p-7"
            onClick={(e) => e.stopPropagation()}
          >
            {!sent ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-2 text-sm font-bold text-accent">
                    {initials(quoteFor.name)}
                  </span>
                  <div>
                    <h2 className="font-semibold">Request a quote from {quoteFor.name}</h2>
                    <p className="text-xs text-muted">{getService(quoteFor.service)?.name}</p>
                  </div>
                </div>
                <form
                  className="mt-5 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSent(true);
                  }}
                >
                  <input required placeholder="Your name" className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent" />
                  <input required type="email" placeholder="Email or phone" className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent" />
                  <textarea required rows={3} placeholder="What do you need delivered or done?" className="w-full resize-none rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent" />
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setQuoteFor(null)} className="btn-ghost flex-1 rounded-full px-4 py-2.5 text-sm">
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary flex-1 rounded-full px-4 py-2.5 text-sm">
                      Send request
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="py-4 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-7 w-7">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <h2 className="mt-4 text-lg font-bold">Request sent (demo)</h2>
                <p className="mt-2 text-sm text-muted">
                  In the live app, {quoteFor.name} gets your request and replies with a quote — you
                  book and pay through FlowSync, and they keep 95%.
                </p>
                <button onClick={() => setQuoteFor(null)} className="btn-primary mt-5 rounded-full px-6 py-2.5 text-sm">
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
