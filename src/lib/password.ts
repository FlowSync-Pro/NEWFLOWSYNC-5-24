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

/** A short, human-friendly temporary password emailed after checkout. */
export function generateTempPassword(): string {
  return randomBytes(6).toString("base64url");
}
