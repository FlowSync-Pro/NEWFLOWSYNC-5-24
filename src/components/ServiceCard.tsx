import Link from "next/link";
import ServiceIcon from "./ServiceIcon";
import type { Service } from "@/lib/services";

export default function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/services/${service.id}`}
      className="card card-hover group flex flex-col p-6"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <ServiceIcon id={service.id} className="h-6 w-6" />
        </span>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted">
          {service.demand} demand
        </span>
      </div>
      <h3 className="mt-5 text-lg font-semibold leading-snug">{service.name}</h3>
      {/* Vehicle badge surfaced right under the service name so scanners
          immediately see if their vehicle fits — the most common pre-signup
          question this site gets. */}
      <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
          <path d="M3 13l2-5h11l3 5v4H3v-4z" strokeLinejoin="round" />
          <circle cx="7" cy="17" r="1.5" />
          <circle cx="16" cy="17" r="1.5" />
        </svg>
        {service.vehicle}
      </span>
      <p className="mt-3 flex-1 text-sm text-muted">{service.description}</p>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs text-muted">Earnings</span>
        <span className="text-sm font-semibold text-accent">{service.earnings}</span>
      </div>
    </Link>
  );
}
