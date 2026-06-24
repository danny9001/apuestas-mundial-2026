import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/headers and next/server before importing auth
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(null), set: vi.fn(), delete: vi.fn() }),
}));
vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((body, init) => ({ body, status: init?.status ?? 200 })) },
}));
vi.mock('@/lib/db', () => ({ default: { query: vi.fn() } }));

import jwt from 'jsonwebtoken';

describe('auth helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getSessionUser returns null when no cookie', async () => {
    const { getSessionUser } = await import('@/lib/auth');
    const user = await getSessionUser();
    expect(user).toBeNull();
  });

  it('requireUser returns 401 when not logged in', async () => {
    const { requireUser } = await import('@/lib/auth');
    const result = await requireUser() as any;
    expect(result?.status).toBe(401);
  });

  it('requireAdmin returns 401 when not logged in', async () => {
    const { requireAdmin } = await import('@/lib/auth');
    const result = await requireAdmin() as any;
    expect(result?.status).toBe(401);
  });

  it('requireSuperAdmin returns 401 when not logged in', async () => {
    const { requireSuperAdmin } = await import('@/lib/auth');
    const result = await requireSuperAdmin() as any;
    expect(result?.status).toBe(401);
  });

  it('JWT_SECRET missing throws on setSession', async () => {
    delete process.env.JWT_SECRET;
    const { setSession } = await import('@/lib/auth');
    await expect(setSession({ id: 1, nombre: 'Test', email: 'a@b.com', tipo: 'externo', avatar: '' }))
      .rejects.toThrow();
  });
});

describe('JWT verify', () => {
  it('invalid token is rejected', () => {
    expect(() => jwt.verify('bad.token.here', 'secret')).toThrow();
  });

  it('expired token is rejected', () => {
    const token = jwt.sign({ id: 1 }, 'secret', { expiresIn: -1 });
    expect(() => jwt.verify(token, 'secret')).toThrow(/expired/);
  });
});
