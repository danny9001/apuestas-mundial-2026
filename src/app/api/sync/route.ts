import { NextRequest, NextResponse } from 'next/server';
import { syncMatches } from '@/lib/sync';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) {
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyAuth(req: NextRequest): boolean {
  const secret = process.env.SYNC_SECRET;
  if (!secret) {
    throw new Error('SYNC_SECRET env variable is not configured');
  }

  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return false;
  }
  const token = authHeader.substring(7).trim();
  return safeCompare(token, secret);
}

export async function GET(req: NextRequest) {
  try {
    if (!verifyAuth(req)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const result = await syncMatches();
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in sync api endpoint route:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAuth(req)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const result = await syncMatches();
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in sync api endpoint POST route:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
