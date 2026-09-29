import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund policy — FlowSync",
  description: "FlowSync's 30-day money-back guarantee on driver listings and how to request a refund.",
  alternates: { canonical: `${SITE_URL}/refund-policy` },
};

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund policy" updated="October 2026">
      <p>
        We want every driver to feel good about getting listed on FlowSync. That&apos;s why every
        driver listing comes with a <strong>30-day money-back guarantee</strong>.
      </p>

      <h2>The 30-day guarantee</h2>
      <p>
        If you&apos;re not satisfied with your FlowSync listing for any reason within 30 days of your
        purchase, email us and we&apos;ll issue a full refund of your listing fee — no questions asked.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the address on your account
        within 30 days of your purchase and let us know you&apos;d like a refund. Refunds are returned
        to your original payment method, typically within 5–10 business days depending on your bank.
      </p>

      <h2>What&apos;s covered</h2>
      <p>
        The one-time driver listing fee (Verified) and the Premium upgrade are covered by this
        guarantee. Optional add-ons and any third-party fees are also refundable within the same
        30-day window.
      </p>

      <h2>The Curri fleet joining fee</h2>
      <p>
        The fleet joining fee is different, because it pays for activation work that can&apos;t be
        undone. It is <strong>fully refundable until you are activated on our carrier account</strong>:
        if you change your mind before we activate you, email us and we refund it in full. Once you
        are activated — added to the carrier account, vehicle and paperwork set up, and able to
        receive loads — the fee has been earned and is <strong>non-refundable</strong>.
      </p>
      <p>
        Fleet drivers run under one shared carrier account, so one driver&apos;s violations put
        every driver on the account at risk. A second violation on the carrier account results in
        removal from the fleet without a refund. You agree to these terms on the checkout page
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
