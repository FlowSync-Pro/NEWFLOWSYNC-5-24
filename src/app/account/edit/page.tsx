import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";
import { dbToAppProfile } from "@/lib/profileMap";
import AccountEditor from "@/components/AccountEditor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit your profile",
  description: "Update your driver profile, upload your documents, and get verified.",
  robots: { index: false },
};

// The full profile editor lives here so the main /account page can stay focused
// on the start-here block + Roadmap. Old behaviour was: /account WAS the editor.
export default async function AccountEditPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const db = await prisma.driverProfile.findUnique({
    where: { userId: session.userId },
    include: { documents: true },
  });
  if (!db) redirect("/account/setup");

  const isAdmin = !!(await getAdminUserId());

  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative">
        <AccountEditor initial={dbToAppProfile(db)} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
