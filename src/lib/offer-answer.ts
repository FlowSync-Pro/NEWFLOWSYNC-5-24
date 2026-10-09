// What the fleet page says after a driver answers an offer there (docs/DISPATCH-FLOW.md,
// stage 2c) — the same words as Telegram. The action returns one of these codes and the
// page shows its text, so the notice survives the page refreshing its offer list. A code
// in the URL is just one of these fixed words — never personal data.

export const ANSWER_NOTICE = {
  accepted_claim: { ok: true, text: "✅ You've got it — we're claiming it in Curri now. It's under Your loads below; it shows Confirmed once Curri confirms." },
  accepted_bid: { ok: true, text: "✅ You've got it — we're placing the bid in Curri now. It's not yours until Curri awards it, so don't head out yet." },
  passed: { ok: true, text: "Passed. No problem." },
  taken: { ok: false, text: "Taken — someone was faster." },
  expired: { ok: false, text: "This offer expired." },
  already: { ok: false, text: "You already answered that offer." },
  yours: { ok: false, text: "Already yours — it's on you." },
} as const;

export type AnswerCode = keyof typeof ANSWER_NOTICE;

export const isAnswerCode = (v: unknown): v is AnswerCode => typeof v === "string" && Object.hasOwn(ANSWER_NOTICE, v);

/**
 * The notice for an answer's result. Null when the reason is specific to this
 * driver (busy, wrong vehicle) — those are shown as-is, and the offer stays open.
 */
export function answerCode(action: "accept" | "pass", r: { ok: true } | { ok: false; error: string }, lane: string | null): AnswerCode | null {
  if (r.ok) return action === "pass" ? "passed" : lane === "BID" ? "accepted_bid" : "accepted_claim";
  if (/Already yours/i.test(r.error)) return "yours";
  if (/Taken|assigned/i.test(r.error)) return "taken";
  if (/expired/i.test(r.error)) return "expired";
  if (/Already/i.test(r.error)) return "already";
  return null;
}
