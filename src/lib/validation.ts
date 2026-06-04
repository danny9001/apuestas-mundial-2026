/**
 * Centralised input validation & sanitisation helpers.
 * All user-supplied strings pass through here before DB writes or responses.
 */

// bcrypt rounds — 12 gives ~250ms/hash, balancing security vs latency
export const BCRYPT_ROUNDS = 12;

// Maximum avatar upload size (5 MB)
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

// Dummy bcrypt hash used for constant-time comparison when user doesn't exist
// (prevents user-enumeration via timing)
export const DUMMY_BCRYPT_HASH =
  '$2a$12$LfZMhBGxJHHtIpMJrxvBZuaVQvKT/7X8EKA3XZF9jKkWyU8IlxVNu';

/**
 * RFC-5321 simplified email check.
 * Rejects obvious garbage while staying permissive for real addresses.
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);
}

/**
 * Strip HTML tags and XSS-dangerous characters from free-text fields
 * (nombre, etc.). Returns the cleaned string truncated to maxLen.
 */
export function sanitizeText(input: string, maxLen = 100): string {
  return input
    .trim()
    .replace(/<[^>]*>/g, '')        // remove HTML tags
    .replace(/[<>&"'`]/g, '')       // strip residual XSS chars
    .slice(0, maxLen);
}

/**
 * Validate password strength.
 * Returns { ok: true } or { ok: false, error: string }.
 */
export function validatePassword(pw: string): { ok: boolean; error?: string } {
  if (!pw || pw.trim().length < 8) {
    return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres' };
  }
  return { ok: true };
}

/**
 * Validate a user role value against the allowed set.
 */
const ALLOWED_ROLES = new Set(['externo', 'interno', 'admin', 'superadmin']);
export function isValidRole(role: string): boolean {
  return ALLOWED_ROLES.has(role);
}
