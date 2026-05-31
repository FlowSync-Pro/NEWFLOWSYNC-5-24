import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of service — FlowSync",
  description: "The terms that govern your use of FlowSync.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="May 2026">
      <p>
        Welcome to FlowSync. By creating an account or using flowsyncdriver.com, you agree to these
        terms. Please read them carefully.
      </p>

      <h2>What FlowSync is</h2>
      <p>
        FlowSync is a platform that lets independent drivers list their delivery and errand services
        and connect directly with customers. Drivers are independent contractors running their own
        businesses — FlowSync is not the employer of any driver and does not direct how, when, or
        where drivers work.
      </p>

      <h2>Driver listings</h2>
      <p>
        A one-time listing fee gets you listed in the directory. You&apos;re responsible for the
        accuracy of your profile, for holding any licenses and insurance your services require, and for
        the quality and legality of the work you perform. We may remove listings that are fraudulent,
        unsafe, or violate these terms.
      </p>

      <h2>Payments &amp; fees</h2>
      <p>
        Listing fees are processed securely by Stripe. When a customer pays for a job through FlowSync,
        a small platform fee is deducted and the remainder goes to the driver. Listing fees are covered
        by our <a href="/refund-policy">30-day money-back guarantee</a>.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t misuse the platform — no fraud, harassment, fake reviews, scraping, or attempts to
        interfere with the service. Customers and drivers are expected to communicate honestly and
        treat each other with respect.
      </p>

      <h2>Disclaimers</h2>
      <p>
        FlowSync is provided &ldquo;as is.&rdquo; We work hard to connect drivers and customers, but we
        don&apos;t guarantee a specific number of jobs, earnings, or outcomes. Transactions and work
        arranged between drivers and customers are between those parties.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
