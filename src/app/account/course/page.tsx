import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getEntitlements, hasProAccess } from "@/lib/access";
import { COURSE, LESSONS } from "@/lib/course";
import ProGate from "@/components/ProGate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Curri mastermind", robots: { index: false } };

/** Loom / YouTube / Vimeo share links → embeddable player URL. */
function embedUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.hostname.includes("loom.com")) {
      const m = u.pathname.match(/\/(share|embed)\/([a-zA-Z0-9]+)/);
      return m ? `https://www.loom.com/embed/${m[2]}` : null;
    }
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("vimeo.com")) {
      const m = u.pathname.match(/\/(\d+)/);
      return m ? `https://player.vimeo.com/video/${m[1]}` : null;
    }
  } catch {}
  return null;
}

export default async function CoursePage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const ent = await getEntitlements();
  if (!hasProAccess(ent)) {
    return (
      <ProGate
        title="The Curri mastermind is part of Premium"
        blurb="Six lessons on exactly how one rented van became four Sprinters on one app: carrier accounts, bidding, vehicle classes, and getting paid."
      />
    );
  }

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-48" />
      <div className="relative mx-auto max-w-3xl px-5 py-10">
        <Link href="/account" className="text-sm text-muted hover:text-foreground">← Account</Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-accent">Premium</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{COURSE.title}</h1>
        <p className="mt-2 text-muted">{COURSE.intro}</p>

        <ol className="mt-8 space-y-5">
          {LESSONS.map((l, i) => {
            const embed = l.videoUrl ? embedUrl(l.videoUrl) : null;
            return (
              <li key={l.slug} className="card p-6">
                <div className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold tracking-tight">{l.title}</h2>
                    <p className="mt-1 text-sm text-muted">{l.summary}</p>
                    {embed ? (
                      <div className="mt-4 overflow-hidden rounded-xl border border-border" style={{ aspectRatio: "16 / 9" }}>
                        <iframe src={embed} title={l.title} allowFullScreen className="h-full w-full" />
                      </div>
                    ) : l.videoUrl ? (
                      <a href={l.videoUrl} target="_blank" rel="noreferrer" className="btn-primary mt-4 inline-flex rounded-full px-5 py-2 text-sm">Watch the lesson →</a>
                    ) : (
                      <p className="mt-4 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted">Video coming — the notes below are the lesson for now.</p>
                    )}
                    <ul className="mt-4 space-y-1.5 text-sm text-muted">
                      {l.keyPoints.map((k) => (
                        <li key={k} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{k}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-8 text-xs leading-relaxed text-muted">{COURSE.disclaimer}</p>
        <p className="mt-4 text-sm text-muted">
          Ready to put it to work?{" "}
          <Link href="/account/bidding-calculator" className="font-medium text-accent hover:underline">Open the bidding calculator →</Link>
        </p>
      </div>
    </div>
  );
}
