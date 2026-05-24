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
      <p className="mt-2 flex-1 text-sm text-muted">{service.description}</p>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div>
          <p className="text-xs text-muted">Typical vehicle</p>
          <p className="text-sm font-medium">{service.vehicle}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Earnings</p>
          <p className="text-sm font-semibold text-accent">{service.earnings}</p>
        </div>
      </div>
    </Link>
  );
}
