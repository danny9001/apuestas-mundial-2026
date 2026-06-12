import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

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
      ('app_logo', '🏆'),
      ('mail_notifications_enabled', 'true')
      ON CONFLICT (key) DO NOTHING;
    `);
  } else {
    await pool.query(`
      INSERT INTO settings (key, value) VALUES 
      ('mail_notifications_enabled', 'true')
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
    if (!user || (user.tipo !== 'admin' && user.tipo !== 'superadmin')) {
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

      const filename = `logo_${Date.now()}.webp`;
      const filePath = path.join(uploadDir, filename);

      const inputBuffer = Buffer.from(await logoFile.arrayBuffer());
      const webpBuffer = await sharp(inputBuffer)
        .rotate()
        .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90, effort: 6 })
        .toBuffer();
      await fs.writeFile(filePath, webpBuffer);

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

    // Extended branding settings
    const primaryColor = formData.get('primary_color') as string | null;
    const appSubtitle = formData.get('app_subtitle') as string | null;
    const contactWhatsapp = formData.get('contact_whatsapp') as string | null;
    const contactEmail = formData.get('contact_email') as string | null;
    const mailNotificationsEnabled = formData.get('mail_notifications_enabled') as string | null;

    const extraSettings: [string, string][] = [
      ['primary_color', primaryColor || ''],
      ['app_subtitle', appSubtitle || ''],
      ['contact_whatsapp', contactWhatsapp || ''],
      ['contact_email', contactEmail || ''],
      ['mail_notifications_enabled', mailNotificationsEnabled || ''],
    ];
    for (const [key, value] of extraSettings) {
      if (value !== null) {
        await pool.query(
          `INSERT INTO settings (key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [key, value]
        );
      }
    }

    // Return full updated settings map
    const allSettings = await pool.query('SELECT key, value FROM settings');
    const settingsMap: Record<string, string> = {};
    allSettings.rows.forEach((r) => { settingsMap[r.key] = r.value; });

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada con éxito',
      settings: settingsMap,
    });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
