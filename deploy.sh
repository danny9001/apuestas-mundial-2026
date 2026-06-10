#!/bin/bash
set -e

cd /home/soporte/apuestas-mundial-2026

echo "▶ Building Podman image..."
podman build --no-cache -t apuestas-mundial-2026_app:latest -f Containerfile .

echo "▶ Recreating app containers with new image..."
podman stop app_1 app_2 2>/dev/null || true
podman rm   app_1 app_2 2>/dev/null || true

podman run -d --name app_1 \
  --network mundial_frontend \
  --network mundial_backend \
  -v "$(pwd)/public/uploads":/app/public/uploads:z \
  --env-file "$(pwd)/.env.container" \
  -e NODE_ENV=production -e PORT=3000 -e HOSTNAME=0.0.0.0 \
  -e DB_HOST=postgres \
  --restart always \
  localhost/apuestas-mundial-2026_app:latest

podman run -d --name app_2 \
  --network mundial_frontend \
  --network mundial_backend \
  -v "$(pwd)/public/uploads":/app/public/uploads:z \
  --env-file "$(pwd)/.env.container" \
  -e NODE_ENV=production -e PORT=3000 -e HOSTNAME=0.0.0.0 \
  -e DB_HOST=postgres \
  --restart always \
  localhost/apuestas-mundial-2026_app:latest

echo "▶ Waiting for app startup..."
sleep 8

echo "▶ Restarting nginx-lb to refresh upstreams..."
podman restart nginx-lb
sleep 2

echo "▶ Health check..."
if curl -sf http://127.0.0.1:3001/api/health > /dev/null 2>&1 || curl -sf http://127.0.0.1:3001/ > /dev/null; then
  echo "✓ App respondiendo OK"
else
  echo "⚠ Health check falló — revisar logs: podman logs app_1"
fi

echo "▶ Actualizando PM2 (backup)..."
npm run build 2>/dev/null && pm2 restart apuestas-mundial 2>/dev/null || echo "  PM2 build omitido"

echo "▶ Purging Cloudflare cache..."
CF_ZONE_ID=$(grep '^CF_ZONE_ID=' .env.local | cut -d= -f2)
CF_API_TOKEN=$(grep '^CF_API_TOKEN=' .env.local | cut -d= -f2)

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
