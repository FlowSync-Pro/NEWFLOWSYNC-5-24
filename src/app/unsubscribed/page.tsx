import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Unsubscribed", robots: { index: false } };

export default async function UnsubscribedPage({ searchParams }: PageProps<"/unsubscribed">) {
  const ok = (await searchParams).status === "ok";
  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <h1 className="text-3xl font-bold tracking-tight">{ok ? "You're unsubscribed" : "That link didn't work"}</h1>
      <p className="mt-3 text-muted">
        {ok
          ? "You won't get FlowSync tips and offers anymore. You'll still get emails about your account, payments and bookings."
          : `The unsubscribe link looks incomplete. Email ${SUPPORT_EMAIL} and we'll take you off the list by hand.`}
      </p>
      <Link href="/" className="btn-ghost mt-8 inline-flex rounded-full px-6 py-2.5 text-sm">Back to FlowSync</Link>
    </div>
  );
}
