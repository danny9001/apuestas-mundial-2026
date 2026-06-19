import { NextRequest, NextResponse } from 'next/server';

// --- Rate limiter in-memory (Edge-compatible) ---
interface RateLimitEntry { count: number; resetAt: number }
const store = new Map<string, RateLimitEntry>();

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// Cleanup stale keys every ~500 requests to avoid memory leak
let cleanupCounter = 0;
function maybeCleanup() {
  if (++cleanupCounter < 500) return;
  cleanupCounter = 0;
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}

// --- Limits config (most specific patterns FIRST) ---
const LIMITS: { pattern: RegExp; rps: number; windowMs: number }[] = [
  { pattern: /^\/api\/auth\/register/,  rps: 3,  windowMs: 60_000 }, // 3 registros/min
  { pattern: /^\/api\/auth\/webauthn/,  rps: 10, windowMs: 60_000 }, // 10 WebAuthn/min
  { pattern: /^\/api\/auth/,            rps: 5,  windowMs: 60_000 }, // 5 logins/min
  { pattern: /^\/api\/profile/,         rps: 5,  windowMs: 60_000 }, // 5 cambios perfil/min
  { pattern: /^\/api\/admin/,           rps: 15, windowMs: 60_000 }, // 15 admin ops/min
  { pattern: /^\/api\/sync/,            rps: 3,  windowMs: 60_000 }, // 3 syncs/min
  { pattern: /^\/api\//,                rps: 30, windowMs: 60_000 }, // general API 30/min
];

function getLimit(pathname: string) {
  return LIMITS.find((l) => l.pattern.test(pathname)) ?? { rps: 60, windowMs: 60_000 };
}

// --- Security headers ---
function applySecurityHeaders(res: NextResponse, nonce: string, isProd: boolean) {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Nonce-based script-src: removes unsafe-inline in production.
  // Modern browsers (CSP L2+) honour nonces and ignore unsafe-inline when both present,
  // but we omit unsafe-inline entirely so the policy is unambiguous.
  const scriptSrc = isProd
    ? `script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com`
    : `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://static.cloudflareinsights.com`;

  res.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https:; frame-src 'self' https://maps.google.com https://www.google.com; frame-ancestors 'none';`
  );
  if (isProd) {
    res.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProd = process.env.NODE_ENV === 'production';

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const ip =
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      'unknown';

    maybeCleanup();
    const { rps, windowMs } = getLimit(pathname);
    const allowed = rateLimit(`${ip}:${pathname.split('/').slice(0, 3).join('/')}`, rps, windowMs);

    if (!allowed) {
      return new NextResponse(JSON.stringify({ error: 'Demasiadas solicitudes. Intenta más tarde.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }
  }

  // Generate a per-request nonce for CSP — forwarded to Server Components via request header
  // so Next.js applies it to its own injected hydration scripts automatically.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const res = NextResponse.next({
    request: {
      headers: new Headers({ ...Object.fromEntries(req.headers), 'x-nonce': nonce }),
    },
  });
  applySecurityHeaders(res, nonce, isProd);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$|sw\\.js|manifest\\.json).*)'],
};
