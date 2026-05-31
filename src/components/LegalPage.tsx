import type { ReactNode } from "react";

/** Shared shell for the simple legal/policy pages (privacy, terms, refund). */
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-60" />
      <div className="relative mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_a]:text-accent [&_a:hover]:underline [&_strong]:text-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}
