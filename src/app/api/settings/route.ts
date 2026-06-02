import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Helper to ensure the settings table exists and default values are populated
async function ensureSettingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(50) PRIMARY KEY,
      value TEXT
    );
  `);
  
  // Seed defaults if empty
  const res = await pool.query('SELECT COUNT(*) FROM settings');
  if (parseInt(res.rows[0].count, 10) === 0) {
    await pool.query(`
      INSERT INTO settings (key, value) VALUES 
      ('app_name', 'Mundial 2026'),
      ('app_logo', '🏆')
      ON CONFLICT (key) DO NOTHING;
    `);
  }
}

export async function GET() {
  try {
    await ensureSettingsTable();
    const res = await pool.query('SELECT key, value FROM settings');
    const settings: Record<string, string> = {};
    res.rows.forEach((row) => {
      settings[row.key] = row.value;
    });
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.tipo !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await ensureSettingsTable();

    const formData = await req.formData();
    const appName = formData.get('app_name') as string;
    const logoType = formData.get('logo_type') as string; // 'emoji' or 'file'
    const logoEmoji = formData.get('logo_emoji') as string;
    const logoFile = formData.get('logo_file') as File | null;

    let appLogo = logoEmoji || '🏆';

    if (logoType === 'file' && logoFile && logoFile.size > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
      await fs.mkdir(uploadDir, { recursive: true });

      const ext = path.extname(logoFile.name) || '.png';
      const filename = `logo_${Date.now()}${ext}`;
      const filePath = path.join(uploadDir, filename);

      const buffer = Buffer.from(await logoFile.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      appLogo = `/uploads/logos/${filename}`;
    } else if (logoType === 'file') {
      // Keep existing logo if they selected file but didn't upload a new one
      const currentLogoRes = await pool.query("SELECT value FROM settings WHERE key = 'app_logo'");
      if (currentLogoRes.rows.length > 0) {
        appLogo = currentLogoRes.rows[0].value;
      }
    }

    if (appName && appName.trim().length > 0) {
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ('app_name', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [appName.trim()]
      );
    }

    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('app_logo', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [appLogo]
    );

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada con éxito',
      settings: {
        app_name: appName || 'Mundial 2026',
        app_logo: appLogo,
      },
    });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
