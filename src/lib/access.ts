import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminUserId } from "@/lib/admin";

/**
 * True if the current visitor is allowed to read paid resources (the /grow
 * guides). Access is granted to:
 *  - admins
 *  - any signed-in user who has at least one PAID payment (i.e. they bought a
 *    listing). The DOT & EIN guide and the rest are part of what the $17 buys.
 */
export async function hasGuideAccess(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  // Admins always have access.
  if (await getAdminUserId()) return true;

  const paid = await prisma.payment.findFirst({
    where: { userId: session.userId, status: "PAID" },
    select: { id: true },
  });
  return !!paid;
}
