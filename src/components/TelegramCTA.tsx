// Driver community CTA — links to NEXT_PUBLIC_TELEGRAM_INVITE_URL when set.
// Hidden when unset, so we never promise a community link that doesn't exist.

function safeTelegramUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    // Only accept https://t.me/... and https://telegram.me/...
    if (url.protocol !== "https:") return null;
    if (!/(^|\.)t(elegram)?\.me$/.test(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default function TelegramCTA() {
  const href = safeTelegramUrl(process.env.NEXT_PUBLIC_TELEGRAM_INVITE_URL);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-4 rounded-2xl border border-accent/30 bg-accent-soft p-5 transition-colors hover:bg-accent-soft/80"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-[#04130a]">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M21.4 4.1 2.9 11.3c-1.1.4-1.1 1.5 0 1.9l4.7 1.5 1.8 5.7c.2.7.4.9.9.9.4 0 .6-.2.9-.5l2.4-2.3 4.9 3.6c.9.5 1.6.3 1.8-.8l3.3-15.5c.3-1.3-.5-1.9-1.4-1.7z" /></svg>
        </span>
        <div>
          <p className="text-sm font-bold text-accent">Step 2 — Join the driver community</p>
          <p className="mt-0.5 text-xs text-muted">Real drivers, real questions, real answers. Free.</p>
        </div>
      </div>
      <span className="text-sm font-medium text-accent">Open Telegram →</span>
    </a>
  );
}
