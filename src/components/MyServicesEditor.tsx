"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addService, deleteService } from "@/app/actions/services";

export interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const inputCls =
  "w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent";

export default function MyServicesEditor({ services }: { services: ServiceRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await addService({ name, description, price: Number(price) });
    setBusy(false);
    if (res.ok) {
      setName(""); setPrice(""); setDescription("");
      router.refresh();
    } else {
      setError(res.error ?? "Couldn't add that service.");
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    await deleteService(id);
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-start">
      {/* Add form */}
      <form onSubmit={add} className="card space-y-3 p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold">Add a service</h2>
        <input className={inputCls} placeholder="Service name (e.g. Same-day grocery run)" value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="flex items-center rounded-xl border border-border bg-surface-2">
          <span className="pl-3 text-sm text-muted">$</span>
          <input className="w-full bg-transparent px-2 py-2.5 text-sm outline-none" type="number" min="1" step="0.01" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>
        <textarea className={`${inputCls} resize-none`} rows={3} placeholder="What's included? (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full rounded-full px-5 py-3 text-sm disabled:opacity-60">
          {busy ? "Saving…" : "Add to my menu"}
        </button>
      </form>

      {/* Menu */}
      <div>
        <h2 className="text-lg font-semibold">Your service menu</h2>
        {services.length === 0 ? (
          <div className="card mt-3 p-8 text-center text-muted">Nothing on your menu yet. Add your first service.</div>
        ) : (
          <div className="mt-3 space-y-3">
            {services.map((s) => (
              <div key={s.id} className="card flex items-start justify-between gap-4 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{s.name}</p>
                    <span className="font-bold text-accent">{money(s.priceCents)}</span>
                  </div>
                  {s.description && <p className="mt-1 text-sm text-muted">{s.description}</p>}
                </div>
                <button onClick={() => remove(s.id)} disabled={busy} className="shrink-0 text-muted transition-colors hover:text-red-400" aria-label="Remove service">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
