/**
 * Phase B — Password Policy Enforcement
 * Rules: 8+ chars, upper, lower, digit, special char, last-5 history, 90-day expiry
 */
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// ─── Policy constants ─────────────────────────────────────────────────────────
export const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
  historyCount: 5,       // Cannot reuse last N passwords
  expiryDays: 90,        // Warn / force after N days
  maxFailedAttempts: 5,  // Lock after N failures
  lockoutMinutes: 15,    // Lock duration
} as const;

// ─── Validation ───────────────────────────────────────────────────────────────

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long.`);
  }
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  }
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter.");
  }
  if (PASSWORD_POLICY.requireDigit && !/\d/.test(password)) {
    errors.push("Password must contain at least one number.");
  }
  if (PASSWORD_POLICY.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&* etc.).");
  }

  return { valid: errors.length === 0, errors };
}

// ─── History check ─────────────────────────────────────────────────────────────

export async function isPasswordInHistory(
  plaintext: string,
  history: string[]  // Array of stored hashes (scrypt format: salt.hash)
): Promise<boolean> {
  for (const storedHash of history.slice(-PASSWORD_POLICY.historyCount)) {
    if (!storedHash || !storedHash.includes(".")) continue;
    try {
      const [salt, hash] = storedHash.split(".");
      const derivedHash = (await scryptAsync(plaintext, Buffer.from(salt, "hex"), 64)) as Buffer;
      const storedHashBuf = Buffer.from(hash, "hex");
      if (storedHashBuf.length === derivedHash.length && timingSafeEqual(derivedHash, storedHashBuf)) {
        return true;
      }
    } catch {
      // Skip malformed hash entries
    }
  }
  return false;
}

// ─── Expiry ───────────────────────────────────────────────────────────────────

export function isPasswordExpired(passwordChangedAt: Date | string | null): boolean {
  if (!passwordChangedAt) return false;
  const changed = new Date(passwordChangedAt);
  const expiryDate = new Date(changed.getTime() + PASSWORD_POLICY.expiryDays * 24 * 60 * 60 * 1000);
  return new Date() > expiryDate;
}

export function daysUntilPasswordExpiry(passwordChangedAt: Date | string | null): number {
  if (!passwordChangedAt) return PASSWORD_POLICY.expiryDays;
  const changed = new Date(passwordChangedAt);
  const expiryDate = new Date(changed.getTime() + PASSWORD_POLICY.expiryDays * 24 * 60 * 60 * 1000);
  const msLeft = expiryDate.getTime() - Date.now();
  return Math.ceil(msLeft / (24 * 60 * 60 * 1000));
}

// ─── Lockout ──────────────────────────────────────────────────────────────────

export function isAccountLocked(lockedUntil: Date | string | null): boolean {
  if (!lockedUntil) return false;
  return new Date() < new Date(lockedUntil);
}

export function getLockoutExpiry(): Date {
  return new Date(Date.now() + PASSWORD_POLICY.lockoutMinutes * 60 * 1000);
}
