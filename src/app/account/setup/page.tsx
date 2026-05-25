import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import SetupForm from "@/components/SetupForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Set up your profile",
  robots: { index: false },
};

export default async function AccountSetupPage() {
  const session = await getSession();
  if (!session) redirect("/signin");
  if (session.mustResetPassword) redirect("/reset-password");

  const profile = await prisma.driverProfile.findUnique({ where: { userId: session.userId } });
  if (profile) redirect("/account");

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });
  const [first = "", ...rest] = (user?.name ?? "").split(" ");

  return (
    <div className="relative min-h-[70vh]">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative mx-auto flex max-w-md flex-col px-5 py-20">
        <h1 className="text-center text-3xl font-bold tracking-tight">Finish setting up</h1>
        <p className="mt-2 text-center text-muted">Tell us your name and main service to create your profile.</p>
        <div className="card mt-8 p-7">
          <SetupForm defaultFirst={first} defaultLast={rest.join(" ")} />
        </div>
      </div>
    </div>
  );
}
