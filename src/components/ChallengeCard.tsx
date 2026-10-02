"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleTask } from "@/app/actions/roadmap";
import { CHALLENGE_DAYS, CHALLENGE_MADE_IT_ID, CHALLENGE_STEPS, challengeName, shareMessage } from "@/lib/challenge";
import { GUARANTEE_DAYS, listingPrice } from "@/lib/pricing";

// The First-$47 Challenge on the driver's dashboard (owner-approved copy,
// 2026-10-02). A goal, not a promise; refunds are untouched. Ticks are saved
// with the Roadmap's existing toggleTask.

function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 rounded-lg border border-border bg-background/60 p-3">
      <p className="text-xs text-muted [overflow-wrap:anywhere]">{text}</p>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard blocked — the text is still visible to copy by hand */
          }
        }}
        className="mt-2 text-xs font-semibold text-accent hover:text-foreground"
      >
        {copied ? "Copied ✓" : "Copy text"}
      </button>
    </div>
  );
}

export default function ChallengeCard({
  day,
  initialTasks,
  profileUrl,
}: {
  /** 1–7 while the challenge runs; null after day 7 (steps stay open). */
  day: number | null;
  initialTasks: string[];
  /** The driver's public profile — null until they're approved. */
  profileUrl: string | null;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Set<string>>(new Set(initialTasks));

  const toggle = async (id: string) => {
    setTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    await toggleTask(id);
    router.refresh();
  };

  const done = CHALLENGE_STEPS.filter((s) => tasks.has(s.id)).length;
  const today = day ? CHALLENGE_STEPS.find((s) => s.day === day) : undefined;
  const madeIt = tasks.has(CHALLENGE_MADE_IT_ID);

  return (
    <section className="mx-auto mt-8 max-w-3xl px-5">
      <div className="card border-accent/40 p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">
            {day ? `Day ${day} of ${CHALLENGE_DAYS} — The ${challengeName()}` : `The ${challengeName()}`}
          </h2>
          <span className="shrink-0 text-sm font-semibold text-accent">{`${done}/${CHALLENGE_STEPS.length}`}</span>
        </div>
        <p className="mt-2 text-sm text-muted">
          {`The goal: one job that covers your $${listingPrice()} listing. It's a goal, not a promise — your market and your effort decide the rest. Your ${GUARANTEE_DAYS}-day money-back guarantee applies either way.`}
        </p>
        {today && !tasks.has(today.id) && <p className="mt-3 text-sm font-medium text-accent">{`Today: ${today.label}.`}</p>}

        <ul className="mt-4 space-y-2">
          {CHALLENGE_STEPS.map((s) => {
            const isDone = tasks.has(s.id);
            return (
              <li key={s.id} className={`rounded-xl border bg-surface-2 p-3 ${day === s.day ? "border-accent/60" : "border-border"}`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggle(s.id)}
                    aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold transition-colors ${
                      isDone ? "border-accent bg-accent text-[#04130a]" : "border-border text-muted hover:border-accent/60"
                    }`}
                  >
                    {isDone ? "✓" : s.day}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${isDone ? "text-muted line-through" : ""}`}>{`Day ${s.day}: ${s.label}`}</p>
                    <p className="mt-0.5 text-xs text-muted">{s.detail}</p>
                    {s.share &&
                      !isDone &&
                      (profileUrl ? (
                        <CopyText text={shareMessage(s.share, profileUrl)} />
                      ) : (
                        <p className="mt-2 text-xs text-muted">Your profile link appears here once we&apos;ve approved you.</p>
                      ))}
                  </div>
                  {s.href && (
                    <Link href={s.href} className="mt-0.5 shrink-0 text-sm text-accent hover:text-foreground" aria-label="Open">
                      →
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => toggle(CHALLENGE_MADE_IT_ID)}
          className={`mt-4 w-full rounded-full px-6 py-3 text-sm font-semibold ${madeIt ? "btn-primary" : "btn-ghost"}`}
        >
          {madeIt ? `🎉 You made your $${listingPrice()} back — nice work` : `I made my $${listingPrice()} back`}
        </button>
      </div>
    </section>
  );
}
