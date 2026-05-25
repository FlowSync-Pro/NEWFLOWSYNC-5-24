"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendQuote } from "@/app/actions/bookings";

export interface BookingRow {
  id: string;
  customerName: string;
  status: string;
  details: string;
  service: string;
  quoteAmount: number | null; // cents
  createdAt: string;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const STATUS_STYLE: Record<string, string> = {
  REQUESTED: "bg-surface-2 text-muted",
  QUOTED: "bg-accent-soft text-accent",
  PAID: "bg-accent text-[#04130a]",
  COMPLETED: "bg-accent text-[#04130a]",
  CANCELLED: "bg-surface-2 text-muted",
};

function QuoteRow({ booking }: { booking: BookingRow }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await sendQuote(booking.id, Number(amount));
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.error ?? "Could not send quote.");
  };

  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="flex items-center rounded-xl border border-border bg-surface-2">
        <span className="pl-3 text-sm text-muted">$</span>
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Quote amount"
          className="w-32 bg-transparent px-2 py-2.5 text-sm outline-none"
        />
      </div>
      <button onClick={submit} disabled={busy} className="btn-primary rounded-xl px-4 py-2.5 text-sm disabled:opacity-60">
        {busy ? "Sending…" : "Send quote"}
      </button>
      {error && <span className="text-sm text-red-400">{error}</span>}
    </div>
  );
}

export default function BookingsList({ bookings }: { bookings: BookingRow[] }) {
  if (bookings.length === 0) {
    return (
      <div className="card mt-6 p-10 text-center text-muted">
        No booking requests yet. They&apos;ll show up here when a customer requests a quote from your profile.
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-4">
      {bookings.map((b) => (
        <div key={b.id} className="card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">{b.customerName}</p>
              <p className="text-xs text-muted">{b.service} · {new Date(b.createdAt).toLocaleDateString()}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLE[b.status] ?? "bg-surface-2 text-muted"}`}>
              {b.status === "PAID" ? `Paid ${b.quoteAmount ? money(b.quoteAmount) : ""}` : b.status.toLowerCase()}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted">{b.details}</p>

          {b.status === "REQUESTED" && <QuoteRow booking={b} />}
          {b.status === "QUOTED" && b.quoteAmount != null && (
            <p className="mt-3 text-sm">Quoted <span className="font-semibold text-accent">{money(b.quoteAmount)}</span> — waiting on the customer to pay.</p>
          )}
        </div>
      ))}
    </div>
  );
}
