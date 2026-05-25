"use client";

import { useState } from "react";

export default function RequestQuoteButton({ driverName, service }: { driverName: string; service: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const firstName = driverName.split(" ")[0];

  return (
    <section className="card p-6 text-center">
      <p className="text-sm font-semibold">Need {service.toLowerCase()}?</p>
      <button
        onClick={() => { setSent(false); setOpen(true); }}
        className="btn-primary mt-3 w-full rounded-full px-6 py-3 text-sm"
      >
        Request a quote from {firstName}
      </button>
      <p className="mt-2 text-xs text-muted">You deal directly with {firstName} — no middleman markup.</p>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div className="card w-full max-w-md p-7 text-left" onClick={(e) => e.stopPropagation()}>
            {!sent ? (
              <>
                <h2 className="font-semibold">Request a quote from {firstName}</h2>
                <p className="text-xs text-muted">{service}</p>
                <form
                  className="mt-5 space-y-3"
                  onSubmit={(e) => { e.preventDefault(); setSent(true); }}
                >
                  <input required placeholder="Your name" className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent" />
                  <input required type="email" placeholder="Email or phone" className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent" />
                  <textarea required rows={3} placeholder="What do you need delivered or done?" className="w-full resize-none rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent" />
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1 rounded-full px-4 py-2.5 text-sm">Cancel</button>
                    <button type="submit" className="btn-primary flex-1 rounded-full px-4 py-2.5 text-sm">Send request</button>
                  </div>
                </form>
              </>
            ) : (
              <div className="py-4 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-7 w-7">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <h2 className="mt-4 text-lg font-bold">Request sent (demo)</h2>
                <p className="mt-2 text-sm text-muted">
                  In the live app, {firstName} gets your request and replies with a quote — you book and pay
                  through FlowSync, and they keep 95%.
                </p>
                <button onClick={() => setOpen(false)} className="btn-primary mt-5 rounded-full px-6 py-2.5 text-sm">Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
