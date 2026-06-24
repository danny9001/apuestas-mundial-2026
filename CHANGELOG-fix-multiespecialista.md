# Changelog — Fix Multi-Especialista (2026-06-24)

## ✅ Qué se hizo

- **v1.1.98 (P0):** Secretos hardcodeados eliminados de ecosystem.config.js; Dockerfile sin .env; deploy.sh lee CF_* del entorno; init.sql 100% idempotente + DROPs en reset.sql; hash bcrypt admin removido → seed-admin.js; error.message nunca llega al cliente en rutas API.
- **v1.1.99 (P1+P2):** src/middleware.ts creado (middleware no corría antes); CSP nonce en style-src, unsafe-inline eliminado; Redis rate limit (ioredis) con fallback a Map + header X-RateLimit-Mode; pg_try_advisory_lock en syncMatches (1 worker por ciclo); fetchWithRetry 8s/3 reintentos en 365scores, ESPN, FixtureDownload, FootballData y Microsoft Graph; migrations/ con runner y tabla _migrations; /api/health/sync sin auth; GDPR: GET /api/me/export + DELETE /api/me; requireUser/requireAdmin/requireSuperAdmin en auth.ts; encryption.ts AES-256-GCM; Dicebear seed = users.id; retención semanal en scheduler (90/180 días); Vitest + 3 suites de tests; CI/CD con gitleaks-action.

## ⚠️ Pendiente (requiere acción manual del operador)

1. **Exportar secretos al entorno del OS** antes del próximo `pm2 start`: `SYNC_SECRET`, `SCHEDULER_SECRET`, `JWT_SECRET`, `ENCRYPTION_SECRET` y todos los listados en `.env.example`.
2. **Ejecutar `node scripts/seed-admin.js`** con `ADMIN_EMAIL` y `ADMIN_PASSWORD` para recrear el usuario admin (hash viejo eliminado de init.sql).
3. **Exportar `CF_ZONE_ID` y `CF_API_TOKEN`** al entorno del servidor para que `deploy.sh` funcione.
4. **Redis (opcional pero recomendado):** Levantar Redis y configurar `REDIS_URL` para compartir rate limit entre los 4 workers PM2. Sin Redis el fallback es en-memoria (no compartido).
5. **Ejecutar `pnpm migrate`** para aplicar las migraciones 0002 y 0003 (columnas PII cifradas + índices de performance).
6. **`ENCRYPTION_SECRET`:** Generar con `openssl rand -hex 32` y añadir al entorno antes de usar los campos cifrados.
7. **Migración de datos PII existentes:** Los campos `telefono_enc`, `email_enc`, `email_hash`, `endpoint_enc` fueron agregados pero los datos existentes NO se migraron automáticamente — requiere script de backfill.
