import Link from "next/link";
import { listPublicReviews, reviewSummary } from "@/lib/reviews";

function Stars({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
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

export interface ReviewStripProps {
  /** How many to display. Pulls a few extras then takes this many. */
  take?: number;
  /** When true, render nothing if there are fewer than `minToShow` approved
   * reviews — avoids a sparse-looking section early on. */
  minToShow?: number;
  /** Show a "Read all" link at the bottom pointing to /reviews. */
  showSeeAllLink?: boolean;
}

/** Server component — renders only real, admin-approved reviews. Returns null
 * when there aren't enough to look credible yet. */
export default async function ReviewStrip({
  take = 3,
  minToShow = 3,
  showSeeAllLink = true,
}: ReviewStripProps) {
  const [reviews, summary] = await Promise.all([
    listPublicReviews(take),
    reviewSummary(),
  ]);
  if (reviews.length < minToShow) return null;

  return (
    <section className="mx-auto mt-8 max-w-3xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Stars rating={summary.averageRating} />
          <span className="text-sm font-medium">
            {summary.averageRating.toFixed(1)} ·{" "}
            <span className="text-muted">{summary.count} driver review{summary.count === 1 ? "" : "s"}</span>
          </span>
        </div>
        {showSeeAllLink && (
          <Link href="/reviews" className="text-xs font-medium text-accent hover:underline">
            Read all →
          </Link>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {reviews.map((r) => (
          <figure key={r.id} className="card flex h-full flex-col p-5">
            <Stars rating={r.rating} />
            <blockquote className="mt-3 flex-1 text-pretty text-sm leading-relaxed">
              &ldquo;{r.text}&rdquo;
            </blockquote>
            <figcaption className="mt-4 border-t border-border pt-3 text-xs">
              <span className="font-semibold">{r.displayName}</span>
              {r.city && <span className="text-muted"> · {r.city}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
