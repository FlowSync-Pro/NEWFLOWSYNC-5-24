"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveReview, rejectReview } from "@/app/actions/reviews";

export interface AdminReviewRow {
  id: string;
  rating: number;
  text: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  displayName: string | null;
  city: string | null;
  email: string;
  createdAt: string;
  approvedAt: string | null;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-accent">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" fill={n <= rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
          <path d="M12 2l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 15.4 6.8 18.1l1-5.8L3.5 8.2l5.9-.9z" strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
}

const STATUS_BADGE: Record<AdminReviewRow["status"], { label: string; cls: string }> = {
  PENDING: { label: "Pending", cls: "bg-amber-400/20 text-amber-300" },
  APPROVED: { label: "Approved", cls: "bg-accent text-[#04130a]" },
  REJECTED: { label: "Rejected", cls: "bg-red-500/20 text-red-400" },
};

function ReviewCard({ row }: { row: AdminReviewRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const act = async (fn: (id: string) => Promise<{ ok: boolean }>) => {
    setBusy(true);
    await fn(row.id);
    setBusy(false);
    router.refresh();
  };

  const badge = STATUS_BADGE[row.status];
  const submitted = new Date(row.createdAt).toLocaleString();

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Stars rating={row.rating} />
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>{badge.label}</span>
          </div>
          <p className="mt-2 text-sm font-semibold">
            {row.displayName || "(no profile name)"}
            {row.city && <span className="ml-1 text-muted">· {row.city}</span>}
          </p>
          <p className="text-xs text-muted">{row.email} · submitted {submitted}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {row.status !== "APPROVED" && (
            <button
              onClick={() => act(approveReview)}
              disabled={busy}
              className="btn-primary rounded-full px-5 py-2 text-sm disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {row.status !== "REJECTED" && (
            <button
              onClick={() => act(rejectReview)}
              disabled={busy}
              className="rounded-full border border-red-500/40 px-5 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >
              Reject
            </button>
          )}
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed">{row.text}</p>
    </div>
  );
}

type Tab = "pending" | "approved" | "rejected" | "all";

export default function AdminReviews({ reviews }: { reviews: AdminReviewRow[] }) {
  const [tab, setTab] = useState<Tab>("pending");
  const buckets: Record<Tab, AdminReviewRow[]> = {
    pending: reviews.filter((r) => r.status === "PENDING"),
    approved: reviews.filter((r) => r.status === "APPROVED"),
    rejected: reviews.filter((r) => r.status === "REJECTED"),
    all: reviews,
  };
  const labels: Record<Tab, string> = {
    pending: `Pending (${buckets.pending.length})`,
    approved: `Approved (${buckets.approved.length})`,
    rejected: `Rejected (${buckets.rejected.length})`,
    all: `All (${buckets.all.length})`,
  };
  const shown = buckets[tab];

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1 w-fit">
        {(["pending", "approved", "rejected", "all"] as Tab[]).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${tab === id ? "bg-accent text-[#04130a]" : "text-muted hover:text-foreground"}`}
          >
            {labels[id]}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          {tab === "pending"
            ? "Nothing waiting for review."
            : tab === "approved"
              ? "No approved reviews yet."
              : tab === "rejected"
                ? "No rejected reviews."
                : "No reviews yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((r) => <ReviewCard key={r.id} row={r} />)}
        </div>
      )}
    </div>
  );
}
