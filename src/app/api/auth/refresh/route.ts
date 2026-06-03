import { NextResponse } from 'next/server';
import { getSessionUser, setSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  await setSession({
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    tipo: user.tipo,
    avatar: user.avatar,
  });

  return NextResponse.json({ success: true });
}
