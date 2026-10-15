"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import type { Risk, VerifyItem } from "@/lib/verify-checklist";

// Ticks are a per-browser convenience (localStorage), never saved on the
// server: clearing site data or another device starts unticked.
const STORE_KEY = "fs_verify_ticks_v1";
type Ticks = Record<string, string>; // "<itemId>:<stepIndex>" → ISO date ticked

const RISK: Record<Risk, { label: string; cls: string }> = {
  risky: { label: "Risky change", cls: "border-red-400/40 text-red-300" },
  safe: { label: "Safe change", cls: "border-accent/40 text-accent" },
  owner: { label: "Only you can do this", cls: "border-amber-300/40 text-amber-300" },
};
const ORDER: Risk[] = ["risky", "safe", "owner"];

// A tiny external store over localStorage, so the server render (no ticks)
// and the browser (saved ticks) never disagree during hydration.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
function readRaw(): string {
  try { return localStorage.getItem(STORE_KEY) ?? "{}"; } catch { return "{}"; }
}
function writeTicks(t: Ticks) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(t)); } catch {}
  listeners.forEach((l) => l());
}
function parse(raw: string | null): Ticks {
  try {
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export default function AdminVerifyChecklist({ items }: { items: VerifyItem[] }) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const loaded = raw !== null;
  const ticks = useMemo(() => parse(raw), [raw]);

  function toggle(key: string) {
    const next = { ...parse(readRaw()) };
    if (next[key]) delete next[key];
    else next[key] = new Date().toISOString();
    writeTicks(next);
  }

  const sorted = [...items].sort((a, b) => ORDER.indexOf(a.risk) - ORDER.indexOf(b.risk));
  const totalSteps = items.reduce((s, i) => s + i.steps.length, 0);
  const doneSteps = items.reduce((s, i) => s + i.steps.filter((_, n) => ticks[`${i.id}:${n}`]).length, 0);

  return (
    <div>
      <p className="text-sm text-muted">
        {loaded ? `${doneSteps} of ${totalSteps} steps ticked.` : " "} Ticks are remembered in this browser only.
      </p>
      <div className="mt-4 space-y-5">
        {sorted.map((item) => {
          const done = item.steps.every((_, n) => ticks[`${item.id}:${n}`]);
          return (
            <section key={item.id} className={`card p-6 ${done ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${RISK[item.risk].cls}`}>{RISK[item.risk].label}</span>
                <span className="text-xs text-muted">{item.since}</span>
                {done && <span className="text-xs font-semibold text-accent">✓ Done</span>}
              </div>
              <h2 className="mt-2 text-lg font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm text-muted">{item.why}</p>
              <ul className="mt-4 space-y-3">
                {item.steps.map((step, n) => {
                  const key = `${item.id}:${n}`;
                  const at = ticks[key];
                  return (
                    <li key={key} className="flex items-start gap-3 text-sm">
                      <input
                        id={key}
                        type="checkbox"
                        checked={!!at}
                        onChange={() => toggle(key)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#25e07a]"
                      />
                      <label htmlFor={key} className={at ? "text-muted line-through" : ""}>
                        {step.text}
                        {at && <span className="ml-2 text-xs text-muted no-underline">{`(${new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`}</span>}
                      </label>
                      {step.href && (
                        <Link href={step.href} target="_blank" className="ml-auto shrink-0 text-xs text-accent hover:underline">
                          Open ↗
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
