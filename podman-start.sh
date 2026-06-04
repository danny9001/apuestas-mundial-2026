#!/bin/bash
# Script de arranque del cluster Podman de Apuestas Mundial 2026
# Ejecutar como: bash podman-start.sh
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "[mundial] Arrancando cluster Podman..."

# ── Limpiar contenedores previos (si existen) ────────────────────────────────
podman stop postgres app_1 app_2 nginx-lb scheduler 2>/dev/null || true
podman rm   postgres app_1 app_2 nginx-lb scheduler 2>/dev/null || true

# ── Crear redes (si no existen) ──────────────────────────────────────────────
podman network exists mundial_backend  || podman network create mundial_backend  --internal
podman network exists mundial_frontend || podman network create mundial_frontend

# ── PostgreSQL ───────────────────────────────────────────────────────────────
podman run -d --name postgres \
  --network mundial_backend \
  -v pg_data:/var/lib/postgresql/data \
  -e POSTGRES_USER=mundial \
  -e POSTGRES_PASSWORD=5g_kR654y-T6zx4WMq2kG_Xac2-T9wJ \
  -e POSTGRES_DB=apuestas_mundial \
  --restart always \
  docker.io/library/postgres:16-alpine

echo "[mundial] Esperando PostgreSQL..."
until podman exec postgres pg_isready -U mundial -d apuestas_mundial 2>/dev/null; do sleep 2; done
echo "[mundial] PostgreSQL listo."

# ── App réplica 1 ────────────────────────────────────────────────────────────
podman run -d --name app_1 \
  --network mundial_frontend \
  --network mundial_backend \
  -v uploads_data:/app/public/uploads \
  --env-file "$DIR/.env.container" \
  -e NODE_ENV=production -e PORT=3000 -e HOSTNAME=0.0.0.0 \
  -e DB_HOST=postgres \
  --restart always \
  localhost/apuestas-mundial-2026_app:latest

# ── App réplica 2 ────────────────────────────────────────────────────────────
podman run -d --name app_2 \
  --network mundial_frontend \
  --network mundial_backend \
  -v uploads_data:/app/public/uploads \
  --env-file "$DIR/.env.container" \
  -e NODE_ENV=production -e PORT=3000 -e HOSTNAME=0.0.0.0 \
  -e DB_HOST=postgres \
  --restart always \
  localhost/apuestas-mundial-2026_app:latest

# ── Nginx load balancer ──────────────────────────────────────────────────────
podman run -d --name nginx-lb \
  --network mundial_frontend \
  -p 3001:80 \
  -v "$DIR/nginx/nginx.conf":/etc/nginx/conf.d/default.conf:ro \
  --restart always \
  docker.io/library/nginx:alpine

# ── Scheduler ────────────────────────────────────────────────────────────────
podman run -d --name scheduler \
  --network mundial_frontend \
  --env-file "$DIR/.env.container" \
  -e APP_BASE_URL=http://nginx-lb \
  --restart always \
  localhost/mundial-scheduler:latest

echo "[mundial] Cluster iniciado. Verificando salud..."
sleep 8
curl -sf http://localhost:3001/api/health && echo " OK" || echo " FALLO"
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
