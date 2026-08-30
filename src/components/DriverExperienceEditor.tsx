"use client";

import { useState, useTransition } from "react";
import { addMyCredential, deleteMyCredential, setTripPhotoPublic } from "@/app/actions/credentials";
import { LICENSE_KINDS, LICENSE_LABELS, licenseLabel, isExpired } from "@/lib/experience";
import { fileToScaledDataUrl } from "@/lib/image";

export interface MyCredential {
  id: string;
  kind: string;
  customLabel: string | null;
  blobUrl: string;
  status: string;
  expiresAt: string | null;
}

export interface MyTripPhotos {
  tripId: string;
  date: string;
  route: string;
  photos: string[];
  publicPhotos: string[];
}

const inputCls =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent";

function StatusPill({ status, expired }: { status: string; expired: boolean }) {
  if (expired) return <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] font-medium text-red-300">Expired</span>;
  if (status === "VERIFIED") return <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-[#04130a]">Verified</span>;
  if (status === "REJECTED") return <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] font-medium text-red-300">Not accepted</span>;
  return <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-medium text-amber-300">Pending review</span>;
}

export default function DriverExperienceEditor({
  credentials,
  trips,
}: {
  credentials: MyCredential[];
  trips: MyTripPhotos[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState("TWIC");
  const [customLabel, setCustomLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const photoTrips = trips.filter((t) => t.photos.length > 0);
  const publicCount = trips.reduce((n, t) => n + t.publicPhotos.length, 0);

  const pickFile = async (file?: File) => {
    if (!file) return;
    const url = await fileToScaledDataUrl(file);
    if (!url) {
      setError("Couldn't read that image. Try a JPG or PNG.");
      return;
    }
    setError(null);
    setDataUrl(url);
  };

  const submit = () => {
    setError(null);
    if (!dataUrl) {
      setError("Add a photo of the credential.");
      return;
    }
    start(async () => {
      const res = await addMyCredential({ kind, customLabel, dataUrl, expiresAt: expiresAt || undefined });
      if (!res.ok) {
        setError(res.error ?? "Couldn't save that.");
        return;
      }
      setKind("TWIC");
      setCustomLabel("");
      setExpiresAt("");
      setDataUrl(null);
      setShowForm(false);
    });
  };

  return (
    <div className="space-y-10">
      {/* Credentials */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Your credentials</h2>
            <p className="mt-1 text-sm text-muted">
              Add certifications you hold — TWIC, Hazmat, CDL and more. Upload a photo as proof;
              we check each one before it appears on your public profile.
            </p>
          </div>
          <button type="button" onClick={() => setShowForm((s) => !s)} className="btn-primary shrink-0 rounded-full px-5 py-2 text-sm">
            {showForm ? "Cancel" : "+ Add credential"}
          </button>
        </div>

        {showForm && (
          <div className="card mt-4 space-y-3 p-5">
            <label className="block">
              <span className="text-xs text-muted">Credential</span>
              <select value={kind} onChange={(e) => setKind(e.target.value)} className={`mt-1 ${inputCls}`}>
                {LICENSE_KINDS.map((k) => (
                  <option key={k} value={k}>{LICENSE_LABELS[k]}</option>
                ))}
              </select>
            </label>

            {kind === "OTHER" && (
              <label className="block">
                <span className="text-xs text-muted">What is it called?</span>
                <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="e.g. Food Handler Card" className={`mt-1 ${inputCls}`} />
              </label>
            )}

            <label className="block">
              <span className="text-xs text-muted">Expiry date (optional)</span>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={`mt-1 ${inputCls}`} />
              <span className="mt-1 block text-[11px] text-muted">We hide expired credentials automatically so customers never see out-of-date info.</span>
            </label>

            <div>
              <span className="text-xs text-muted">Photo of the credential</span>
              <input type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0])} className="mt-1 block w-full text-xs text-muted" />
              {dataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dataUrl} alt="Credential" className="mt-2 h-24 w-36 rounded-lg border border-border object-cover" />
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="button" onClick={submit} disabled={pending} className="btn-primary w-full rounded-full px-6 py-2.5 text-sm disabled:opacity-60">
              {pending ? "Uploading…" : "Submit for review"}
            </button>
          </div>
        )}

        {credentials.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No credentials added yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {credentials.map((c) => {
              const expired = isExpired({ kind: c.kind, status: c.status, expiresAt: c.expiresAt });
              return (
                <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.blobUrl} alt={licenseLabel(c.kind, c.customLabel)} className="h-12 w-16 rounded-lg border border-border object-cover" />
                    <div>
                      <p className="text-sm font-medium">{licenseLabel(c.kind, c.customLabel)}</p>
                      <p className="text-xs text-muted">
                        {c.expiresAt ? `Expires ${new Date(c.expiresAt).toLocaleDateString()}` : "No expiry date"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill status={c.status} expired={expired} />
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => start(async () => { await deleteMyCredential(c.id); })}
                      className="text-[11px] text-muted hover:text-red-400 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Work photos */}
      <section>
        <h2 className="text-lg font-semibold">Your work photos</h2>
        <p className="mt-1 text-sm text-muted">
          Photos from your logged trips are <span className="text-foreground">private by default</span>. Tick any you want
          shown on your public profile as proof of your work.
        </p>
        <p className="mt-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-3 text-xs text-amber-200">
          Before sharing, check the photo doesn&apos;t show a customer&apos;s house number, a license plate, or anything
          they wouldn&apos;t want public.
        </p>
        <p className="mt-3 text-xs text-muted">{publicCount} photo{publicCount === 1 ? "" : "s"} currently public.</p>

        {photoTrips.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No trip photos yet. Add photos when you log a trip in Operations and they&apos;ll show up here.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {photoTrips.map((t) => (
              <div key={t.tripId} className="card p-5">
                <p className="text-sm font-medium">{t.route}</p>
                <p className="text-xs text-muted">{new Date(t.date).toLocaleDateString()}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {t.photos.map((p, i) => {
                    const isPublic = t.publicPhotos.includes(p);
                    return (
                      <div key={i} className="w-28">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p}
                          alt="Delivery"
                          className={`h-24 w-28 rounded-lg border-2 object-cover transition-colors ${isPublic ? "border-accent" : "border-border"}`}
                        />
                        <label className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                          <input
                            type="checkbox"
                            checked={isPublic}
                            disabled={pending}
                            onChange={(e) => start(async () => { await setTripPhotoPublic(t.tripId, p, e.target.checked); })}
                            className="h-3.5 w-3.5 accent-[#25e07a]"
                          />
                          <span className={isPublic ? "text-accent" : "text-muted"}>{isPublic ? "Public" : "Private"}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
