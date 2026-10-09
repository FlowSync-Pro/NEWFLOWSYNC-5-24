"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { answerMyOffer } from "@/app/actions/duty";

/**
 * Accept / Pass for one open offer on the fleet page (stage 2c). Accept asks
 * first — a web click is easier to make by accident than a Telegram tap, and
 * an accepted load gets claimed in Curri right away. The result shows as a
 * notice at the top of "Your offers and loads" (?answer=<code>) so it survives
 * the list refreshing; reasons specific to this driver (busy, wrong vehicle)
 * show here and the offer stays open.
 */
export default function OfferAnswerButtons({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function answer(action: "accept" | "pass") {
    if (action === "accept" && !window.confirm("Accept this load? We claim it for you in Curri right away — only accept loads you'll run.")) return;
    setError(null);
    start(async () => {
      const r = await answerMyOffer(offerId, action);
      if (r.code) {
        router.replace(`/account/curri-fleet?answer=${r.code}#your-offers`, { scroll: false });
        router.refresh();
      } else {
        setError(r.message || "Couldn't record that — tap Refresh and try again.");
      }
    });
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => answer("accept")} disabled={pending} className="btn-primary rounded-full px-6 py-2 text-sm disabled:opacity-60">
          {pending ? "Sending…" : "✅ Accept"}
        </button>
        <button type="button" onClick={() => answer("pass")} disabled={pending} className="rounded-full border border-border px-6 py-2 text-sm text-muted hover:text-foreground disabled:opacity-60">
          Pass
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-amber-300">{error}</p>}
    </div>
  );
}
