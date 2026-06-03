import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  let appLogo = '';

  try {
    const res = await pool.query("SELECT value FROM settings WHERE key = 'app_logo'");
    if (res.rows.length > 0) appLogo = res.rows[0].value;
  } catch {
    // fallback to default
  }

  // If logo is an uploaded image, serve it directly
  if (appLogo.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), 'public', appLogo);
    try {
      const buf = await fs.readFile(filePath);
      const ext = path.extname(appLogo).toLowerCase();
      const mime =
        ext === '.webp' ? 'image/webp' :
        ext === '.png'  ? 'image/png'  :
        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
        ext === '.avif' ? 'image/avif' : 'image/png';
      return new NextResponse(buf, {
        headers: {
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=60',
        },
      });
    } catch {
      // file not readable, fall through to SVG default
    }
  }

  // If logo is an external URL, redirect
  if (appLogo.startsWith('http')) {
    return NextResponse.redirect(appLogo, { status: 302 });
  }

  // Emoji or fallback: return branded SVG
  const emoji = appLogo && !appLogo.startsWith('/') ? appLogo : '🏆';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="12" fill="#09090b"/>
  <text x="32" y="46" font-size="38" text-anchor="middle" font-family="sans-serif">${emoji}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
