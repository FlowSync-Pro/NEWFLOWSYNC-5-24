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
    <LegalPage title="Refund policy" updated="May 2026">
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
        The one-time driver listing fee is covered by this guarantee. Optional add-ons and any
        third-party fees are also refundable within the same 30-day window.
      </p>

      <h2>Questions</h2>
      <p>
        Reach us anytime at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> — a real person
        reads every message.
      </p>
    </LegalPage>
  );
}
