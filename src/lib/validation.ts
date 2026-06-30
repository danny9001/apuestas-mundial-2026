/**
 * Centralised input validation & sanitisation helpers.
 * All user-supplied strings pass through here before DB writes or responses.
 */

// bcrypt rounds — 10 balances security and latency (especially for pure JS bcryptjs)
export const BCRYPT_ROUNDS = 10;

// Maximum avatar upload size (5 MB)
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

// Dummy bcrypt hash used for constant-time comparison when user doesn't exist
// (prevents user-enumeration via timing)
export const DUMMY_BCRYPT_HASH =
  '$2a$10$DxP3ehUZuiJJ7yOG9g.A1O3p2m.P53lD2f7tV28KnyWq6mB02q02i';

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

/**
 * Derive a human-readable device label from a User-Agent string and
 * the WebAuthn transports array.
 *
 * Priority: transport hints first (most reliable), UA fallback.
 * Examples: "iPhone • Safari", "Windows • Chrome", "YubiKey (USB)", "Android • Chrome"
 */
export function deviceLabelFromUA(ua: string, transports: string[] = []): string {
  const t = transports.map((s) => s.toLowerCase());

  // Hardware security keys
  if (t.includes('usb'))    return 'Llave de seguridad (USB)';
  if (t.includes('nfc'))    return 'Llave de seguridad (NFC)';
  if (t.includes('ble'))    return 'Llave de seguridad (Bluetooth)';
  if (t.includes('smart-card')) return 'Tarjeta inteligente';

  // Cross-device (phone used as roaming authenticator)
  if (t.includes('hybrid')) return deviceFromUA(ua) + ' (otro dispositivo)';

  // Platform authenticator — use UA for context
  return deviceFromUA(ua);
}

function deviceFromUA(ua: string): string {
  if (!ua) return 'Dispositivo desconocido';
  const u = ua.toLowerCase();

  // OS / device detection
  let device = '';
  if (/iphone/.test(u))       device = 'iPhone';
  else if (/ipad/.test(u))    device = 'iPad';
  else if (/android/.test(u)) device = 'Android';
  else if (/windows/.test(u)) device = 'Windows';
  else if (/macintosh|mac os x/.test(u) && !/iphone|ipad/.test(u)) device = 'Mac';
  else if (/linux/.test(u))   device = 'Linux';
  else if (/cros/.test(u))    device = 'Chromebook';
  else                        device = 'Dispositivo';

  // Browser detection
  let browser = '';
  if (/edg\/|edge\//.test(u))      browser = 'Edge';
  else if (/opr\/|opera\//.test(u)) browser = 'Opera';
  else if (/chrome\//.test(u))     browser = 'Chrome';
  else if (/firefox\//.test(u))    browser = 'Firefox';
  else if (/safari\//.test(u))     browser = 'Safari';

  return browser ? `${device} • ${browser}` : device;
}

const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bash', 'js', 'jsx', 'ts', 'tsx', 'py', 'pl', 'php',
  'asp', 'aspx', 'jsp', 'cgi', 'html', 'htm', 'shtml', 'xhtml', 'swf', 'jar',
  'msi', 'scr', 'vbs', 'wsf', 'com', 'dll', 'so', 'lnk'
]);

export function isBlockedExtension(filename: string): boolean {
  if (!filename) return true;
  const ext = filename.split('.').pop()?.toLowerCase();
  return !ext || BLOCKED_EXTENSIONS.has(ext);
}

export function validateUploadedFile(
  file: File,
  allowedMimeTypes: string[],
  maxBytes: number
): { ok: boolean; error?: string } {
  if (!file) return { ok: false, error: 'No se ha subido ningún archivo' };

  if (file.size > maxBytes) {
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(0);
    return { ok: false, error: `El archivo supera el tamaño máximo permitido de ${maxMb} MB` };
  }

  if (isBlockedExtension(file.name)) {
    return { ok: false, error: 'La extensión del archivo no está permitida por seguridad' };
  }

  const mimeType = file.type?.toLowerCase();
  const isMimeAllowed = allowedMimeTypes.some(pattern => {
    if (pattern.endsWith('/*')) {
      const category = pattern.split('/')[0];
      return mimeType.startsWith(category + '/');
    }
    return mimeType === pattern;
  });

  if (!isMimeAllowed) {
    return { ok: false, error: 'El tipo de archivo no está permitido' };
  }

  return { ok: true };
}

export function validateScore(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 99 ? n : null;
}
