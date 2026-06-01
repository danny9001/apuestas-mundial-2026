import { NextRequest, NextResponse } from 'next/server';
import { syncMatches } from '@/lib/sync';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const secret = process.env.SYNC_SECRET || 'sync2026';

    if (key !== secret) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const result = await syncMatches();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in sync api endpoint route:', error);
    return NextResponse.json({ error: 'Error interno: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const secret = process.env.SYNC_SECRET || 'sync2026';

    if (key !== secret) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const result = await syncMatches();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in sync api endpoint POST route:', error);
    return NextResponse.json({ error: 'Error interno: ' + error.message }, { status: 500 });
  }
}
