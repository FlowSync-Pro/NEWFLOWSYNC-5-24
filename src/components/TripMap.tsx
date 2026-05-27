// Route map for a trip's pickup -> drop-off.
// If NEXT_PUBLIC_GOOGLE_MAPS_KEY is set, shows an inline embedded route map.
// Otherwise shows a "View route" button that opens Google Maps directions (no key needed).
export default function TripMap({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const o = encodeURIComponent(pickup);
  const d = encodeURIComponent(dropoff);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}`;

  if (key) {
    return (
      <div className="overflow-hidden rounded-xl border border-border">
        <iframe
          title="Route"
          className="h-48 w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/directions?key=${key}&origin=${o}&destination=${d}&mode=driving`}
        />
      </div>
    );
  }

  return (
    <a
      href={directionsUrl}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm transition-colors hover:border-accent/50"
    >
      <span className="min-w-0 truncate text-muted">
        <span className="text-foreground">{pickup}</span> → <span className="text-foreground">{dropoff}</span>
      </span>
      <span className="ml-3 inline-flex shrink-0 items-center gap-1 font-medium text-accent">
        View route
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    </a>
  );
}
