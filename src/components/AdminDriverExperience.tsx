"use client";

import { useState, useTransition } from "react";
import {
  addVerifiedLoad,
  updateVerifiedLoad,
  deleteVerifiedLoad,
  setLicenseStatus,
  deleteLicense,
} from "@/app/actions/experience";
import {
  licenseLabel,
  averageRating,
  ratedCount,
  formatRating,
  isExpired,
  MIN_RATINGS_FOR_PUBLIC,
} from "@/lib/experience";
import { fileToScaledDataUrl } from "@/lib/image";

export interface LoadRow {
  id: string;
  date: string;
  pickupCity: string;
  dropoffCity: string;
  loadType: string | null;
  rating: number | null;
  publicNote: string | null;
  adminNote: string | null;
  photos: string[];
  photosPublic: boolean;
}

export interface LicenseRow {
  id: string;
  kind: string;
  customLabel: string | null;
  blobUrl: string;
  status: string;
  expiresAt: string | null;
}

const inputCls =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent";

/** Clickable 1–5 stars. Clicking the current value clears the rating. */
function StarPicker({ value, onChange, disabled }: { value: number | null; onChange: (v: number | null) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value === n ? null : n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          className={`text-lg leading-none transition-colors disabled:opacity-50 ${
            value !== null && n <= value ? "text-amber-300" : "text-muted/40 hover:text-amber-300/60"
          }`}
        >
          ★
        </button>
      ))}
      {value === null && <span className="ml-1 text-xs text-muted">not rated</span>}
    </div>
  );
}

export default function AdminDriverExperience({
  driverProfileId,
  loads,
  licenses,
  loggedTripCount,
}: {
  driverProfileId: string;
  loads: LoadRow[];
  licenses: LicenseRow[];
  loggedTripCount: number;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    pickupCity: "",
    dropoffCity: "",
    loadType: "",
    rating: null as number | null,
    publicNote: "",
    adminNote: "",
    photosPublic: false,
  });

  const avg = averageRating(loads);
  const rated = ratedCount(loads);

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, 6 - photos.length)) {
      // Returns null if the file can't be decoded (e.g. an unsupported format) —
      // skip those rather than pushing an empty image into the load record.
      const url = await fileToScaledDataUrl(file);
      if (url) urls.push(url);
    }
    if (urls.length === 0) {
      setError("Couldn't read that image. Try a JPG or PNG.");
      return;
    }
    setError(null);
    setPhotos((p) => [...p, ...urls].slice(0, 6));
  };

  const submit = () => {
    setError(null);
    start(async () => {
      const res = await addVerifiedLoad({ driverProfileId, ...form, photos });
      if (!res.ok) {
        setError(res.error ?? "Couldn't save that load.");
        return;
      }
      setForm({
        date: new Date().toISOString().slice(0, 10),
        pickupCity: "",
        dropoffCity: "",
        loadType: "",
        rating: null,
        publicNote: "",
        adminNote: "",
        photosPublic: false,
      });
      setPhotos([]);
      setShowForm(false);
    });
  };

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xl font-bold text-accent">{loads.length}</p>
          <p className="mt-0.5 text-xs text-muted">Verified loads</p>
        </div>
        <div className="card p-4">
          <p className="text-xl font-bold">{loggedTripCount}</p>
          <p className="mt-0.5 text-xs text-muted">Trips logged by driver</p>
        </div>
        <div className="card p-4">
          <p className="text-xl font-bold text-amber-300">{avg === null ? "—" : `★ ${formatRating(avg)}`}</p>
          <p className="mt-0.5 text-xs text-muted">{rated} rated</p>
        </div>
        <div className="card p-4">
          <p className={`text-xl font-bold ${rated >= MIN_RATINGS_FOR_PUBLIC ? "text-accent" : "text-muted"}`}>
            {rated >= MIN_RATINGS_FOR_PUBLIC ? "Public" : "Hidden"}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {rated >= MIN_RATINGS_FOR_PUBLIC ? "Rating is live" : `Needs ${MIN_RATINGS_FOR_PUBLIC - rated} more`}
          </p>
        </div>
      </div>

      {/* Add a load */}
      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-base font-semibold">Verified loads</h3>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="btn-primary rounded-full px-5 py-2 text-sm"
        >
          {showForm ? "Cancel" : "+ Add completed load"}
        </button>
      </div>

      {showForm && (
        <div className="card mt-3 space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs text-muted">Date</span>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block">
              <span className="text-xs text-muted">Pickup city</span>
              <input value={form.pickupCity} onChange={(e) => setForm({ ...form, pickupCity: e.target.value })} placeholder="Las Vegas, NV" className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block">
              <span className="text-xs text-muted">Dropoff city</span>
              <input value={form.dropoffCity} onChange={(e) => setForm({ ...form, dropoffCity: e.target.value })} placeholder="Henderson, NV" className={`mt-1 ${inputCls}`} />
            </label>
          </div>
          <p className="text-xs text-muted">City only — full addresses are never shown publicly.</p>

          <label className="block">
            <span className="text-xs text-muted">What was the load?</span>
            <input value={form.loadType} onChange={(e) => setForm({ ...form, loadType: e.target.value })} placeholder="2 pallets of tile — box truck" className={`mt-1 ${inputCls}`} />
          </label>

          <div>
            <span className="text-xs text-muted">Rating</span>
            <div className="mt-1"><StarPicker value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} /></div>
          </div>

          <label className="block">
            <span className="text-xs text-muted">Public note (shown on their profile)</span>
            <input value={form.publicNote} onChange={(e) => setForm({ ...form, publicNote: e.target.value })} placeholder="On time, freight secured properly." className={`mt-1 ${inputCls}`} />
          </label>

          <label className="block">
            <span className="text-xs text-muted">Private note (only you see this)</span>
            <input value={form.adminNote} onChange={(e) => setForm({ ...form, adminNote: e.target.value })} className={`mt-1 ${inputCls}`} />
          </label>

          <div>
            <span className="text-xs text-muted">Photos (up to 6)</span>
            <input type="file" accept="image/*" multiple onChange={(e) => addPhotos(e.target.files)} className="mt-1 block w-full text-xs text-muted" />
            {photos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={p} alt="Load" className="h-16 w-16 rounded-lg border border-border object-cover" />
                ))}
              </div>
            )}
            <label className="mt-2 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={form.photosPublic} onChange={(e) => setForm({ ...form, photosPublic: e.target.checked })} className="h-4 w-4 accent-[#25e07a]" />
              <span className="text-muted">Show these photos on the driver&apos;s public profile</span>
            </label>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="button" onClick={submit} disabled={pending} className="btn-primary w-full rounded-full px-6 py-2.5 text-sm disabled:opacity-60">
            {pending ? "Saving…" : "Save load"}
          </button>
        </div>
      )}

      {/* Existing loads */}
      {loads.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No verified loads recorded yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {loads.map((l) => (
            <div key={l.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{l.pickupCity} → {l.dropoffCity}</p>
                  <p className="text-xs text-muted">
                    {new Date(l.date).toLocaleDateString()}
                    {l.loadType ? ` · ${l.loadType}` : ""}
                  </p>
                  {l.publicNote && <p className="mt-1 text-xs text-muted">“{l.publicNote}”</p>}
                  {l.adminNote && <p className="mt-1 text-xs text-amber-300/80">Private: {l.adminNote}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StarPicker
                    value={l.rating}
                    disabled={pending}
                    onChange={(v) => start(async () => { await updateVerifiedLoad(l.id, { rating: v }); })}
                  />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-[11px] text-muted">
                      <input
                        type="checkbox"
                        checked={l.photosPublic}
                        disabled={pending || l.photos.length === 0}
                        onChange={(e) => start(async () => { await updateVerifiedLoad(l.id, { photosPublic: e.target.checked }); })}
                        className="h-3.5 w-3.5 accent-[#25e07a]"
                      />
                      Photos public
                    </label>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => start(async () => { await deleteVerifiedLoad(l.id); })}
                      className="text-[11px] text-muted hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              {l.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {l.photos.map((p, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={i} href={p} target="_blank" rel="noreferrer"><img src={p} alt="Load" className="h-16 w-16 rounded-lg border border-border object-cover" /></a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Credentials */}
      <h3 className="mt-8 text-base font-semibold">Credentials</h3>
      {licenses.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No credentials uploaded.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {licenses.map((c) => {
            const expired = isExpired({ kind: c.kind, status: c.status, expiresAt: c.expiresAt });
            return (
              <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <a href={c.blobUrl} target="_blank" rel="noreferrer">
                    <img src={c.blobUrl} alt={licenseLabel(c.kind, c.customLabel)} className="h-14 w-20 rounded-lg border border-border object-cover" />
                  </a>
                  <div>
                    <p className="text-sm font-medium">{licenseLabel(c.kind, c.customLabel)}</p>
                    <p className="text-xs text-muted">
                      {c.expiresAt ? `Expires ${new Date(c.expiresAt).toLocaleDateString()}` : "No expiry recorded"}
                      {expired && <span className="ml-1 font-semibold text-red-400">· EXPIRED</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      c.status === "VERIFIED" ? "bg-accent text-[#04130a]"
                      : c.status === "REJECTED" ? "bg-red-500/20 text-red-300"
                      : "bg-surface-2 text-muted"
                    }`}
                  >
                    {c.status}
                  </span>
                  {c.status !== "VERIFIED" && (
                    <button type="button" disabled={pending} onClick={() => start(async () => { await setLicenseStatus(c.id, "VERIFIED"); })} className="btn-primary rounded-full px-4 py-1.5 text-xs disabled:opacity-60">Verify</button>
                  )}
                  {c.status !== "REJECTED" && (
                    <button type="button" disabled={pending} onClick={() => start(async () => { await setLicenseStatus(c.id, "REJECTED"); })} className="rounded-full border border-border px-4 py-1.5 text-xs text-muted hover:text-red-400 disabled:opacity-60">Reject</button>
                  )}
                  <button type="button" disabled={pending} onClick={() => start(async () => { await deleteLicense(c.id); })} className="text-[11px] text-muted hover:text-red-400">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
