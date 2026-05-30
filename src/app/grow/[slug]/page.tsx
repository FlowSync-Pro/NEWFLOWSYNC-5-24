import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CATEGORY_LABEL,
  getGuide,
  guidesByCategory,
} from "@/lib/guides";
import { SITE_URL } from "@/lib/site";
import { hasGuideAccess } from "@/lib/access";
import JsonLd, { breadcrumbLd } from "@/components/JsonLd";

// Guides are a paid member benefit — access depends on the signed-in user, so
// the page can't be statically prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/grow/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.metaDescription,
    alternates: { canonical: `${SITE_URL}/grow/${guide.slug}` },
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.metaDescription,
      url: `${SITE_URL}/grow/${guide.slug}`,
    },
  };
}

export default async function GuidePage({ params }: PageProps<"/grow/[slug]">) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const unlocked = await hasGuideAccess();
  // Non-members see the first section as a free preview; the rest is locked.
  const visibleSections = unlocked ? guide.sections : guide.sections.slice(0, 1);

  const related = guidesByCategory(guide.category)
    .filter((g) => g.slug !== guide.slug)
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.metaDescription,
    articleSection: CATEGORY_LABEL[guide.category],
    author: { "@type": "Organization", name: "FlowSync" },
    publisher: { "@type": "Organization", name: "FlowSync" },
    mainEntityOfPage: `${SITE_URL}/grow/${guide.slug}`,
    // Tell Google this is paywalled member content (avoids cloaking penalties):
    // the preview is free, the locked sections are not.
    isAccessibleForFree: false,
    hasPart: {
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: ".locked-content",
    },
  };

  return (
    <article className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: "Grow", path: "/grow" },
          { name: guide.title, path: `/grow/${guide.slug}` },
        ])}
      />
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />

      <div className="relative mx-auto max-w-3xl px-5 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/grow" className="hover:text-foreground">Grow</Link>
          <span>/</span>
          <span className="text-foreground">{CATEGORY_LABEL[guide.category]}</span>
        </nav>

        <header className="mt-5">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            {CATEGORY_LABEL[guide.category]} · {guide.readMinutes} min read
          </span>
          <h1 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            {guide.title}
          </h1>
          <p className="mt-4 text-lg text-muted">{guide.excerpt}</p>
        </header>

        <div className="mt-10 space-y-10">
          {visibleSections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-bold tracking-tight">{s.heading}</h2>
              {s.body?.map((p, i) => (
                <p key={i} className="mt-3 text-muted">{p}</p>
              ))}
              {s.steps && (
                <ol className="mt-4 space-y-3">
                  {s.steps.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                        {i + 1}
                      </span>
                      <span className="text-sm text-foreground/90">{step}</span>
                    </li>
                  ))}
                </ol>
              )}
              {s.tip && (
                <div className="mt-4 flex gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4">
                  <span className="text-sm font-semibold text-accent">Tip</span>
                  <span className="text-sm text-foreground/90">{s.tip}</span>
                </div>
              )}
            </section>
          ))}
        </div>

        {!unlocked && (
          <div className="locked-content relative mt-6">
            {/* Fade the preview into the paywall */}
            <div className="pointer-events-none absolute -top-24 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-background" />
            <div className="rounded-2xl border border-accent/40 bg-surface p-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" strokeLinecap="round" /></svg>
              </span>
              <h2 className="mt-4 text-xl font-bold tracking-tight">The rest of this guide is for FlowSync members</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Get listed for a one-time $17 and unlock every guide in the library —
                including the full DOT &amp; EIN walkthrough, business-setup, insurance,
                and local-marketing playbooks. You also get your directory listing and tools.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/pricing" className="btn-primary rounded-full px-7 py-3 text-sm">
                  Get listed &amp; unlock all guides — $17
                </Link>
                <Link href="/signin" className="btn-ghost rounded-full px-6 py-3 text-sm">
                  Already a member? Sign in
                </Link>
              </div>
            </div>
          </div>
        )}

        {unlocked && guide.cta && (
          <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-7 text-center sm:flex-row sm:text-left">
            <p className="text-sm text-muted">{guide.cta.note}</p>
            <Link href={guide.cta.href} className="btn-primary shrink-0 rounded-full px-6 py-3 text-sm">
              {guide.cta.label}
            </Link>
          </div>
        )}

        {related.length > 0 && (
          <div className="mt-14 border-t border-border pt-8">
            <h2 className="text-lg font-semibold">Keep reading</h2>
            <div className="mt-4 space-y-3">
              {related.map((g) => (
                <Link
                  key={g.slug}
                  href={`/grow/${g.slug}`}
                  className="card card-hover flex items-center justify-between gap-4 p-4"
                >
                  <span className="text-sm font-medium">{g.title}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 text-accent">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
