import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, redirect } = body;

    if (!token || !redirect) {
      return NextResponse.json({ error: 'Missing token or redirect' }, { status: 400 });
    }

    // Validar JWT
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Establecer cookie de sesión
    const cookieStore = await cookies();
    cookieStore.set('apuestas_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 12,
      path: '/',
    });

    // Retornar redirect en JSON para que el cliente lo maneje
    return NextResponse.json({
      success: true,
      redirect: redirect
    });
  } catch (err) {
    console.error('sso-complete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
