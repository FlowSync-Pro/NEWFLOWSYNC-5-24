"use server";

import { randomBytes, createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getSession } from "@/lib/session";
import { generateTempPassword, hashPassword, verifyPassword } from "@/lib/password";
import { serviceToEnum } from "@/lib/enums";
import { sendWelcomeEmail, sendPasswordResetEmail } from "@/lib/email";
import { getStripe } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";
import type { ServiceId } from "@/lib/services";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export interface RegisterInput {
  email: string;
  firstName: string;
  lastName: string;
  primaryService: ServiceId;
  city?: string;
  password?: string; // if omitted, a temp password is generated and returned
}

/**
 * Create a driver account + empty profile. Used by the Stripe webhook after a
 * successful $17 checkout (and usable from the signup flow). Returns the temp
 * password to email when no password was supplied.
 */
export async function registerDriver(input: RegisterInput): Promise<{ userId: string; tempPassword?: string }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new Error("An account with that email already exists.");

  const tempPassword = input.password ? undefined : generateTempPassword();
  const password = input.password ?? tempPassword!;

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: `${input.firstName} ${input.lastName}`.trim(),
      role: "DRIVER",
      hashedPassword: hashPassword(password),
      mustResetPassword: !input.password,
      driverProfile: {
        create: {
          firstName: input.firstName,
          lastName: input.lastName,
          city: input.city,
          primaryService: serviceToEnum(input.primaryService),
        },
      },
    },
  });

  return { userId: user.id, tempPassword };
}

export interface AuthState {
  error?: string;
}

const SERVICE_IDS: ServiceId[] = [
  "grocery", "food", "furniture", "courier", "pharmacy", "senior", "moving", "auto-parts",
];

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const primaryService = String(formData.get("primaryService") ?? "") as ServiceId;

  if (!email || !firstName || !lastName) return { error: "Fill in your name and email." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  if (!SERVICE_IDS.includes(primaryService)) return { error: "Choose your main service." };

  let userId: string;
  try {
    ({ userId } = await registerDriver({ email, firstName, lastName, primaryService, password }));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create your account." };
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
  await sendWelcomeEmail({ to: email, firstName, profileUrl: `${base}/account` });

  await createSession({ userId, role: "DRIVER", mustResetPassword: false });
  redirect("/account?registered=1");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.hashedPassword || !verifyPassword(password, user.hashedPassword)) {
    return { error: "Incorrect email or password." };
  }

  await createSession({ userId: user.id, role: user.role, mustResetPassword: user.mustResetPassword });
  redirect(user.mustResetPassword ? "/reset-password" : "/account");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function setPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const session = await getSession();
  if (!session) redirect("/signin");

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Passwords don't match." };

  await prisma.user.update({
    where: { id: session.userId },
    data: { hashedPassword: hashPassword(password), mustResetPassword: false },
  });
  await createSession({ ...session, mustResetPassword: false });
  redirect("/account");
}

export interface ActivateState {
  error?: string;
}

/** How long after checkout the on-screen activation stays usable. */
const ACTIVATION_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Post-checkout activation. Lets a driver who just paid set their own password
 * on the success screen instead of depending on the welcome email arriving —
 * previously a missing/spam-filtered email locked a paying customer out of the
 * account they'd just bought, with no other way in.
 *
 * Access is gated on proof of payment, and is deliberately narrow:
 *   1. the Stripe Checkout Session must exist and be `paid`;
 *   2. it must be less than 24h old (a stale/shared URL stops working);
 *   3. the account must still be un-activated (`mustResetPassword`), so this is
 *      single-use — once a password is set, this path closes permanently.
 * The session id is high-entropy and only ever appears in the buyer's own
 * browser, so it functions like an emailed activation link without the email.
 */
export async function activateAfterCheckout(_prev: ActivateState, formData: FormData): Promise<ActivateState> {
  const sessionId = String(formData.get("session_id") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!sessionId) return { error: "Missing checkout reference. Use the password from your welcome email to sign in below." };
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Passwords don't match." };

  const stripe = getStripe();
  if (!stripe) return { error: "We can't verify your payment right now. Please sign in with the password from your email." };

  let email = "";
  let createdAtMs = 0;
  try {
    const cs = await stripe.checkout.sessions.retrieve(sessionId);
    if (cs.payment_status !== "paid") {
      return { error: "We couldn't confirm that payment. Please sign in with the password from your email." };
    }
    email = (cs.customer_details?.email ?? cs.metadata?.email ?? "").trim().toLowerCase();
    createdAtMs = (cs.created ?? 0) * 1000;
  } catch {
    return { error: "We couldn't confirm that payment. Please sign in with the password from your email." };
  }

  if (!email) return { error: "We couldn't match that payment to an email. Please sign in with the password from your email." };
  if (!createdAtMs || Date.now() - createdAtMs > ACTIVATION_WINDOW_MS) {
    return { error: "This activation window has closed. Use “Forgot password?” below to set a new password." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // The Stripe webhook creates the account; on a fast redirect it may not have
  // landed yet. Tell the driver to retry rather than implying something broke.
  if (!user) return { error: "We're still setting up your account — wait a few seconds and try again." };
  if (!user.mustResetPassword) {
    return { error: "Your password is already set. Sign in with it below, or use “Forgot password?”." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword: hashPassword(password), mustResetPassword: false },
  });
  await createSession({ userId: user.id, role: user.role, mustResetPassword: false });
  redirect("/account");
}

export interface ForgotState {
  error?: string;
  sent?: boolean;
}

/** Step 1: email a reset link. Always reports success (no account enumeration). */
export async function requestPasswordReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your email." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    const raw = randomBytes(32).toString("base64url");
    await prisma.verificationToken.create({
      data: { identifier: email, token: sha256(raw), expires: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const base = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
    const resetUrl = `${base}/reset-password?token=${raw}&email=${encodeURIComponent(email)}`;
    await sendPasswordResetEmail({ to: email, firstName: user.name?.split(" ")[0] || "there", resetUrl });
  }
  return { sent: true };
}

/** Step 2: validate the token and set the new password. */
export async function resetPasswordWithToken(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Passwords don't match." };

  const vt = token ? await prisma.verificationToken.findUnique({ where: { token: sha256(token) } }) : null;
  if (!vt || vt.identifier !== email || vt.expires < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "Account not found." };

  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword: hashPassword(password), mustResetPassword: false },
  });
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await createSession({ userId: user.id, role: user.role, mustResetPassword: false });
  redirect("/account");
}
