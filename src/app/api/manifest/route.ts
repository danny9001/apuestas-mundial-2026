import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  let appName = 'Mundial 2026';
  let appLogo = '';

  try {
    const res = await pool.query("SELECT key, value FROM settings WHERE key IN ('app_name', 'app_logo')");
    for (const row of res.rows) {
      if (row.key === 'app_name') appName = row.value;
      if (row.key === 'app_logo') appLogo = row.value;
    }
  } catch {
    // Use defaults if DB unavailable
  }

  const icons = [
    { src: '/api/favicon', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: '/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
    { src: '/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
  ];

  const manifest = {
    name: appName,
    short_name: appName,
    description: 'Plataforma de pronósticos y apuestas deportivas para el Mundial 2026',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#eab308',
    orientation: 'portrait-primary',
    icons,
    categories: ['sports', 'games'],
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
