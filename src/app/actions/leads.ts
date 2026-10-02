"use server";

import { requestBreakdown } from "@/lib/leads";

export type BreakdownActionResult =
  | { ok: true; message: string; leadEventId?: string }
  | { ok: false; error: string };

/**
 * The earnings-quiz "Email me this breakdown" form. `website` is a hidden
 * honeypot field people never see: if a bot fills it in, we pretend it worked
 * and do nothing. `leadEventId` is returned only for a brand-new signup, so the
 * browser fires Meta's Lead event once per new lead (owner-approved 2026-10-02).
 */
export async function emailEarningsBreakdown(input: { email: string; vehicle: string; website?: string }): Promise<BreakdownActionResult> {
  const sent = "Sent — check your inbox (and your spam folder, just in case).";
  if (input.website) return { ok: true, message: sent };
  try {
    const r = await requestBreakdown(String(input.email ?? ""), String(input.vehicle ?? ""));
    if (!r.ok) return r;
    if (r.status === "already-sent-today") return { ok: true, message: "We already emailed this address today — check your inbox." };
    return { ok: true, message: sent, leadEventId: r.newLead ? `lead-${r.leadId}` : undefined };
  } catch (e) {
    console.error("[leads] breakdown signup failed:", e);
    return { ok: false, error: "Something went wrong. Please try again in a few minutes." };
  }
}
