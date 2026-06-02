---
name: skill-elite-pass-knowledge
description: >
  Historial completo de todas las optimizaciones (WebP, imágenes, nginx, DB,
  rendimiento, PWA, notificaciones), hardening de seguridad, mejoras de base
  de datos y cambios de apariencia aplicados al sistema club-administrator
  (Elite Pass). Fuente de verdad para estado actual vs pendiente.
  Invocar con /skill-elite-pass-knowledge.
---

Cuando se invoque esta skill, PRIMERO ejecuta el checklist de verificación
del sistema antes de mostrar cualquier otra información. Luego muestra el
historial completo organizado por categoría.

---

## CHECKLIST DE VERIFICACIÓN — ejecutar al inicio de cada sesión

Antes de recomendar o implementar cualquier cosa, verifica el estado real
del sistema con los siguientes comandos y marca cada ítem como
✅ Aplicado / ⚠️ Parcial / ❌ Falta / N/A No aplica a este sistema.

### NGINX

```bash
# N4 — Rate limiting activo
grep -c "limit_req_zone" /etc/nginx/sites-available/reservas.genial-it.net

# N2+N5 — Headers duplicados eliminados (debe devolver 0)
grep -c "X-XSS-Protection\|X-Frame-Options.*SAMEORIGIN\|Referrer-Policy\|Strict-Transport" /etc/nginx/sites-available/reservas.genial-it.net

# N3 — gzip_types completo (debe incluir svg+xml, woff2, wasm)
grep "gzip_types" /etc/nginx/nginx.conf

# N1 — Brotli instalado
nginx -V 2>&1 | grep -o brotli || echo "NO instalado"
```

### APLICACIÓN (Next.js / PM2)

```bash
# App corriendo
pm2 list | grep club-administrator

# Redis URL configurada (debe tener un valor real, no placeholder)
grep "REDIS_URL" /home/soporte/club-administrator/.env

# Build reciente (últimos deploys)
cd /home/soporte/club-administrator && git log --oneline -5
```

### BASE DE DATOS

```bash
# Migraciones al día
cd /home/soporte/club-administrator && pnpm prisma migrate status 2>&1 | tail -5

# Índice userId+hasActivity existe
cd /home/soporte/club-administrator && pnpm prisma db execute --stdin <<< "SELECT indexname FROM pg_indexes WHERE tablename='user_activity' AND indexname LIKE '%has%';" 2>/dev/null || echo "Verificar manualmente en psql"
```

### SEGURIDAD

```bash
# CrowdSec activo
sudo systemctl status crowdsec --no-pager | head -3

# Bouncer activo
sudo systemctl status crowdsec-firewall-bouncer --no-pager | head -3

# Geoblock activo
sudo systemctl status geoblock-ssh --no-pager | head -3
```

### HEADERS DE RESPUESTA (verificar en browser o curl)

```bash
curl -s -I https://reservas.genial-it.net | grep -i "x-frame\|x-content\|strict-trans\|content-security\|x-xss"
```

Resultado esperado:
- `x-frame-options: DENY` (viene del middleware Next.js)
- `x-content-type-options: nosniff`
- `strict-transport-security: max-age=63072000` (con preload)
- `content-security-policy: default-src 'self'...`
- `x-xss-protection` NO debe aparecer

---

Usa los datos a continuación como fuente de verdad sobre lo que está
implementado y lo que está pendiente en el sistema.

---

# HISTORIAL COMPLETO — ELITE PASS (club-administrator)

## PROYECTO

- **Stack:** Next.js 15, React 19, Prisma 6, PostgreSQL, BetterAuth, PM2 Cluster
- **URL producción:** https://reservas.genial-it.net
- **Package manager:** pnpm (nunca npm)
- **Servidor:** VM00-Reservas-v1 (Azure Ubuntu), usuario `soporte`

---

## 1. SEGURIDAD (hardening 2026-06-01)

Commit: `4b258d1` — 10 ítems aplicados, 5 pendientes.

### APLICADO

| ID | Descripción | Archivos |
|----|-------------|---------|
| ITEM 1 | **Rate limit Redis + fallback in-memory** — `ioredis` instalado. `REDIS_URL` como placeholder en `.env`. Middleware usa in-memory (Edge); Server Actions usan Redis. | `src/lib/security/rate-limit.ts` |
| ITEM 2 | **Multi-tenancy guard** — `requireOrganizationFilter()` y `assertOrganizationId()`. Previene que un tenant lea datos de otro. | `src/lib/security/organization-guard.ts` |
| ITEM 4 | **Session TTL 12h** — `expiresIn: 60*60*12`, cookies con `httpOnly/secure/sameSite:strict`. | `src/lib/auth.ts` |
| ITEM 5 | **Auth session sin duplicación** — `upload-actions.ts` y `permission-actions.ts` usan `getAuthSession()`; `auth-actions.ts` usa `auth.api.getSession()` solo donde necesita `session.session.id`. | múltiples actions |
| ITEM 6 | **Export rate limit** — 1 export/minuto por usuario (Redis/fallback). Aplica en `exportRequestsToExcel`, `getWeekendReportData`, `getTableSalesReportData`. | `src/lib/actions/export-actions.ts` |
| ITEM 7 | **File upload protection** — `isBlockedExtension()` con 25+ extensiones bloqueadas (.exe, .php, .sh, .py, etc.). Aplicado en voucher uploads. | `src/lib/utils/file-validator.ts`, `voucher-validator.ts` |
| ITEM 8 | **Encryption AES-256-GCM** — helpers `encrypt/decrypt/hashForIndex/isEncrypted` y `FIELD_ENCRYPTION_KEY` generado. **Campos phone/document/email en DB aún NO encriptados** — requiere migración. | `src/lib/security/encryption.ts` |
| ITEM 9 | **Token leak fix** — eliminado `sessionToken: result.token` y `entityId: result.token` del audit log en login. | `src/lib/actions/auth-actions.ts` |
| ITEM 10 | **Dependencies actualizadas** — pnpm update sin actualizaciones pendientes al 2026-06-01. | `package.json` |
| ITEM 11 | **HSTS** — `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` en middleware (solo producción). | `src/middleware.ts` |

### PENDIENTE / NO APLICADO

| ID | Descripción | Razón |
|----|-------------|-------|
| ITEM 3 | QR security fields (`qrExpiresAt`, `qrUsed`) — `qrExpiry` ya existe en `Payment` pero no se agregaron en `QREntry`. Token hashing pendiente. | Impacto en schema/migración |
| ITEM 8 partial | Encriptación de campos phone/document/email en DB. | Requiere migración Prisma + refactor de todos los queries |
| ITEM 12 | Central Redis cache (módulo creado en `src/lib/security/redis-client.ts` pero no implementado). Falta `REDIS_URL` real en `.env`. | `REDIS_URL` sin configurar |
| ITEM 13 | Audit log completo — cubre login/logout/QR scan/reservas/permisos. Sin cambios adicionales pendientes. | Completo |
| ITEM 15 | Fail-safe permissions — `assertAuth` ya es default-deny. Sin cambios estructurales. | Ya implementado |

### Redis URL pendiente

```bash
# En /home/soporte/club-administrator/.env
REDIS_URL=redis://:password@127.0.0.1:6379/0
```

---

## 2. OPTIMIZACIONES DE DESARROLLO (2026-05-14)

Auditoría multi-agente (Arquitecto + SRE + Performance). Impacto estimado: **−40–65% TTFB** en rutas autenticadas.

### CB-01 — Doble resolución de sesión auth [APLICADO]

**Archivo:** `src/lib/actions/helpers/auth-helper.ts`

**Problema:** `assertAuth` llamaba directamente a `auth.api.getSession()` ignorando el `React.cache()` de `getAuthSession()` en `tenant.ts`. Resultado: 2 round-trips al servicio de auth por cada Server Action.

**Solución:**
```typescript
// ANTES
import { auth } from "@/lib/auth";
const session = await auth.api.getSession({ headers: requestHeaders }); // directo, sin cache

// DESPUÉS
import { getAuthSession } from "@/lib/tenant"; // usa React cache()
const session = await getAuthSession(); // 0 costo si ya fue llamado en el mismo request
```

**Ganancia:** −1 round-trip por cada Server Action (~5–15 ms). Aplica al 100% de endpoints autenticados.

---

### CB-02 — Cascada de queries en `getCurrentOrganizationId()` [APLICADO]

**Archivo:** `src/lib/tenant.ts`

**Problema:** Hasta 3 queries secuenciales (activeId MISS → fallback first → fallback SUPER_ADMIN).

**Solución:**
```typescript
// DESPUÉS: 1 query incondicional, resolución en JS
const memberships = await db.organizationMember.findMany({
  where: { userId, organization: { isActive: true } },
  orderBy: { createdAt: "asc" },
  select: { organizationId: true },
  take: 50,
});
if (activeId) {
  const preferred = memberships.find((m) => m.organizationId === activeId);
  if (preferred) return preferred.organizationId;
}
return memberships[0]?.organizationId ?? null;
```

**Ganancia:** −1 a −2 queries DB por request autenticado (~10–30 ms).

---

### CB-04 — Waterfall N+1 en `getActivityStats()` [APLICADO]

**Archivo:** `src/lib/actions/user-activity-stats-actions.ts`

**Problema:** 3 rondas secuenciales de DB (orgMembers → [groupBy, findMany] → user.findMany).

**Solución:** 2 queries raw SQL en paralelo con `Promise.all`:
```typescript
const [rankRows, dateRows] = await Promise.all([
  db.$queryRaw<RankRow[]>`
    SELECT u.id AS "userId", u.name AS "userName",
      COUNT(ua.id) FILTER (WHERE ua."hasActivity" = true) AS "activityCount"
    FROM "organization_member" om
    JOIN "user" u ON u.id = om."userId"
    LEFT JOIN "user_activity" ua ON ua."userId" = u.id
    WHERE om."organizationId" = ${organizationId}
    GROUP BY u.id, u.name ORDER BY "activityCount" DESC
  `,
  db.$queryRaw<DateRow[]>`
    SELECT ua."date" FROM "user_activity" ua
    INNER JOIN "organization_member" om ON om."userId" = ua."userId"
      AND om."organizationId" = ${organizationId}
    WHERE ua."hasActivity" = true
  `,
]);
```

**Ganancia:** de 3 rondas secuenciales a 1 ronda paralela (~20–40 ms).

---

### CB-05 — Streaming Boundaries (loading.tsx / error.tsx) [APLICADO]

**Archivos creados:** 6 nuevos archivos en las 3 rutas más pesadas.

**Problema:** 0 archivos `loading.tsx` / `error.tsx` en 53 páginas. Pantalla en blanco hasta que el Server Component más lento resolvía.

**Solución:**
```
src/app/(system)/
├── dashboard/
│   ├── loading.tsx   ← skeleton 4 cards + 2 charts
│   └── error.tsx     ← alerta destructiva + botón "Reintentar"
├── event-panel/
│   ├── loading.tsx   ← skeleton selector + KPIs + charts
│   └── error.tsx     ← alerta con reset
└── user-activity/
    ├── loading.tsx   ← skeleton tabs + 2 charts
    └── error.tsx     ← alerta con reset
```

**Ganancia (UX):** TTFB percibido −60–80%. Shell HTML con skeleton llega en < 100 ms.

---

### PC-01 — Lazy loading de `html5-qrcode` [APLICADO]

**Archivo:** `src/components/system/qr/qr-scanner-camera.tsx`

**Problema:** ~38 KB gzip cargados estáticamente aunque el usuario no abra la cámara.

**Solución:**
```typescript
// DESPUÉS: import de tipo (0 costo) + lazy al activar
import type { Html5Qrcode } from "html5-qrcode";

const startCamera = useCallback(async () => {
  const { Html5Qrcode: Html5QrcodeClass } = await import("html5-qrcode");
  const html5QrCode = new Html5QrcodeClass("qr-reader");
}, []);
```

**Ganancia:** ~38 KB removidos del bundle inicial.

---

### PC-02 — Cache público en `/eventos` [APLICADO]

**Archivo:** `src/middleware.ts`

**Problema:** `/eventos` (catálogo público) tenía `Cache-Control: no-store` igual que rutas privadas.

**Solución:**
```typescript
// DESPUÉS: cache CDN 60s + stale-while-revalidate 5 min
response.headers.set(
  "Cache-Control",
  "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
);
```

**Ganancia:** CDN puede servir `/eventos` desde edge sin tocar el servidor por 60 s.

---

### PC-03 — Alerta de acciones lentas [APLICADO]

**Archivo:** `src/lib/actions/helpers/action-metrics.ts`

```typescript
if (durationMs > 2000) {
  console.warn("[slow-action]", { action: name, durationMs });
}
```

Monitorizar con: `pm2 logs elite-pass | grep "[slow-action]"`

---

### PENDIENTE — Fase 3 Infraestructura

| # | Acción | Impacto |
|---|--------|---------|
| 3.1 | Redis cache compartido entre workers PM2 | Elimina cold-start por worker; rate-limit correcto |
| 3.2 | Nginx como reverse proxy (gzip/brotli + rate-limit por zona) | −40% transferencia, rate-limit multi-worker correcto |
| 3.3 | Export Service separado (puerto 3001, fork mode) | Event loop libre durante exports de exceljs |
| 3.4 | Prometheus + Grafana | Observabilidad en tiempo real |
| 3.5 | OpenTelemetry trazas | Debug latencia end-to-end |

**Problema actual con rate-limit:** Con PM2 cluster, cada worker tiene su propio `Map`. Con 2 workers, el límite real se multiplica por 2 (ej: límite 28 → usuario puede hacer 56 sin ser bloqueado).

**Nginx recomendado:**
```nginx
limit_req_zone $binary_remote_addr zone=api_general:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=api_auth:10m     rate=20r/m;
limit_req_zone $binary_remote_addr zone=api_exports:10m  rate=5r/m;
```

---

## 3. OPTIMIZACIONES DE BASE DE DATOS (2026-05-14)

### DB-01 — Índice compuesto en `UserActivity` [APLICADO]

**Archivo:** `prisma/schema.prisma`
**Aplicado vía:** `npx prisma db push`

```prisma
model UserActivity {
  @@unique([userId, date])      // ya existía
  @@index([userId])             // ya existía
  @@index([date])               // ya existía
  @@index([userId, hasActivity]) // NUEVO — optimiza JOIN en getActivityStats
  @@map("user_activity")
}
```

**Por qué:** El JOIN de la query raw de `getActivityStats` filtra por `hasActivity = true` sobre usuarios de una org. Sin este índice, PostgreSQL hacía seq-scan sobre toda la tabla.

### Índices existentes en producción

| Modelo | Índice | Estado |
|--------|--------|--------|
| `Request` | `[eventId, status]` | ✅ Existía |
| `Request` | `[eventId, isPaid]` | ✅ Existía |
| `Request` | `[eventId, createdAt]` | ✅ Existía |
| `Request` | `[organizationId, createdAt]` | ✅ Existía |
| `UserActivity` | `[userId, date]` (unique) | ✅ Existía |
| `UserActivity` | `[userId, hasActivity]` | ✅ Agregado 2026-05-14 |

### CB-03 — Cache Postgres sobre Postgres [PENDIENTE — Fase 3]

**Archivo:** `src/lib/server/postgres-cache.ts`

**Problema:** La tabla `AppCache` en la misma DB añade 2 queries adicionales por cada lookup:
```
Request → AppCache lookup (query) → MISS → 10+ queries dashboard → AppCache upsert (query)
```

**Solución pendiente:** Redis compartido entre workers.
```typescript
// src/lib/server/shared-cache.ts (a implementar)
import Redis from "ioredis";
export async function sharedGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return memGet<T>(key); // fallback in-process
  const raw = await redis.get(key);
  return raw ? JSON.parse(raw) : null;
}
```

### Migración nuevas funcionalidades 2026-05-22

Archivo: `prisma/migrations/20260522000000_add_payment_modes_invoice_public_forms/migration.sql`

Modelos agregados:
- `PublicGuestForm` — formulario por relacionador/evento
- `PublicGuestRegistration` — registros individuales
- `PublicGuestGroup` — grupos post-fraccionamiento
- `PublicGuestGroupStatus` enum — DRAFT, PENDING_APPROVAL, APPROVED, REJECTED
- `Event.publicFormMaxRegistrations Int @default(50)`
- `Event.publicFormInvitesPerGroup Int @default(10)`
- `Event.paymentGatewayMode String @default("ELITE")` — "ELITE" | "CUSTOM"
- `Organization.hasCustomPaymentCredentials Boolean @default(false)`
- `Organization.nitPrincipal String?`
- `Event.requiresInvoice Boolean @default(false)`

---

## 4. OPTIMIZACIONES DE APARIENCIA / DISEÑO

### Design System — Elite Pass (DESIGN.md)

**Filosofía:** Paleta intencionalmente acromática (escala de grises). El branding de cada organización/evento destaca sin competir con el sistema base.

#### Paleta de colores

| Token | Valor | Uso |
|-------|-------|-----|
| `primary` | `#282828` | Botones principales, elementos primarios |
| `primary-foreground` | `#FAFAFA` | Texto sobre primary |
| `secondary` | `#F7F7F7` | Fondos de secciones, elementos secundarios |
| `muted-foreground` | `#777777` | Texto secundario/metadatos |
| `destructive` | `#DC2626` | Acciones críticas, errores |
| `background` | `#FFFFFF` | Fondo principal (modo claro) |
| `border` | `#E5E5E5` | Bordes de inputs, divisores |
| `ring` | `#ABABAB` | Focus rings |

#### Tipografía

| Nivel | Fuente | Tamaño | Peso |
|-------|--------|--------|------|
| h1 | Segoe UI / system sans-serif | 36px | 700 |
| h2 | Segoe UI / system sans-serif | 30px | 700 |
| h3 | Segoe UI / system sans-serif | 24px | 700 |
| h4 | Segoe UI / system sans-serif | 18px | 600 |
| body | Segoe UI / system sans-serif | 16px | 400 |
| body-sm / label | Segoe UI / system sans-serif | 14px | 400/500 |
| caption | Segoe UI / system sans-serif | 12px | 400 |
| code | SFMono-Regular / Consolas | 14px | 400 |

**Regla:** máximo 2 pesos de fuente por pantalla.

#### Bordes / Radios

| Token | Valor | Uso |
|-------|-------|-----|
| `sm` | 6px | Elementos pequeños |
| `md` | 8px | Botones, inputs (default) |
| `lg` | 10px | Cards estándar |
| `xl` | 14px | Cards de énfasis |
| `full` | 9999px | Avatares (siempre circulares) |

**Regla:** No mezclar radios muy distintos en la misma vista.

#### Espaciado (base 4px)

| Token | Valor |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 32px |
| xl | 64px |

Cards y contenedores principales: padding 24px (lg).

#### Componentes clave

- **Button:** `primary` (#282828), rounded 8px, padding horizontal 16px
- **Input:** altura 36px, rounded 8px, fondo blanco, borde `#E5E5E5`
- **Card:** rounded 10px (lg) o 14px (xl), fondo blanco, borde 1px
- **Avatares:** siempre `rounded-full`
- **Elevación/profundidad:** capas tonales y bordes sutiles, sin sombras pesadas

#### Dark mode

`next-themes` v0.4.6 implementado. Tailwind 4 con clases `dark:`. El botón carga masiva (bulk upload) usa `amber` adaptado a ambos temas.

#### PWA / Mobile

Safe areas con `safe-area-inset-*` para dispositivos con notch.

#### Branding por organización

`getPublicOrganizationBranding()` en `tenant.ts` — resuelve logotipo y nombre de la org marcada como `isDefaultPublic: true`. Unificar fuente entre `layout.tsx` (metadata) y la UI del header para evitar mezcla de branding.

---

## 5. NUEVAS FUNCIONALIDADES 2026-05-22

### Objetivo 1 — Métodos de pago por evento

Toggle en formulario de evento: "ELITE" (pasarela compartida) vs "CUSTOM" (pasarela propia).
- Schema: `Event.paymentGatewayMode`, `Organization.hasCustomPaymentCredentials`
- UI: `src/components/system/events/event-form-page.tsx`

### Objetivo 2 — Facturación SIAT por evento

Toggle "Facturar con NIT" en formulario de evento.
- Schema: `Organization.nitPrincipal`, `Event.requiresInvoice`
- **Pendiente:** UI en `external-reservation-payment.tsx` para solicitar nombre/CI/correo cuando `requiresInvoice = true`.

### Objetivo 3 — Formulario público de invitados en vivo

- Ruta pública sin auth: `src/app/public/forms/[formId]/page.tsx`
- Polling en vivo: `src/components/system/events/public-guest-form-panel.tsx`
- API contador: `src/app/api/public/forms/[formId]/count/route.ts`

### Objetivo 4 — Carga masiva (botón dorado)

- `src/components/system/package-reservations/bulk-upload-button.tsx`
- Límite: 200 invitados (constante `BULK_MAX_GUESTS`)
- Visible para: SUPER_ADMIN, ADMIN, MANAGER, SUPERVISOR (TEAM_LEADER en UI), USER (RELACIONADOR en UI)
- Estilo: `amber` adaptado a light/dark theme

---

## 6. TABLA DE ROLES (crítico — no confundir UI con DB)

| Valor en DB (`user.role`) | Nombre mostrado en UI |
|---------------------------|----------------------|
| `SUPER_ADMIN` | Super Admin |
| `ADMIN` | Admin |
| `MANAGER` | Manager |
| `SUPERVISOR` | Team Leader |
| `USER` | Relacionador |

**Regla:** En código TypeScript/checks de permisos usar siempre los valores DB:
- ✅ `["USER", "SUPERVISOR"]` (no `["RELACIONADOR", "TEAM_LEADER"]`)
- Manager y superior: `["SUPER_ADMIN", "ADMIN", "MANAGER"]`
- Todo el staff: `["SUPER_ADMIN", "ADMIN", "MANAGER", "SUPERVISOR", "USER"]`

---

## 7. OBSERVABILIDAD Y MONITOREO

```bash
# Acciones lentas en tiempo real
pm2 logs elite-pass | grep "[slow-action]"

# Todas las métricas de Server Actions
pm2 logs elite-pass | grep "[server-action]"

# Top 10 acciones más lentas (últimas 1000 líneas)
pm2 logs elite-pass --lines 1000 --nostream | \
  grep "[server-action]" | \
  grep -o '"durationMs":[0-9]*' | \
  sort -t: -k2 -rn | head -10
```

### SLOs propuestos

| Endpoint | P95 | P99 |
|----------|-----|-----|
| Server Actions lectura | < 300 ms | < 800 ms |
| Server Actions escritura | < 500 ms | < 1500 ms |
| Dashboard stats | < 600 ms | < 1500 ms |
| QR validation | < 200 ms | < 500 ms |
| Export XLS | < 15 s | < 30 s |
| `/eventos` (CDN) | < 50 ms | < 150 ms |

---

## 8. OPTIMIZACIONES DE IMÁGENES Y WebP

### Estado actual — COMPLETAMENTE IMPLEMENTADO

#### 8.1 — Conversión automática a WebP en uploads [APLICADO]

**Archivo:** `src/lib/images/webp.ts` + `sharp ^0.34.5`

Todo archivo subido al sistema se convierte a WebP automáticamente antes de guardarse en Azure Blob Storage:

| Tipo | Configuración sharp | Resultado |
|------|--------------------|----|
| JPEG/JPG | `quality: 95, alphaQuality: 100, smartSubsample: true, effort: 6` | ~60-80% menos tamaño |
| PNG | `lossless: true, effort: 6` | Sin pérdida de calidad |
| Avatar | `resize(200,200,cover) quality:40 effort:6` | Thumbnail 200×200 optimizado |

```typescript
// src/lib/images/webp.ts
export async function convertImageBufferToWebp(input: Buffer, mimeType: string) {
  const image = sharp(input, { failOn: "none" }).rotate().withMetadata();
  if (lower === "image/png") return image.webp({ lossless: true, effort: 6 }).toBuffer();
  return image.webp({ quality: 95, alphaQuality: 100, smartSubsample: true, effort: 6 }).toBuffer();
}

export async function convertAvatarToWebp(input: Buffer) {
  return sharp(input).rotate().resize(200, 200, { fit: "cover" })
    .webp({ quality: 40, effort: 6, smartSubsample: true }).toBuffer();
}
```

**Aplica en:** `upload-actions.ts` (vouchers, avatars de usuario, avatars admin)
**También aplica en:** `organization-actions.ts`, `event-actions.ts`, `loyalty-actions.ts` y cualquier upload de imagen.

#### 8.2 — Next.js Image Optimization [APLICADO]

**Archivo:** `next.config.js`

```js
images: {
  formats: ["image/avif", "image/webp"], // entrega AVIF primero, WebP como fallback
  remotePatterns: [ /* Azure Blob, upload URL, Google avatars, reservas.genial-it.net */ ]
}
```

Next.js sirve imágenes en AVIF/WebP según lo que soporte el navegador, con cache de 60 días en nginx (`/_next/image`).

**20 componentes usan `next/image`** correctamente. Casos especiales con `priority`:
- `src/app/eventos/page.tsx` → `priority` en imagen principal ✅
- `src/app/eventos/[eventId]/page.tsx` → `priority` + `sizes="(max-width: 1024px) 100vw, 700px"` ✅
- `src/components/eventos/featured-carousel.tsx` → `priority={active === 0}` ✅
- `src/components/system/dashboard/upcoming-events.tsx` → `priority` + `sizes` ✅

**`AppImage` wrapper** con fallback automático a `/file.svg` en errores:
`src/components/shared/app-image.tsx`

#### 8.3 — Script de migración de imágenes existentes [DISPONIBLE]

**Archivo:** `scripts/convert-existing-images-to-webp.ts`

Convierte imágenes ya guardadas (JPEG/PNG) en Azure Blob Storage o local, actualiza las URLs en DB.
Modelos cubiertos: `Event` (image, bannerImage, paymentQR, ticketArt), `Organization` (logo, appIconUrl, appLogoUrl, coverImageUrl), `AppConfig`, `LoyaltyReward`, `Partner`, `Request` (paymentVoucherUrl).

```bash
# Ejecutar migración de imágenes existentes
cd /home/soporte/club-administrator
pnpm tsx scripts/convert-existing-images-to-webp.ts
```

#### 8.4 — Cache de imágenes en Nginx [APLICADO]

```nginx
# /_next/image — cache de imágenes optimizadas por Next.js
proxy_cache_valid 200 60d;
expires 1y;

# Archivos estáticos (ico, css, js, gif, jpg, png, svg, woff2)
proxy_cache_valid 200 7d;
expires 7d;
add_header Cache-Control "public, immutable";
```

#### 8.5 — Lazy loading en componentes públicos [APLICADO]

```tsx
// src/components/eventos/event-card-public.tsx
<NextImage loading="lazy" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
```

### Gaps de imágenes pendientes

| Gap | Archivo | Impacto |
|-----|---------|---------|
| `<img>` raw en QR payment | `src/components/external/qr-payment-display.tsx:69` | Menor — es un data URL de QR, no imagen pesada |
| Image en event-form sin `sizes` | `event-form-page.tsx:1544` — QR preview fill sin sizes | Menor — solo visible en formulario admin |
| Avatar quality 40 puede verse pixelado en pantallas > 200px | `webp.ts` | Cosmético — subir a 60-70 si hay quejas |
| Brotli en nginx no configurado | `/etc/nginx/nginx.conf` | **Media** — ~15-25% mejor que gzip |

---

## 9. NGINX — ESTADO REAL (verificado 2026-06-02)

**Archivo:** `/etc/nginx/sites-enabled/reservas.genial-it.net`

### Aplicado

| Feature | Estado | Detalle |
|---------|--------|---------|
| TLS 1.2 + 1.3 | ✅ | ssl_protocols TLSv1.2 TLSv1.3 |
| SSL session cache | ✅ | shared:SSL:10m, timeout 1d |
| Gzip | ✅ | nivel 6, tipos: text/plain text/css application/json application/javascript text/xml |
| Proxy cache `_next/static` | ✅ | 60 días, stale-while-updating |
| Proxy cache `_next/image` | ✅ | 60 días |
| Cache estáticos (css/js/img) | ✅ | 7 días, immutable |
| Cache `/uploads` | ✅ | 1 año, immutable |
| HTTP/2 | ✅ | listen 443 ssl http2 |
| WebSocket upgrade | ✅ | Upgrade/Connection headers |
| client_max_body_size | ✅ | 50MB |
| X-Real-IP forwarding | ✅ | para CrowdSec y logs |
| Microservicio pagos `/pagos-api/` | ✅ | proxy a 127.0.0.1:3100 |
| Dashboard pagos `/pagos-admin/` | ✅ | static Vite build |

### Gaps pendientes — fixes completos listos para aplicar

---

#### GAP-N1 — Brotli no configurado ⚠️ MEDIA

**Problema:** Solo gzip activo. Brotli comprime ~15-25% mejor para JS/CSS/HTML.

**Fix — paso 1: instalar módulo**
```bash
sudo apt install libnginx-mod-brotli
```

**Fix — paso 2: agregar en `/etc/nginx/nginx.conf` dentro de `http {}`**
```nginx
# Brotli (después del bloque gzip existente)
brotli on;
brotli_comp_level 6;
brotli_static on;
brotli_types
  text/plain
  text/css
  application/json
  application/javascript
  text/xml
  application/xml
  application/xml+rss
  text/javascript
  image/svg+xml
  font/woff2
  application/wasm;
```

**Fix — paso 3: reload**
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

#### GAP-N2 — X-Frame-Options conflicto ⚠️ SEGURIDAD

**Problema:** Nginx envía `X-Frame-Options: SAMEORIGIN` pero el middleware Next.js envía `DENY`. Los headers de nginx se añaden a la respuesta del proxy, por lo que el cliente puede recibir ambos o uno puede sobrescribir al otro dependiendo del proxy_pass.

**Archivo:** `/etc/nginx/sites-enabled/reservas.genial-it.net`

**Fix — eliminar los headers que ya maneja el middleware:**
```nginx
# ELIMINAR estas líneas del bloque server {}:
# add_header X-Frame-Options "SAMEORIGIN" always;       ← ya lo envía middleware con DENY
# add_header X-Content-Type-Options "nosniff" always;   ← ya lo envía middleware
# add_header X-XSS-Protection "1; mode=block" always;   ← obsoleto, ver GAP-N5
# add_header Referrer-Policy "strict-origin-when-cross-origin" always; ← ya lo envía middleware
# add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always; ← ya lo envía middleware con preload
```

El middleware Next.js ya cubre todos estos headers con valores más estrictos. Tenerlos duplicados en nginx puede causar que el navegador reciba el header dos veces.

**Excepción:** mantener en nginx solo los headers para rutas estáticas que nginx sirve directamente sin pasar por Next.js (como `/uploads` o `/pagos-admin/`):
```nginx
location /uploads {
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    # ... resto de la config
}
```

---

#### GAP-N3 — gzip_types incompleto ⚠️ MENOR

**Problema:** Falta `image/svg+xml`, `font/woff2`, `application/wasm` en la lista actual.

**Archivo:** `/etc/nginx/nginx.conf`

**Línea actual:**
```nginx
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

**Fix — reemplazar con:**
```nginx
gzip_types
  text/plain
  text/css
  application/json
  application/javascript
  text/xml
  application/xml
  application/xml+rss
  text/javascript
  image/svg+xml
  font/woff2
  application/wasm;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

#### GAP-N4 — Rate limit solo in-memory (PM2 cluster) ⚠️ ALTA

**Problema:** El rate limiter del middleware Next.js usa `globalThis.__edgeRateLimitStore` (un `Map` por proceso). Con PM2 cluster de 2 workers, el límite efectivo se duplica: un atacante puede hacer 2× el límite configurado sin ser bloqueado.

**Ejemplo actual:**
```
Worker 0: IP 1.2.3.4 → 20 req/min a /api/auth/ → no bloqueado (límite: 20)
Worker 1: IP 1.2.3.4 → 20 req/min a /api/auth/ → no bloqueado (límite: 20)
Total real permitido: 40 req/min para la misma IP
```

**Fix — agregar zonas `limit_req_zone` en `/etc/nginx/sites-enabled/reservas.genial-it.net`**

Añadir antes del primer bloque `server {}`:
```nginx
# Rate limiting zones — un estado compartido en nginx (fuera del bloque server)
limit_req_zone $binary_remote_addr zone=zone_auth:10m      rate=20r/m;
limit_req_zone $binary_remote_addr zone=zone_password:10m  rate=10r/m;
limit_req_zone $binary_remote_addr zone=zone_uploads:10m   rate=10r/m;
limit_req_zone $binary_remote_addr zone=zone_exports:10m   rate=5r/m;
limit_req_zone $binary_remote_addr zone=zone_api:10m       rate=30r/m;
limit_req_zone $binary_remote_addr zone=zone_qr:10m        rate=60r/m;
```

Dentro del bloque `server {}` (antes del `location /` general), agregar:
```nginx
    # Auth endpoints — 20 req/min, burst 5 sin delay
    location /api/auth/ {
        limit_req zone=zone_auth burst=5 nodelay;
        limit_req_status 429;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Password change — 10 req/min, burst 2
    location /api/users/password {
        limit_req zone=zone_password burst=2 nodelay;
        limit_req_status 429;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads — 10 req/min, burst 3
    location /api/uploads/ {
        limit_req zone=zone_uploads burst=3 nodelay;
        limit_req_status 429;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Exports — 5 req/min, burst 2
    location /api/exports/ {
        limit_req zone=zone_exports burst=2 nodelay;
        limit_req_status 429;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # QR — 60 req/min, burst 20
    location /api/qr/ {
        limit_req zone=zone_qr burst=20 nodelay;
        limit_req_status 429;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API general — 30 req/min, burst 10
    location /api/ {
        limit_req zone=zone_api burst=10 nodelay;
        limit_req_status 429;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```

**Nota:** los `location /api/...` más específicos deben ir ANTES del `location /` general en nginx.

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

#### GAP-N5 — X-XSS-Protection obsoleto ⚠️ MENOR

**Problema:** `X-XSS-Protection: 1; mode=block` está deprecado desde 2019. En IE/Edge antiguos podía introducir vulnerabilidades XSS secundarias. Los browsers modernos lo ignoran. La protección real la da el CSP (ya implementado en el middleware).

**Archivo:** `/etc/nginx/sites-enabled/reservas.genial-it.net`

**Fix — eliminar la línea:**
```nginx
# ELIMINAR:
add_header X-XSS-Protection "1; mode=block" always;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

### Estado de gaps (actualizado 2026-06-02)

| Gap | Estado | Detalle |
|-----|--------|---------|
| GAP-N1 — Brotli | ⚠️ Pendiente | Requiere `apt install libnginx-mod-brotli` — ver fix arriba |
| GAP-N2 — Headers duplicados | ✅ Aplicado 2026-06-02 | Eliminados del `server {}`, middleware Next.js los envía con valores más estrictos |
| GAP-N3 — gzip_types | ✅ Aplicado 2026-06-02 | `image/svg+xml`, `font/woff2`, `application/wasm` agregados en `nginx.conf` |
| GAP-N4 — Rate limit nginx | ✅ Aplicado 2026-06-02 | 6 zonas + 6 bloques `location /api/...` en site config |
| GAP-N5 — X-XSS-Protection | ✅ Aplicado 2026-06-02 | Eliminado junto con GAP-N2 |

**Verificar en cualquier momento:**
```bash
sudo nginx -t && curl -sI https://reservas.genial-it.net | grep -i "x-frame\|x-content\|strict\|content-security"
```

---

## 10. PWA Y NOTIFICACIONES PUSH

### Implementado

- **Service Worker:** Serwist `^9.5.7` — `src/app/sw.ts` → `public/sw.js`
- **Install prompt:** `src/components/pwa/install-prompt.tsx`
- **Manifest:** dinámico según `pwaEnabled` en `AppConfig`
- **Apple Web App:** splash screens múltiples, statusBarStyle black-translucent
- **Push subscriptions:** `src/hooks/use-push-notifications.ts`
- **Push service:** `src/lib/services/push-notification-service.ts`
- **Web Push:** `web-push ^3.6.7`
- **Notificaciones in-app:** modelo `Notification` en DB, `src/lib/actions/notifications.ts`
- **Trigger de push:** en `benefit-actions.ts` cuando se publica un beneficio se notifica a suscriptores

### Control PWA por org

`AppConfig.pwaEnabled` — si es `false`, el layout inyecta un script que desregistra el SW y limpia todos los caches al cargar.

---

## 11. DEPLOY

```bash
pnpm build && pm2 restart all && git push danny main
```

Servidor: `/home/soporte/club-administrator`
PM2 process name: `club-administrator`
Logs: `./logs/pm2-out.log`, `./logs/pm2-error.log`
