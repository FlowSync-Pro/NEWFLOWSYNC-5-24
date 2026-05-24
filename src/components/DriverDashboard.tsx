"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BADGES,
  currentTier,
  loadGame,
  logJob,
  resetGame,
  saveGame,
  SEED_STATE,
  unlockedIds,
  type GameState,
} from "@/lib/game";
import { loadProfile } from "@/lib/profile";
import { getService } from "@/lib/services";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function BadgeIcon({ icon, className = "h-6 w-6" }: { icon: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    flag: <path d="M5 21V4m0 0h11l-2 4 2 4H5" strokeLinecap="round" strokeLinejoin="round" />,
    ten: <><circle cx="12" cy="12" r="9" /><path d="M9 9l1.5-1v6M15 8.5v7" strokeLinecap="round" /></>,
    target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></>,
    half: <><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" /></>,
    almost: <><circle cx="12" cy="12" r="8" /><path d="M12 12V4a8 8 0 0 1 6.9 12z" fill="currentColor" stroke="none" /></>,
    trophy: <path d="M7 4h10v3a5 5 0 0 1-10 0zM5 4H3v2a3 3 0 0 0 3 3M19 4h2v2a3 3 0 0 1-3 3M9 18h6M10 14v4M14 14v4M8 21h8" strokeLinecap="round" strokeLinejoin="round" />,
    flame: <path d="M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-1.5.6-2.7 1.5-3.5C8.7 10 9 11 10 11c0-2 1-4 2-8z" strokeLinejoin="round" />,
    century: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      {paths[icon]}
    </svg>
  );
}

function Ring({ percent }: { percent: number }) {
  const r = 72;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, percent) / 100);
  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      <svg viewBox="0 0 180 180" className="h-48 w-48 -rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--border)" strokeWidth="14" />
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-4xl font-extrabold text-accent">{Math.round(percent)}%</p>
        <p className="text-xs text-muted">to goal</p>
      </div>
    </div>
  );
}

export default function DriverDashboard() {
  const [state, setState] = useState<GameState | null>(null);
  const [name, setName] = useState("Driver");
  const [serviceLabel, setServiceLabel] = useState<string | null>(null);
  const [amount, setAmount] = useState(85);
  const [justUnlocked, setJustUnlocked] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setState(loadGame());
      const p = loadProfile();
      if (p) {
        setName(p.firstName || "Driver");
        const svc = getService(p.primaryService);
        if (svc) setServiceLabel(svc.profileHeadline);
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!state) {
    return <div className="py-24 text-center text-muted">Loading dashboard…</div>;
  }

  const percent = state.monthlyGoal > 0 ? (state.earnings / state.monthlyGoal) * 100 : 0;
  const unlocked = unlockedIds(state);
  const { tier, next } = currentTier(state.jobs);
  const tierProgress = next ? Math.min(100, (state.jobs / next.minJobs) * 100) : 100;
  const maxWeek = Math.max(...state.weeks, 1);

  const update = (next: GameState) => {
    setState(next);
    saveGame(next);
  };

  const handleLog = () => {
    const before = unlockedIds(state);
    const nextState = logJob(state, amount);
    const after = unlockedIds(nextState);
    const newly = BADGES.filter((b) => after.has(b.id) && !before.has(b.id)).map((b) => b.name);
    update(nextState);
    if (newly.length) {
      setJustUnlocked(newly);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setJustUnlocked([]), 4500);
    }
  };

  const setGoal = (g: number) => update({ ...state, monthlyGoal: Math.max(500, g) });

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">Welcome back</p>
          <h1 className="text-3xl font-bold tracking-tight">{name}&apos;s dashboard</h1>
          {serviceLabel && <p className="mt-1 text-sm text-muted">{serviceLabel}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-4 py-2 text-sm font-semibold text-accent">
            <BadgeIcon icon="trophy" className="h-4 w-4" />
            {tier.name}
          </span>
          <Link href="/profile" className="btn-ghost rounded-full px-5 py-2 text-sm">
            Public profile
          </Link>
        </div>
      </div>

      {/* Celebration banner */}
      {justUnlocked.length > 0 && (
        <div className="reveal mt-6 flex items-center gap-3 rounded-2xl border border-accent/50 bg-accent-soft px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-[#04130a]">
            <BadgeIcon icon="trophy" className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-accent">Award unlocked!</p>
            <p className="text-sm text-foreground/90">{justUnlocked.join(" · ")}</p>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        {/* Goal + ring + log */}
        <section className="card p-7">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <Ring percent={percent} />
            <div className="flex-1">
              <p className="text-sm text-muted">This month</p>
              <p className="text-3xl font-extrabold">
                {money(state.earnings)}{" "}
                <span className="text-base font-medium text-muted">/ {money(state.monthlyGoal)}</span>
              </p>
              <div className="mt-4">
                <label className="text-xs text-muted">Monthly goal: {money(state.monthlyGoal)}</label>
                <input
                  type="range"
                  min={1000}
                  max={10000}
                  step={250}
                  value={state.monthlyGoal}
                  onChange={(e) => setGoal(Number(e.target.value))}
                  className="mt-1 w-full accent-[#25e07a]"
                />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex items-center rounded-xl border border-border bg-surface-2">
                  <span className="pl-3 text-sm text-muted">$</span>
                  <input
                    type="number"
                    value={amount}
                    min={1}
                    onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))}
                    className="w-20 bg-transparent px-2 py-2.5 text-sm outline-none"
                    aria-label="Job amount"
                  />
                </div>
                <button onClick={handleLog} className="btn-primary flex-1 rounded-xl px-5 py-2.5 text-sm">
                  Log a completed job
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-4">
          {[
            { label: "Jobs this month", value: state.jobs.toLocaleString() },
            { label: "Current streak", value: `${state.streak}d` },
            { label: "Best streak", value: `${state.bestStreak}d` },
            { label: "Avg / job", value: state.jobs ? money(state.earnings / state.jobs) : "$0" },
          ].map((s) => (
            <div key={s.label} className="card p-5">
              <p className="text-2xl font-bold text-accent">{s.value}</p>
              <p className="mt-1 text-xs text-muted">{s.label}</p>
            </div>
          ))}

          {/* Tier progress */}
          <div className="card col-span-2 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{tier.name}</span>
              {next ? (
                <span className="text-muted">{next.minJobs - state.jobs} jobs to {next.name}</span>
              ) : (
                <span className="text-accent">Top tier reached</span>
              )}
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent" style={{ width: `${tierProgress}%`, transition: "width 0.5s ease" }} />
            </div>
            <p className="mt-2 text-xs text-muted">Perk: {tier.perk}</p>
          </div>
        </section>
      </div>

      {/* Weekly chart */}
      <section className="card mt-6 p-7">
        <h2 className="text-lg font-semibold">Last 4 weeks</h2>
        <div className="mt-5 flex items-end gap-4">
          {state.weeks.map((w, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-medium text-muted">{money(w)}</span>
              <div className="flex h-40 w-full items-end">
                <div
                  className={`w-full rounded-t-lg ${i === state.weeks.length - 1 ? "bg-accent" : "bg-accent/40"}`}
                  style={{ height: `${(w / maxWeek) * 100}%`, transition: "height 0.5s ease" }}
                />
              </div>
              <span className="text-xs text-muted">
                {i === state.weeks.length - 1 ? "This week" : `Wk ${i + 1}`}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Badges */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Awards <span className="text-muted">({unlocked.size}/{BADGES.length})</span>
          </h2>
          <button
            onClick={() => {
              resetGame();
              setState(SEED_STATE);
              setJustUnlocked([]);
            }}
            className="text-xs text-muted underline-offset-2 hover:underline"
          >
            Reset demo
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {BADGES.map((b) => {
            const on = unlocked.has(b.id);
            return (
              <div
                key={b.id}
                className={`card flex flex-col items-center p-5 text-center ${on ? "" : "opacity-50"}`}
                style={on ? { borderColor: "rgba(37,224,122,0.5)" } : undefined}
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                    on ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"
                  }`}
                >
                  <BadgeIcon icon={b.icon} className="h-7 w-7" />
                </span>
                <p className="mt-3 text-sm font-semibold">{b.name}</p>
                <p className="mt-1 text-xs text-muted">{b.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-muted">
        Mockup — progress is stored only in your browser. In the live app this tracks your real
        completed jobs and earnings.
      </p>
    </div>
  );
}
