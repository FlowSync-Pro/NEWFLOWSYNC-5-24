import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";
import { FLEET, PRIOR_REFUND_WINDOW_DAYS, REFUND_WINDOW_CHANGED_LABEL, REFUND_WINDOW_DAYS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Refund policy — FlowSync",
  description: "How refunds work for FlowSync driver listings, Premium and the Curri fleet, and how to request one.",
  alternates: { canonical: `${SITE_URL}/refund-policy` },
};

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund policy" updated="October 2026">
      <p>
        Everything you get with a FlowSync listing or Premium is described on the page before you pay,
        and you get access the moment your payment goes through. Please read it before you buy.
      </p>

      <h2>Verified listing and Premium: {REFUND_WINDOW_DAYS} days</h2>
      <p>
        If you change your mind, you can get a <strong>full refund if you ask within {REFUND_WINDOW_DAYS} days
        of your purchase</strong>. After {REFUND_WINDOW_DAYS} days the fee is non-refundable. This covers the
        one-time Verified listing fee and the Premium upgrade. You agree to these terms on the checkout page
        before paying.
      </p>
      <p>
        Bought before {REFUND_WINDOW_CHANGED_LABEL}? You keep the {PRIOR_REFUND_WINDOW_DAYS}-day window you
        agreed to at checkout.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the address on your account within
        the window and let us know you&apos;d like a refund. Refunds go back to your original payment method,
        typically within 5–10 business days depending on your bank.
      </p>
      <p>
        Have a problem with your account or a charge? Email us first — we answer every message and can
        usually sort it out the same day.
      </p>

      <h2>The Curri fleet joining fee</h2>
      <p>
        The fleet joining fee has its own guarantee: <strong>make your joining fee back in your first{" "}
        {FLEET.guaranteeDays} days on the fleet, or we refund it in full — no questions asked.</strong>
      </p>
      <ul>
        <li>
          <strong>Before you&apos;re activated</strong> — added to our carrier account, vehicle and
          paperwork set up, and able to receive loads — the fee is fully refundable anytime. Email us
          (or text Nasser) and we refund it in full.
        </li>
        <li>
          <strong>After activation</strong>, if your take-home from fleet loads you run in your first{" "}
          {FLEET.guaranteeDays} days after activation (what we pay you after the dispatching fee, from
          our own payout records) adds up to less than the joining fee you paid, email us (or text
          Nasser) within {FLEET.guaranteeClaimDays} days after those {FLEET.guaranteeDays} days end and we
          refund that fee in full. Nothing to prove, no questions asked. A refund ends your fleet
          membership.
        </li>
        <li>
          Once you&apos;ve made it back, or the window to ask has passed, the fee has been earned.
        </li>
      </ul>
      <p>
        Fleet drivers run under one shared carrier account, so one driver&apos;s violations put
        every driver on the account at risk. A second violation on the carrier account results in
        removal from the fleet without a refund, guarantee included. You agree to these terms on the checkout page
        before paying.
      </p>

      <h2>Questions</h2>
      <p>
        Reach us anytime at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> — a real person
        reads every message.
      </p>
    </LegalPage>
  );
}
