import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CATEGORY_LABEL,
  getGuide,
  GUIDES,
  guidesByCategory,
} from "@/lib/guides";
import { SITE_URL } from "@/lib/site";
import JsonLd, { breadcrumbLd } from "@/components/JsonLd";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

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
          {guide.sections.map((s) => (
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

        {guide.cta && (
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
