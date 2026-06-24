import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  default: { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }) },
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(null) }),
}));
vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((b, i) => ({ body: b, status: i?.status ?? 200 })) },
}));

describe('prediction validation', () => {
  it('rejects unauthenticated POST', async () => {
    const { POST } = await import('@/app/api/predictions/route');
    const req = {
      json: async () => ({ match_id: 1, pred_local: 1, pred_visitante: 0 }),
      headers: { get: () => null },
    } as any;
    const res = await POST(req);
    expect((res as any).status).toBe(401);
  });
});

describe('score validation', () => {
  it('rejects negative scores', () => {
    const isValidScore = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 20;
    expect(isValidScore(-1)).toBe(false);
    expect(isValidScore(0)).toBe(true);
    expect(isValidScore(5)).toBe(true);
    expect(isValidScore(21)).toBe(false);
    expect(isValidScore('2')).toBe(false);
  });
});
