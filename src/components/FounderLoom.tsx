// Founder welcome video — embedded if NEXT_PUBLIC_FOUNDER_LOOM_URL is set in env.
// Hidden when not set, so we never show an empty/broken embed.
// Accepts a Loom share URL (https://www.loom.com/share/<id>...). Converts to the
// /embed/ format for the iframe.

function loomEmbedUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    if (!/loom\.com$/.test(url.hostname)) return null;
    // /share/<id> or already /embed/<id>
    const m = url.pathname.match(/\/(share|embed|v)\/([a-z0-9]+)/i);
    if (!m) return null;
    return `https://www.loom.com/embed/${m[2]}`;
  } catch {
    return null;
  }
}

export default function FounderLoom({ firstName }: { firstName?: string }) {
  const src = loomEmbedUrl(process.env.NEXT_PUBLIC_FOUNDER_LOOM_URL);
  if (!src) return null;
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M8 5v14l11-7z" /></svg>
        </span>
        <h2 className="text-base font-semibold">
          {firstName ? `Hey ${firstName} — start here (60 seconds)` : "Start here (60 seconds)"}
        </h2>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-black">
        <div className="relative aspect-video">
          <iframe
            src={src}
            title="Welcome to FlowSync"
            className="absolute inset-0 h-full w-full"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
