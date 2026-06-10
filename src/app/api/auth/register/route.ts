import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { isValidEmail, validatePassword, sanitizeText, BCRYPT_ROUNDS } from '@/lib/validation';

export const dynamic = 'force-dynamic';

// POST: auto-registro de usuarios en mundial
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 });

    const nombre   = sanitizeText(String(body.nombre ?? ''), 100);
    const email    = String(body.email ?? '').toLowerCase().trim();
    const password = String(body.password ?? '');
    const telefono = body.telefono ? sanitizeText(String(body.telefono), 30) : null;
    const companyIds: number[] = Array.isArray(body.company_ids)
      ? body.company_ids.map((v: unknown) => Number(v)).filter((n: number) => Number.isFinite(n) && n > 0)
      : [];

    if (!nombre || nombre.length < 2) {
      return NextResponse.json({ error: 'El nombre es requerido (mín. 2 caracteres)' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'El correo electrónico no es válido' }, { status: 400 });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.ok) {
      return NextResponse.json({ error: pwCheck.error }, { status: 400 });
    }

    // Verificar que el email no esté en uso
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con ese correo electrónico' },
        { status: 409 }
      );
    }

    // Verificar company_ids válidos si se proporcionaron
    if (companyIds.length > 0) {
      const compCheck = await pool.query(
        'SELECT id FROM companies WHERE id = ANY($1) AND activo = true',
        [companyIds]
      );
      if (compCheck.rows.length !== companyIds.length) {
        return NextResponse.json({ error: 'Una o más empresas seleccionadas no son válidas' }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Insertar usuario — aprobado=false hasta que el admin apruebe
    const insertRes = await pool.query(
      `INSERT INTO users (nombre, email, password_hash, tipo, telefono, activo, aprobado)
       VALUES ($1, $2, $3, 'externo', $4, true, false)
       RETURNING id`,
      [nombre, email, passwordHash, telefono]
    );

    const userId = insertRes.rows[0].id;

    // Vincular empresas si se eligieron
    if (companyIds.length > 0) {
      const values = companyIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      await pool.query(
        `INSERT INTO user_companies (user_id, company_id) VALUES ${values} ON CONFLICT DO NOTHING`,
        [userId, ...companyIds]
      );
    }

    return NextResponse.json({
      success: true,
      message: '¡Cuenta creada! Tu solicitud está pendiente de aprobación por el administrador. Recibirás acceso en breve.',
    });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
