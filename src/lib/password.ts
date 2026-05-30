import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Self-contained password hashing using Node's scrypt — no external dependency.
// Format stored in User.hashedPassword: "<saltHex>:<hashHex>".
// Drop-in swap target: bcryptjs/argon2 once the dependency tree allows it.

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const testBuf = scryptSync(password, salt, 64);
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf);
}

/** A temporary password emailed after checkout. 12 bytes (~96 bits) of entropy
 * so it resists brute-forcing even if the email is later exposed; rotated on
 * first login via mustResetPassword. */
export function generateTempPassword(): string {
  return randomBytes(12).toString("base64url");
}
