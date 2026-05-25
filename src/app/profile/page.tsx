import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { dbToAppProfile } from "@/lib/profileMap";
import ProfileView from "@/components/ProfileView";
import PendingBanner from "@/components/PendingBanner";
import { DocKind } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your profile",
  description: "How customers see your FlowSync profile.",
  robots: { index: false },
};

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const db = await prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    include: { documents: true },
  });
  if (!db) redirect("/signin");

  const kinds = new Set(db.documents.map((d) => d.kind));
  const hasDocs = kinds.has(DocKind.LICENSE) && kinds.has(DocKind.INSURANCE);

  return (
    <>
      {!db.verified && <PendingBanner hasDocs={hasDocs} />}
      <ProfileView
      profile={dbToAppProfile(db)}
      headerActions={
        <>
          <Link href="/dashboard" className="btn-primary rounded-full px-6 py-2.5 text-sm">Dashboard</Link>
          <Link href="/account" className="btn-ghost rounded-full px-5 py-2.5 text-sm">Edit</Link>
        </>
      }
      sidebarCta={
        <section className="card p-6 text-center">
          <p className="text-sm font-semibold">This is your public profile</p>
          <p className="mt-1 text-xs text-muted">It&apos;s how customers see you in the directory.</p>
          <Link href="/account" className="btn-ghost mt-3 inline-flex rounded-full px-6 py-2.5 text-sm">Edit profile</Link>
        </section>
      }
      />
    </>
  );
}
