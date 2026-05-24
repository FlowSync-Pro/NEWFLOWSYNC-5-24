import Link from "next/link";
import Logo from "./Logo";
import { SERVICES } from "@/lib/services";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <Logo className="h-7 w-7" />
              <span className="text-lg font-bold tracking-tight">
                Flow<span className="text-accent">Sync</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted">
              The driver-owned platform for every kind of delivery and errand. Pick your service,
              build your business, keep more of what you earn.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Services</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              {SERVICES.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <Link href={`/services/${s.id}`} className="hover:text-foreground">
                    {s.short}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Company</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              <li><Link href="/drivers" className="hover:text-foreground">For drivers</Link></li>
              <li><Link href="/how-it-works" className="hover:text-foreground">How it works</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
              <li><Link href="/calculator" className="hover:text-foreground">Quote calculator</Link></li>
              <li><Link href="/signup" className="hover:text-foreground">Become a driver</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Get started</h4>
            <p className="mt-4 text-sm text-muted">Ready to drive on your terms?</p>
            <Link href="/signup" className="btn-primary mt-3 inline-flex rounded-full px-5 py-2.5 text-sm">
              Become a driver
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 text-sm text-muted sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} FlowSync. A driver-first marketplace.</p>
          <p className="text-xs">Mockup — for demonstration only.</p>
        </div>
      </div>
    </footer>
  );
}
