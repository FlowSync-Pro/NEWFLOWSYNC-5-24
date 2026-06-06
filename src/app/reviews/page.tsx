import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublicReviews, reviewSummary } from "@/lib/reviews";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Driver reviews — FlowSync",
  description:
    "Real reviews from FlowSync drivers about their signup experience. Honest feedback from drivers who joined the platform.",
  alternates: { canonical: `${SITE_URL}/reviews` },
};

function Stars({ rating, size = "h-5 w-5" }: { rating: number; size?: string }) {
  return (
    <div className="flex gap-0.5 text-accent">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" fill={n <= Math.round(rating) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" className={size}>
          <path d="M12 2l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 15.4 6.8 18.1l1-5.8L3.5 8.2l5.9-.9z" strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
}

export default async function ReviewsPage() {
  const [reviews, summary] = await Promise.all([listPublicReviews(), reviewSummary()]);
  // Hide the page entirely until we have real reviews. Empty state would look
  // worse than the page not existing yet.
  if (reviews.length === 0) notFound();

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <section className="relative mx-auto max-w-5xl px-5 pt-14 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Driver reviews</p>
        <h1 className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          Real drivers, real signup experience.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-muted">
          Every review here is from a verified FlowSync driver and reviewed by our team before
          publishing. No paid reviews, no fakes.
        </p>
        {reviews.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Stars rating={summary.averageRating} />
            <span className="text-sm font-medium">
              {summary.averageRating.toFixed(1)} ·{" "}
              <span className="text-muted">{summary.count} review{summary.count === 1 ? "" : "s"}</span>
            </span>
          </div>
        )}
      </section>

      <div className="relative mx-auto max-w-5xl px-5 py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <figure key={r.id} className="card flex h-full flex-col p-6">
              <Stars rating={r.rating} />
              <blockquote className="mt-4 flex-1 text-pretty text-sm leading-relaxed">
                &ldquo;{r.text}&rdquo;
              </blockquote>
              <figcaption className="mt-5 border-t border-border pt-4">
                <p className="text-sm font-semibold">{r.displayName}</p>
                {r.city && <p className="text-xs text-muted">{r.city}</p>}
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="mt-12 text-center">
          <p className="text-muted">Ready to join them?</p>
          <Link href="/pricing" className="btn-primary mt-4 inline-flex rounded-full px-7 py-3 text-sm">
            Get listed for $17
          </Link>
        </div>
      </div>
    </div>
  );
}
