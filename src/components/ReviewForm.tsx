"use client";

import { useActionState, useState } from "react";
import { submitReview, type ReviewState } from "@/app/actions/reviews";

const inputCls =
  "w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition-colors focus:border-accent";

export interface ReviewFormProps {
  initialRating?: number;
  initialText?: string;
  /** Status of the existing review, if any — informs the on-screen messaging. */
  initialStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
}

export default function ReviewForm({ initialRating, initialText, initialStatus }: ReviewFormProps) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, {});
  const [rating, setRating] = useState<number>(initialRating ?? 0);
  const [text, setText] = useState<string>(initialText ?? "");

  const showThanks = state.ok;
  const hadPrior = !!initialRating;

  return (
    <form action={action} className="space-y-5">
      {/* Stars */}
      <div>
        <p className="text-sm font-medium">How was your signup experience?</p>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                n <= rating
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-muted hover:border-accent/50 hover:text-foreground"
              }`}
            >
              <svg viewBox="0 0 24 24" fill={n <= rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                <path d="M12 2l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 15.4 6.8 18.1l1-5.8L3.5 8.2l5.9-.9z" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
        <input type="hidden" name="rating" value={rating} />
      </div>

      {/* Text */}
      <div>
        <label htmlFor="review-text" className="text-sm font-medium">Your review</label>
        <textarea
          id="review-text"
          name="text"
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What was it like signing up? Anything that surprised you (good or bad)? Other drivers thinking about joining want to hear it."
          className={inputCls}
          maxLength={600}
        />
        <p className="mt-1 text-xs text-muted">{text.length}/600 · at least 30 characters</p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted">
        <input id="consent" type="checkbox" required defaultChecked className="mt-0.5" />
        <label htmlFor="consent">
          I&apos;m okay with FlowSync showing this review publicly (with my first name + last initial and city only).
        </label>
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      {showThanks ? (
        <div className="rounded-xl border border-accent/40 bg-accent-soft p-4 text-sm text-accent">
          <p className="font-semibold">Thanks — got it.</p>
          <p className="mt-1 text-muted">
            Your review is pending admin approval. It&apos;ll appear on the public reviews page within a day or two. You can update it anytime.
          </p>
        </div>
      ) : (
        <>
          {hadPrior && initialStatus === "APPROVED" && (
            <p className="text-xs text-muted">
              Heads up: editing a previously approved review will reset it to pending until admin re-approves.
            </p>
          )}
          {hadPrior && initialStatus === "PENDING" && (
            <p className="text-xs text-muted">Your previous review is waiting for admin approval.</p>
          )}
          {hadPrior && initialStatus === "REJECTED" && (
            <p className="text-xs text-muted">
              Your previous review was not approved. You can edit and resubmit.
            </p>
          )}
          <button
            type="submit"
            disabled={pending || rating === 0 || text.trim().length < 30}
            className="btn-primary w-full rounded-full px-6 py-3 text-sm disabled:opacity-50"
          >
            {pending ? "Submitting…" : hadPrior ? "Update my review" : "Submit review"}
          </button>
        </>
      )}
    </form>
  );
}
