# Skill: Evaluador de Arquitectura, Diseño y Seguridad

## Propósito
Evalúa la aplicación ElitePass Mundial contra los 5 pilares de arquitectura, diseño y seguridad de software. Úsalo antes de cada sprint mayor o al integrar cambios estructurales.

## Los 5 Pilares de Evaluación

### PILAR 1 — Arquitectura y Cohesión
Verifica:
- `src/lib/` no contiene lógica de UI
- `src/app/api/` solo orquesta, no contiene lógica de negocio inline compleja
- `src/components/` no habla directo con `pool` de DB
- Las capas: UI → Context/Hook → API route → lib/* → DB
- `logSystem` y funciones cross-cutting NO viven en módulos de dominio (`mail.ts`)

Comandos de auditoría:
```bash
grep -rn "from.*db" src/components/ # UI hablando con DB → ALERTA
grep -rn "from.*pool" src/app/(app)/ # Páginas con acceso directo a DB → ALERTA
```

### PILAR 2 — Reglas de Diseño Simple (Kent Beck)
Verifica en orden de prioridad:
1. **Tests**: `find src -name "*.test.*" -o -name "*.spec.*"` — si vacío, el proyecto es "código de fe"
2. **Intención**: buscar `any[]` proliferado — pérdida de type-safety
3. **DRY/AHA**: `grep -rn "CREATE TABLE IF NOT EXISTS" src/` — si hay >2 hits del mismo nombre, duplicación peligrosa
4. **YAGNI**: DDL en routes de runtime en lugar de en `init.sql`

### PILAR 3 — DDD y Lenguaje Ubicuo
Términos canónicos de dominio en ElitePass Mundial:
- `prediction` (no `bet`, `apuesta`, `pronostico` mezclados)
- `match` (no `partido`, `game`)
- `leaderboard` (no `ranking`, `clasificacion` mezclados en endpoints)
- `company` (no `empresa`, `organization`)
- `role` preferible a `tipo` para claridad

Verificar inconsistencias:
```bash
grep -rn "apuesta\|pronostico\|partido\|empresa" src/app/api/ # mezcla de idiomas en contratos
```

### PILAR 4 — Seguridad OWASP

#### IDOR — Verificar ownership desde sesión
```bash
# Todo endpoint que usa :id debe verificar ownership desde JWT, no desde URL
grep -rn "searchParams.get\|params\." src/app/api/ | grep -v "user\.id"
```
- ✅ predictions POST: usa `user.id` del JWT
- ✅ profile POST: usa `user.id` del JWT
- ⚠️ predictions GET con `?matchId=X`: expone predicciones de TODOS los usuarios → revisar si es intencional

#### XSS
```bash
grep -rn "dangerouslySetInnerHTML" src/ # Solo 1 hit en layout.tsx con contenido estático → OK
grep -n "unsafe-inline" src/proxy.ts   # CSP tiene unsafe-inline → necesita nonces
```
- CSP `script-src 'self' 'unsafe-inline'` en producción → RIESGO ALTO
- `layout.tsx` usa `dangerouslySetInnerHTML` para SW registration (contenido estático) → OK

#### Leakage de información en errores
```bash
grep -rn "error\.message" src/app/api/ # En producción NO debe exponerse
```
Rutas con leakage activo: `users/route.ts`, `passkeys/route.ts`, `notifications/route.ts`, `profile/route.ts`, `settings/route.ts`

#### Rate Limiting
- ✅ Implementado en `src/proxy.ts` con límites por ruta
- ⚠️ Store in-memory: no funciona en cluster multi-proceso (cada proceso PM2 tiene su propio store → efectivamente 4x el límite)

### PILAR 5 — Estrategia de Despliegue
Estado actual: **Monolito Modular Next.js** → CORRECTO para el equipo
- Podman cluster: nginx-lb → app_1/app_2 → postgres
- SSE events no cruzan workers PM2 → workaround con polling 90s en AppContext

Verificar antes de escalar:
- Rate limiter necesita Redis para estado compartido entre workers
- SSE necesita Redis Pub/Sub para eventos cross-worker

## Hallazgos Críticos Registrados (2026-06-19)

| ID | Pilar | Severidad | Descripción | Estado |
|----|-------|-----------|-------------|--------|
| ARC-01 | 1 | MEDIO | `logSystem` en `mail.ts` — acoplamiento incorrecto | Pendiente |
| ARC-02 | 1 | MEDIO | `ensureNotificationsTables()` duplicada en 3+ routes | Pendiente |
| DES-01 | 2 | ALTO | CERO tests automatizados — proyecto "código de fe" | Pendiente |
| DES-02 | 2 | MEDIO | `any[]` proliferado: `notifications`, `matches`, `companies` | Pendiente |
| DES-03 | 2 | MEDIO | DDL runtime: 17 `CREATE TABLE IF NOT EXISTS` en 10+ API routes | Pendiente |
| SEC-01 | 4 | ALTO | `error.message` expuesto en 8+ rutas en producción | Pendiente |
| SEC-02 | 4 | ALTO | CSP `unsafe-inline` en scripts — invalida protección XSS | Pendiente |
| SEC-03 | 4 | MEDIO | Rate limiter in-memory no funciona en cluster multi-proceso | Pendiente |
| SEC-04 | 4 | BAJO | `dangerouslySetInnerHTML` en layout.tsx — contenido estático, bajo riesgo | Aceptado |
| DEP-01 | 5 | MEDIO | Rate limiter necesita Redis para cluster | Pendiente |

## Fixes Recomendados por Prioridad

### Inmediatos (Seguridad Alta)
```typescript
// SEC-01: Nunca exponer error.message en producción
catch (error: any) {
  console.error('[route] Error:', error);
  // ❌ return NextResponse.json({ error: error.message }, { status: 500 });
  // ✅
  return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
}

// SEC-02: CSP con nonce en lugar de unsafe-inline
// En proxy.ts — generar nonce por request y pasarlo como header
const nonce = crypto.randomUUID().replace(/-/g, '');
res.headers.set('x-nonce', nonce);
res.headers.set('Content-Security-Policy',
  `script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com; ...`
);
```

### Corto Plazo (Calidad)
```typescript
// ARC-01: Mover logSystem a src/lib/logger.ts
// ARC-02: Mover DDL de tables a init.sql — eliminar ensureXxxTable() de runtime

// DES-01: Instalar vitest y crear tests mínimos para lib/validation.ts
// pnpm add -D vitest @vitejs/plugin-react
```

### Mediano Plazo (Escalabilidad)
```typescript
// DEP-01 + SEC-03: Rate limiter con Redis
import { Redis } from 'ioredis';
// Reemplazar el store Map<> por Redis con TTL
```
