"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  byCategory,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  inPeriod,
  loadTransactions,
  resetTransactions,
  saveTransactions,
  seedTransactions,
  toCSV,
  totals,
  type Period,
  type Tx,
  type TxType,
} from "@/lib/pnl";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const todayStr = () => new Date().toISOString().slice(0, 10);

const PERIODS: { id: Period; label: string }[] = [
  { id: "week", label: "Last 7 days" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
];

// `cloud` is true for P&L Tracker Pro subscribers: their data loads from and saves to
// their FlowSync account so it follows them across devices. Everyone else uses
// localStorage exactly as before.
export default function ProfitLossTracker({ cloud = false }: { cloud?: boolean } = {}) {
  const [txs, setTxs] = useState<Tx[] | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const hasUserInteracted = useRef(false);

  // new-transaction form
  const [type, setType] = useState<TxType>("income");
  const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");

  useEffect(() => {
    if (cloud) {
      let active = true;
      hasUserInteracted.current = false;
      fetch("/api/pnl")
        .then((r) => r.json())
        .then((d) => {
          if (!active) return;
          // Don't overwrite state if user has already interacted with the component.
          // This prevents losing user data when the initial fetch completes after
          // the user has added/modified transactions.
          if (hasUserInteracted.current) return;
          // Use the account copy when it exists; otherwise fall back to whatever is
          // already in localStorage (e.g. data entered before subscribing).
          if (d?.entitled && Array.isArray(d.txs)) setTxs(d.txs as Tx[]);
          else setTxs(loadTransactions());
        })
        .catch(() => { if (active && !hasUserInteracted.current) setTxs(loadTransactions()); });
      return () => { active = false; };
    }
    const raf = requestAnimationFrame(() => setTxs(loadTransactions()));
    return () => cancelAnimationFrame(raf);
  }, [cloud]);

  const filtered = useMemo(
    () => (txs ?? []).filter((t) => inPeriod(t.date, period)),
    [txs, period]
  );
  const sum = useMemo(() => totals(filtered), [filtered]);
  const expenseCats = useMemo(() => byCategory(filtered, "expense"), [filtered]);
  const incomeCats = useMemo(() => byCategory(filtered, "income"), [filtered]);
  const maxCat = Math.max(1, ...expenseCats.map((c) => c.amount), ...incomeCats.map((c) => c.amount));

  if (!txs) return <div className="py-24 text-center text-muted">Loading tracker…</div>;

  const saveCloud = (next: Tx[]) => {
    if (!cloud) return;
    fetch("/api/pnl", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txs: next }),
    }).catch(() => {});
  };

  const update = (next: Tx[]) => {
    hasUserInteracted.current = true;
    setTxs(next);
    saveTransactions(next);
    saveCloud(next);
  };

  const switchType = (t: TxType) => {
    setType(t);
    setCategory((t === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0]);
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    const tx: Tx = {
      id: `${Date.now()}`,
      type,
      category,
      amount: amt,
      date: date || todayStr(),
      note: note.trim() || undefined,
    };
    update([tx, ...txs]);
    setAmount("");
    setNote("");
  };

  const remove = (id: string) => update(txs.filter((t) => t.id !== id));

  const exportCSV = () => {
    const blob = new Blob([toCSV(filtered)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flowsync-pnl-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const sortedFiltered = [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Profit &amp; Loss tracker</h1>
            {cloud && (
              <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                Pro · saved to your account
              </span>
            )}
          </div>
          <p className="mt-2 text-muted">Know exactly what&apos;s coming in and going out of your business.</p>
        </div>
        <div className="flex gap-1 rounded-full border border-border bg-surface p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                period === p.id ? "bg-accent text-[#04130a]" : "text-muted hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-5">
          <p className="text-xs text-muted">Income</p>
          <p className="mt-1 text-2xl font-bold text-accent">{money(sum.income)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-muted">Expenses</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{money(sum.expenses)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-muted">Net profit</p>
          <p className={`mt-1 text-2xl font-bold ${sum.net >= 0 ? "text-accent" : "text-red-400"}`}>
            {money(sum.net)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-muted">Profit margin</p>
          <p className="mt-1 text-2xl font-bold">{Math.round(sum.margin)}%</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.3fr] lg:items-start">
        {/* Add transaction */}
        <section className="card p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold">Add a transaction</h2>
          <div className="mt-4 flex gap-1 rounded-full border border-border bg-surface-2 p-1">
            {(["income", "expense"] as TxType[]).map((t) => (
              <button
                key={t}
                onClick={() => switchType(t)}
                className={`flex-1 rounded-full px-4 py-2 text-sm capitalize transition-colors ${
                  type === t ? "bg-accent text-[#04130a]" : "text-muted hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <form onSubmit={add} className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent"
              >
                {cats.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Amount</label>
                <div className="mt-1.5 flex items-center rounded-xl border border-border bg-surface-2">
                  <span className="pl-3 text-sm text-muted">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent"
                />
              </div>
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
            <button type="submit" className="btn-primary w-full rounded-xl px-5 py-3 text-sm">
              Add {type}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs">
            <button onClick={exportCSV} className="flex items-center gap-1.5 text-accent hover:underline">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={() => update(seedTransactions())}
              className="text-muted hover:underline"
            >
              Load sample data
            </button>
            <button
              onClick={() => { resetTransactions(); setTxs([]); saveCloud([]); }}
              className="text-muted hover:underline"
            >
              Clear all
            </button>
          </div>
        </section>

        {/* Breakdown + list */}
        <div className="space-y-6">
          {/* Category breakdown */}
          <section className="card p-6">
            <h2 className="text-lg font-semibold">Where the money goes</h2>
            {expenseCats.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No expenses in this period yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {expenseCats.map((c) => (
                  <div key={c.category}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">{c.category}</span>
                      <span className="font-medium">{money(c.amount)}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent/60" style={{ width: `${(c.amount / maxCat) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Transactions */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold">Transactions</h2>
              <span className="text-xs text-muted">{sortedFiltered.length} in period</span>
            </div>
            {sortedFiltered.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted">
                No transactions yet. Add one or load the sample data.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {sortedFiltered.map((t) => (
                  <li key={t.id} className="flex items-center gap-4 px-6 py-3.5">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        t.type === "income" ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        {t.type === "income" ? (
                          <path d="M12 19V5m0 0l-6 6m6-6l6 6" strokeLinecap="round" strokeLinejoin="round" />
                        ) : (
                          <path d="M12 5v14m0 0l6-6m-6 6l-6-6" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {t.category}
                        {t.note && <span className="font-normal text-muted"> · {t.note}</span>}
                      </p>
                      <p className="text-xs text-muted">{t.date}</p>
                    </div>
                    <span className={`text-sm font-semibold ${t.type === "income" ? "text-accent" : "text-foreground"}`}>
                      {t.type === "income" ? "+" : "−"}{money(t.amount)}
                    </span>
                    <button
                      onClick={() => remove(t.id)}
                      className="text-muted transition-colors hover:text-red-400"
                      aria-label="Delete transaction"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        Your data is saved privately in your browser on this device.
      </p>
    </div>
  );
}
