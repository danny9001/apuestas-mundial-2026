import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

// --- Rate limiter: Redis when available, in-memory Map as fallback ---
interface RateLimitEntry { count: number; resetAt: number }
const memStore = new Map<string, RateLimitEntry>();

async function rateLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; mode: 'redis' | 'memory' }> {
  const redis = getRedis();
  if (redis) {
    try {
      const redisKey = `rl:${key}`;
      const current = await redis.incr(redisKey);
      if (current === 1) await redis.pexpire(redisKey, windowMs);
      return { allowed: current <= limit, mode: 'redis' };
    } catch {
      // Fall through to memory
    }
  }

  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, mode: 'memory' };
  }
  if (entry.count >= limit) return { allowed: false, mode: 'memory' };
  entry.count++;
  return { allowed: true, mode: 'memory' };
}

// Cleanup stale memory keys every ~500 requests
let cleanupCounter = 0;
function maybeCleanup() {
  if (++cleanupCounter < 500) return;
  cleanupCounter = 0;
  const now = Date.now();
  for (const [key, entry] of memStore.entries()) {
    if (now > entry.resetAt) memStore.delete(key);
  }
}

// --- Limits config (most specific patterns FIRST) ---
const LIMITS: { pattern: RegExp; rps: number; windowMs: number }[] = [
  { pattern: /^\/api\/auth\/register/,  rps: 3,  windowMs: 60_000 },
  { pattern: /^\/api\/auth\/webauthn/,  rps: 10, windowMs: 60_000 },
  { pattern: /^\/api\/auth/,            rps: 5,  windowMs: 60_000 },
  { pattern: /^\/api\/profile/,         rps: 5,  windowMs: 60_000 },
  { pattern: /^\/api\/admin/,           rps: 15, windowMs: 60_000 },
  { pattern: /^\/api\/sync/,            rps: 3,  windowMs: 60_000 },
  { pattern: /^\/api\//,                rps: 30, windowMs: 60_000 },
];

function getLimit(pathname: string) {
  return LIMITS.find((l) => l.pattern.test(pathname)) ?? { rps: 60, windowMs: 60_000 };
}

// --- Security headers ---
function applySecurityHeaders(res: NextResponse, nonce: string, isProd: boolean, rlMode?: string) {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (rlMode) res.headers.set('X-RateLimit-Mode', rlMode);

  const scriptSrc = isProd
    ? `script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com`
    : `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://static.cloudflareinsights.com`;

  const styleSrc = `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`;
  res.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; ${scriptSrc}; ${styleSrc}; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https:; frame-src 'self' https://maps.google.com https://www.google.com; frame-ancestors 'none';`
  );
  if (isProd) {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProd = process.env.NODE_ENV === 'production';
  let rlMode: string | undefined;

  if (pathname.startsWith('/api/')) {
    const ip =
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      'unknown';

    maybeCleanup();
    const { rps, windowMs } = getLimit(pathname);
    const rlKey = `${ip}:${pathname.split('/').slice(0, 3).join('/')}`;
    const { allowed, mode } = await rateLimit(rlKey, rps, windowMs);
    rlMode = mode;

    if (!allowed) {
      return new NextResponse(JSON.stringify({ error: 'Demasiadas solicitudes. Intenta más tarde.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60', 'X-RateLimit-Mode': mode },
      });
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const res = NextResponse.next({
    request: {
      headers: new Headers({ ...Object.fromEntries(req.headers), 'x-nonce': nonce }),
    },
  });
  applySecurityHeaders(res, nonce, isProd, rlMode);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$|sw\\.js|manifest\\.json).*)'],
};
