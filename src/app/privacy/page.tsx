import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy — FlowSync",
  description: "How FlowSync collects, uses, and protects your information.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="May 2026">
      <p>
        FlowSync (&ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your privacy. This policy explains what
        we collect, why, and the choices you have. It applies to flowsyncdriver.com and the FlowSync
        driver platform.
      </p>

      <h2>Information we collect</h2>
      <p>
        <strong>Account &amp; profile:</strong> your name, email, phone, city, vehicle details, service
        type, and any documents or photos you upload (such as a profile photo, license, or insurance).
      </p>
      <p>
        <strong>Payments:</strong> when you pay for a listing, payment is processed by Stripe. We do
        not store your full card number — Stripe handles card data under its own security standards.
      </p>
      <p>
        <strong>Usage:</strong> basic analytics about how the site is used, to improve the product.
      </p>
      <p>
        <strong>Where you came from:</strong> on your first visit we store a small cookie for 30 days noting the
        site or ad that sent you here (for example the referring website and any campaign tags on the link) and the
        page you landed on. It contains no personal details. If you make a purchase, that information is kept with
        your payment record so we know which of our ads and emails work.
      </p>

      <h2>How we use it</h2>
      <p>
        To create and display your driver listing, connect you with customers, process payments,
        verify drivers, provide support, and send service-related emails (such as your login details,
        receipts, and account updates).
      </p>
      <p>
        If you have a FlowSync account, we may also email you occasional setup tips and offers related to
        it. Every one of those emails has an unsubscribe link, and unsubscribing never stops emails about
        your account, payments, or bookings.
      </p>
      <p>
        If you enter your email in one of our free tools, we save it with the choice you made so we can
        send what you asked for and occasional tips for drivers. Every email has an unsubscribe link, and
        we never sell your email.
      </p>

      <h2>Sharing</h2>
      <p>
        Your public profile (name, service, city, photo, and details you choose to show) is visible to
        customers looking to book a driver. We share data with service providers who help us operate —
        such as Stripe (payments), our email provider, and hosting — and never sell your personal
        information.
      </p>

      <h2>Your choices</h2>
      <p>
        You can update your profile anytime from your account, or email us to access, correct, or
        delete your data. Deleting your account removes your listing and associated profile data.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
