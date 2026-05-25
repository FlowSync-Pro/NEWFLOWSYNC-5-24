"use client";

import { useActionState, useState } from "react";
import { requestBooking, type RequestState } from "@/app/actions/bookings";

export default function RequestQuoteButton({
  driverProfileId,
  driverName,
  service,
}: {
  driverProfileId: string;
  driverName: string;
  service: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<RequestState, FormData>(requestBooking, {});
  const firstName = driverName.split(" ")[0];

  return (
    <section className="card p-6 text-center">
      <p className="text-sm font-semibold">Need {service.toLowerCase()}?</p>
      <button onClick={() => setOpen(true)} className="btn-primary mt-3 w-full rounded-full px-6 py-3 text-sm">
        Request a quote from {firstName}
      </button>
      <p className="mt-2 text-xs text-muted">You deal directly with {firstName} — no middleman markup.</p>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md p-7 text-left" onClick={(e) => e.stopPropagation()}>
            {state.ok ? (
              <div className="py-4 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-7 w-7">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <h2 className="mt-4 text-lg font-bold">Request sent</h2>
                <p className="mt-2 text-sm text-muted">{firstName} will review your request and reply with a quote. You&apos;ll get an email with a link to pay — and {firstName} keeps 95%.</p>
                <button onClick={() => setOpen(false)} className="btn-primary mt-5 rounded-full px-6 py-2.5 text-sm">Done</button>
              </div>
            ) : (
              <>
                <h2 className="font-semibold">Request a quote from {firstName}</h2>
                <p className="text-xs text-muted">{service}</p>
                <form action={action} className="mt-5 space-y-3">
                  <input type="hidden" name="driverProfileId" value={driverProfileId} />
                  <input name="name" required placeholder="Your name" className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent" />
                  <input name="email" required type="email" placeholder="Email" className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent" />
                  <textarea name="details" required rows={3} placeholder="What do you need delivered or done?" className="w-full resize-none rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent" />
                  {state.error && <p className="text-sm text-red-400">{state.error}</p>}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1 rounded-full px-4 py-2.5 text-sm">Cancel</button>
                    <button type="submit" disabled={pending} className="btn-primary flex-1 rounded-full px-4 py-2.5 text-sm disabled:opacity-60">
                      {pending ? "Sending…" : "Send request"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
