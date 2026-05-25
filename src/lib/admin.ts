import { prisma } from "./db";
import { getSession } from "./session";

/** Comma-separated allowlist of admin emails, e.g. ADMIN_EMAILS="me@x.com,you@y.com". */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/** Returns the signed-in admin's user id, or null if not an admin. */
export async function getAdminUserId(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  return isAdminEmail(user?.email) ? session.userId : null;
}

export async function requireAdmin(): Promise<string> {
  const id = await getAdminUserId();
  if (!id) throw new Error("Not authorized.");
  return id;
}
