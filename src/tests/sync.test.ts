import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

vi.mock('@/lib/db', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [{ acquired: true }], rowCount: 1 }),
    connect: vi.fn(),
  },
}));

describe('sync route authorization', () => {
  const secret = 'test-sync-secret-32-bytes-padding!!';

  it('rejects missing Authorization header', async () => {
    vi.mock('next/server', () => ({
      NextRequest: class {},
      NextResponse: { json: vi.fn((b, i) => ({ body: b, status: i?.status ?? 200 })) },
    }));
    const { createRequest } = await import('../tests/helpers/createRequest');
    const req = createRequest({ method: 'GET' });
    const { GET } = await import('@/app/api/sync/route');
    const res = await GET(req as any);
    expect((res as any).status).toBe(403);
  });

  it('rejects wrong token', async () => {
    const { createRequest } = await import('../tests/helpers/createRequest');
    const req = createRequest({ method: 'GET', headers: { authorization: 'Bearer wrong' } });
    process.env.SYNC_SECRET = secret;
    const { GET } = await import('@/app/api/sync/route');
    const res = await GET(req as any);
    expect((res as any).status).toBe(403);
  });

  it('timingSafeEqual: equal buffers return true', () => {
    const a = Buffer.from('abc');
    const b = Buffer.from('abc');
    expect(crypto.timingSafeEqual(a, b)).toBe(true);
  });

  it('timingSafeEqual: different buffers return false', () => {
    const a = Buffer.from('abc');
    const b = Buffer.from('xyz');
    expect(crypto.timingSafeEqual(a, b)).toBe(false);
  });
});

describe('advisory lock logic', () => {
  it('skips sync when lock is not acquired', async () => {
    const pool = (await import('@/lib/db')).default;
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{ acquired: false }], rowCount: 1 } as any);
    const { syncMatches } = await import('@/lib/sync');
    process.env.SYNC_ENABLED = 'true';
    const result = await syncMatches();
    expect(result.errors).toContain('sync already in progress');
  });
});
