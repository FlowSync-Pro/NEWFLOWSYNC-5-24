import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CATEGORY_LABEL, guidesByCategory, type GuideCategory } from "@/lib/guides";
import Reveal from "@/components/Reveal";
import { SITE_URL } from "@/lib/site";
import { getSession } from "@/lib/session";
import { hasGuideAccess } from "@/lib/access";

// Member resources — only signed-in paid drivers (and admins) see the library.
// Reached from inside the driver dashboard, not the public nav.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resources — grow your delivery business",
  description: "Member guides to build your delivery business.",
  alternates: { canonical: `${SITE_URL}/grow` },
  robots: { index: false },
};

const ORDER: GuideCategory[] = ["foundation", "money", "marketing"];

const INTRO: Record<GuideCategory, string> = {
  foundation: "Set your business up the right way — the steps the gig apps never teach you.",
  money: "Keep more of what you earn — taxes, write-offs, pricing, and the reviews that grow your income.",
  marketing: "Get your own customers in your city, so you're never dependent on one app.",
};

export default async function GrowPage() {
  // Gate the whole library: sign in required, and a paid listing to view it.
  const session = await getSession();
  if (!session) redirect("/signin");
  if (!(await hasGuideAccess())) redirect("/pricing");

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="glow-radial pointer-events-none absolute inset-0" />
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Grow</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
            Build a real delivery business — not just another gig.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted">
            Practical playbooks to set your foundation and market your services locally, so you keep
            more of what you earn and avoid the mistakes most drivers make.
          </p>
          <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-4 py-1.5 text-xs font-medium text-accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" strokeLinecap="round" /></svg>
            Included free with your $17 FlowSync listing
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-16">
        {ORDER.map((cat) => (
          <section key={cat} className="mb-16 last:mb-0">
            <div className="mb-6 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">{CATEGORY_LABEL[cat]}</h2>
              <p className="mt-2 text-muted">{INTRO[cat]}</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {guidesByCategory(cat).map((g, i) => (
                <Reveal key={g.slug} delay={(i % 3) * 60}>
                  <Link href={`/grow/${g.slug}`} className="card card-hover flex h-full flex-col p-6">
                    <span className="text-xs font-medium uppercase tracking-widest text-accent">
                      {CATEGORY_LABEL[cat]}
                    </span>
                    <h3 className="mt-3 text-lg font-semibold leading-snug">{g.title}</h3>
                    <p className="mt-2 flex-1 text-sm text-muted">{g.excerpt}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                      Read guide · {g.readMinutes} min
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </section>
        ))}

        <Reveal>
          <div className="card flex flex-col items-center justify-between gap-5 p-8 text-center sm:flex-row sm:text-left">
            <div>
              <h3 className="text-xl font-bold">Ready to put it into action?</h3>
              <p className="mt-1 text-muted">Get listed in the directory and start taking direct bookings.</p>
            </div>
            <Link href="/pricing" className="btn-primary shrink-0 rounded-full px-7 py-3.5 text-sm">
              Get listed for $17
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
