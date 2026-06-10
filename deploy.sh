#!/bin/bash
set -e

cd /home/soporte/apuestas-mundial-2026

# Load env vars
set -a; source .env.local; set +a

echo "▶ Building..."
npm run build

echo "▶ Restarting PM2..."
pm2 restart apuestas-mundial

echo "▶ Purging Cloudflare cache..."
RESULT=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything": true}')

if echo "$RESULT" | grep -q '"success":true'; then
  echo "✓ Cloudflare cache purgado"
else
  echo "⚠ CF purge falló: $RESULT"
fi

echo "✓ Deploy completo"
