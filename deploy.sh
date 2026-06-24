#!/bin/bash
set -e

echo "▶ Building..."
pnpm build

echo "▶ Restarting PM2..."
pm2 reload elitepass-mundial --update-env

echo "▶ Purging Cloudflare cache..."
if [ -z "${CF_ZONE_ID}" ] || [ -z "${CF_API_TOKEN}" ]; then
  echo "✗ CF_ZONE_ID o CF_API_TOKEN no están en el entorno. Abortando." >&2
  exit 1
fi

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
