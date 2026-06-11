import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    
    if (!user.telefono) {
      return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 });
    }

    const apiKey = 'a42fa223449069d6825989f8206335ca';
    const res = await fetch('http://10.0.0.4:5001/api/v1/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        phoneNumber: user.telefono,
        message: `¡Hola ${user.nombre}! Te has suscrito exitosamente a las notificaciones de <b>Apuestas Mundial 2026</b>.\n\nA partir de ahora recibirás alertas importantes por este medio.`
      })
    });

    if (res.status === 404) {
      return NextResponse.json({ 
        error: 'No has vinculado tu cuenta en Telegram.', 
        botUrl: 'https://t.me/ElitePassBO_bot' 
      }, { status: 400 });
    }

    if (!res.ok) {
      console.error('Telegram service error:', await res.text());
      return NextResponse.json({ error: 'Error del servicio de telegram' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Telegram subscription error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
