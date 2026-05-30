"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DAILY_HABITS,
  LAUNCH_CHECKLIST,
  MILESTONES,
  launchPercent,
  type Milestone,
  type RoadmapTask,
} from "@/lib/roadmap";
import { checkInToday, toggleTask } from "@/app/actions/roadmap";

function Check({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface RoadmapTrackerProps {
  firstName: string;
  initialTasks: string[];
  streak: number;
  checkedInToday: boolean;
}

export default function RoadmapTracker({ firstName, initialTasks, streak, checkedInToday }: RoadmapTrackerProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Set<string>>(new Set(initialTasks));
  const [checkedIn, setCheckedIn] = useState(checkedInToday);
  const [dayDone, setDayDone] = useState<Set<string>>(new Set());

  const toggle = async (id: string) => {
    // Optimistic
    setTasks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    await toggleTask(id);
    router.refresh();
  };

  const launchPct = launchPercent([...tasks]);

  const allDailyDone = DAILY_HABITS.every((h) => dayDone.has(h.id));
  const markDay = async (id: string) => {
    setDayDone((prev) => new Set(prev).add(id));
  };
  const completeDay = async () => {
    setCheckedIn(true);
    await checkInToday();
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      {/* Header + streak */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your Roadmap</h1>
          <p className="mt-2 text-muted">Cross things off, build a daily habit, and grow your business{firstName ? `, ${firstName}` : ""}.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-accent/40 bg-accent-soft px-5 py-3">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-2xl font-extrabold leading-none text-accent">{streak}</p>
            <p className="text-xs text-muted">day streak</p>
          </div>
        </div>
      </div>

      {/* Launch checklist */}
      <section className="mt-8 card p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">Launch checklist</h2>
          <span className="text-sm font-semibold text-accent">{launchPct}% done</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${launchPct}%` }} />
        </div>
        {launchPct === 100 && (
          <p className="mt-3 rounded-xl border border-accent/30 bg-accent-soft p-3 text-sm font-medium text-accent">
            🎉 You&apos;re fully set up — now keep the daily habit going below.
          </p>
        )}
        <ul className="mt-4 space-y-2">
          {LAUNCH_CHECKLIST.map((t) => (
            <TaskRow key={t.id} task={t} done={tasks.has(t.id)} onToggle={() => toggle(t.id)} />
          ))}
        </ul>
      </section>

      {/* Daily habits */}
      <section className="mt-6 card p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">Today&apos;s game plan</h2>
          {checkedIn ? (
            <span className="text-sm font-semibold text-accent">✓ Checked in today</span>
          ) : (
            <span className="text-xs text-muted">{dayDone.size}/{DAILY_HABITS.length}</span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">Do these every day you drive. Finish them all to log your streak.</p>
        <ul className="mt-4 space-y-2">
          {DAILY_HABITS.map((h) => (
            <TaskRow key={h.id} task={h} done={checkedIn || dayDone.has(h.id)} onToggle={() => markDay(h.id)} disabled={checkedIn} />
          ))}
        </ul>
        {!checkedIn && (
          <button
            onClick={completeDay}
            disabled={!allDailyDone}
            className="btn-primary mt-4 w-full rounded-full px-6 py-3 text-sm disabled:opacity-50"
          >
            {allDailyDone ? "Log today & extend my streak 🔥" : "Finish today's tasks to log your streak"}
          </button>
        )}
      </section>

      {/* Milestones */}
      <section className="mt-6 card p-6">
        <h2 className="text-lg font-bold">Milestones</h2>
        <p className="mt-1 text-sm text-muted">Your path from first job to a thriving business. Tap a milestone for the guide that gets you there.</p>
        <ol className="mt-5 space-y-3">
          {MILESTONES.map((m, i) => (
            <MilestoneRow key={m.id} milestone={m} index={i} done={tasks.has(m.id)} onToggle={() => toggle(m.id)} />
          ))}
        </ol>
      </section>
    </div>
  );
}

function TaskRow({ task, done, onToggle, disabled }: { task: RoadmapTask; done: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 p-3">
      <button
        onClick={onToggle}
        disabled={disabled}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
          done ? "border-accent bg-accent text-[#04130a]" : "border-border text-transparent hover:border-accent/60"
        } ${disabled ? "cursor-default" : ""}`}
      >
        <Check className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <p className={`text-sm font-medium ${done ? "text-muted line-through" : ""}`}>{task.label}</p>
        {task.detail && <p className="mt-0.5 text-xs text-muted">{task.detail}</p>}
      </div>
      {task.href && (
        <Link href={task.href} className="mt-0.5 shrink-0 text-accent hover:text-foreground" aria-label="Open">
          <Arrow />
        </Link>
      )}
    </li>
  );
}

function MilestoneRow({ milestone, index, done, onToggle }: { milestone: Milestone; index: number; done: boolean; onToggle: () => void }) {
  return (
    <li className="flex items-start gap-3">
      <button
        onClick={onToggle}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
          done ? "border-accent bg-accent text-[#04130a]" : "border-border text-muted hover:border-accent/60"
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : index + 1}
      </button>
      <div className="flex-1 rounded-xl border border-border bg-surface-2 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className={`text-sm font-semibold ${done ? "text-muted line-through" : ""}`}>{milestone.label}</p>
          {milestone.href && (
            <Link href={milestone.href} className="shrink-0 text-accent hover:text-foreground" aria-label="Open guide">
              <Arrow />
            </Link>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted">{milestone.detail}</p>
      </div>
    </li>
  );
}
