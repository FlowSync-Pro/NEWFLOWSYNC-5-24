"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveDriver, rejectDriver, setDriverTier, adminResetDriverPassword, deleteDriver } from "@/app/actions/admin";

export interface AdminDoc {
  kind: string;
  url: string;
  status: string;
}

export interface AdminDriverRow {
  id: string;
  name: string;
  email: string;
  service: string;
  city: string;
  verified: boolean;
  tier: string;
  createdAt: string;
  documents: AdminDoc[];
}

const DOC_LABEL: Record<string, string> = {
  PROFILE_PHOTO: "Profile photo",
  VEHICLE_PHOTO: "Vehicle photo",
  LICENSE: "Driver's license",
  INSURANCE: "Insurance",
  DRIVING_RECORD: "Driving record",
};

function DriverCard({ driver }: { driver: AdminDriverRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [tempPw, setTempPw] = useState<string | null>(null);

  const act = async (fn: (id: string) => Promise<{ ok: boolean }>) => {
    setBusy(true);
    await fn(driver.id);
    setBusy(false);
    router.refresh();
  };

  const resetPassword = async () => {
    setBusy(true);
    const res = await adminResetDriverPassword(driver.id);
    setBusy(false);
    if (res.tempPassword) setTempPw(res.tempPassword);
  };

  const remove = async () => {
    if (!confirm(`Delete ${driver.name || "this driver"}? This permanently removes their account, profile, and documents. This can't be undone.`)) return;
    setBusy(true);
    await deleteDriver(driver.id);
    setBusy(false);
    router.refresh();
  };

  const hasLicense = driver.documents.some((d) => d.kind === "LICENSE");
  const hasInsurance = driver.documents.some((d) => d.kind === "INSURANCE");
  const premium = driver.tier === "PREMIUM";

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{driver.name || "(no name)"}</p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${driver.verified ? "bg-accent text-[#04130a]" : "bg-surface-2 text-muted"}`}>
              {driver.verified ? "Verified" : "Pending"}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${premium ? "bg-amber-400/20 text-amber-300" : "bg-surface-2 text-muted"}`}>
              {premium ? "★ Premium" : "Standard"}
            </span>
          </div>
          <p className="text-xs text-muted">{driver.email} · {driver.service} · {driver.city || "—"}</p>
          <p className="mt-1 text-xs text-muted">
            License {hasLicense ? "✓" : "✗"} · Insurance {hasInsurance ? "✓" : "✗"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!driver.verified && (
            <>
              <button onClick={() => act(approveDriver)} disabled={busy} className="btn-primary rounded-full px-5 py-2 text-sm disabled:opacity-50">
                Approve
              </button>
              <button onClick={() => act(rejectDriver)} disabled={busy} className="rounded-full border border-border px-5 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50">
                Reject
              </button>
            </>
          )}
          <button
            onClick={() => act((id) => setDriverTier(id, premium ? "STANDARD" : "PREMIUM"))}
            disabled={busy}
            className={`rounded-full px-5 py-2 text-sm disabled:opacity-50 ${premium ? "border border-border text-muted hover:text-foreground" : "bg-amber-400/20 text-amber-300 hover:bg-amber-400/30"}`}
          >
            {premium ? "Set Standard" : "★ Upgrade to Premium"}
          </button>
          <button onClick={resetPassword} disabled={busy} className="rounded-full border border-border px-5 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50">
            Reset password
          </button>
          <button onClick={remove} disabled={busy} className="rounded-full border border-red-500/40 px-5 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50">
            Delete
          </button>
        </div>
      </div>

      {tempPw && (
        <div className="mt-4 rounded-xl border border-accent/40 bg-accent-soft p-4 text-sm">
          <p className="font-semibold text-accent">Temporary password created</p>
          <p className="mt-1 text-muted">Send this to {driver.name || "the driver"} — they&apos;ll set their own password on first sign-in. We also emailed it.</p>
          <code className="mt-2 inline-block select-all rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-base text-foreground">{tempPw}</code>
        </div>
      )}

      {driver.documents.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {driver.documents.map((d) => (
            <a key={d.kind} href={d.url} target="_blank" rel="noreferrer" className="group block">
              <div className="overflow-hidden rounded-lg border border-border bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.url} alt={DOC_LABEL[d.kind] ?? d.kind} className="h-24 w-full object-cover transition-opacity group-hover:opacity-80" />
              </div>
              <p className="mt-1 truncate text-[11px] text-muted">{DOC_LABEL[d.kind] ?? d.kind}</p>
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">No documents uploaded yet.</p>
      )}
    </div>
  );
}

export default function AdminDrivers({ drivers }: { drivers: AdminDriverRow[] }) {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const pending = drivers.filter((d) => !d.verified);
  const shown = tab === "pending" ? pending : drivers;

  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-full border border-border bg-surface p-1 w-fit">
        {([["pending", `Pending (${pending.length})`], ["all", `All (${drivers.length})`]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${tab === id ? "bg-accent text-[#04130a]" : "text-muted hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          {tab === "pending" ? "Nothing waiting for review." : "No drivers yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((d) => <DriverCard key={d.id} driver={d} />)}
        </div>
      )}
    </div>
  );
}
