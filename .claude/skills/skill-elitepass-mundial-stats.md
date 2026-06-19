---
name: skill-elitepass-mundial-stats
description: >
  Sistema de logging de eventos de usuario y dashboard de estadísticas
  en elitepass-mundial. Documenta las tablas system_logs y audit_logs,
  el helper logSystem(), las categorías de eventos, el API /api/admin/stats
  y el componente StatsTab. Invocar cuando se trabaje en logs, auditoría
  o estadísticas de uso en mundial.genial-it.net.
---

# ELITEPASS MUNDIAL — Logs de Eventos y Estadísticas de Uso

## 1. Tablas de base de datos

### `system_logs` — Eventos generales del sistema

```sql
CREATE TABLE system_logs (
  id        SERIAL PRIMARY KEY,
  nivel     VARCHAR(20),   -- 'info' | 'warn' | 'error'
  categoria VARCHAR(100),  -- ver sección 3
  mensaje   TEXT,          -- descripción legible del evento
  detalles  TEXT,          -- contexto adicional (opcional)
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
-- Se purgan automáticamente los registros > 90 días
```

### `audit_logs` — Acciones privilegiadas de superadmin

```sql
CREATE TABLE audit_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(255) NOT NULL,  -- código de acción (ej: SUPERADMIN_PREDICTION_EDIT)
  details    TEXT,                   -- descripción con nombres completos (no IDs)
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Regla crítica:** Los detalles de audit_logs deben mostrar **nombres completos** de personas y partidos, nunca IDs numéricos. Si se necesita el nombre del usuario afectado, hacer un `SELECT nombre FROM users WHERE id = $1` antes de insertar.

---

## 2. Helper `logSystem()`

**Ubicación:** `src/lib/mail.ts` (exportada junto a sendMail)

```typescript
import { logSystem } from '@/lib/mail';

// Firma
logSystem(nivel: string, categoria: string, mensaje: string, detalles?: string): Promise<boolean>

// Uso — fire-and-forget (no bloquear la respuesta)
logSystem('info', 'PRONOSTICO', `${user.nombre} registró pronóstico`, `Argentina vs Brasil: 2-1`).catch(() => {});

// Uso — await cuando el resultado importa
await logSystem('warn', 'USUARIO', `${user.nombre} eliminó usuario ${nombre}`, `Email: ${email}`);
```

**Regla:** Siempre usar `.catch(() => {})` en fire-and-forget para no romper el flujo principal si la DB falla.

---

## 3. Categorías de eventos (`categoria`)

| Categoría | Nivel típico | Qué registra |
|---|---|---|
| `ACCESO` | info | Login exitoso, cierre de sesión |
| `REGISTRO` | info | Auto-registro de nuevo usuario (pendiente de aprobación) |
| `PRONOSTICO` | info / warn | Registrar, editar, guardar en lote pronósticos |
| `USUARIO` | info / warn | Crear, editar, aprobar, denegar, eliminar usuarios |
| `PARTIDO` | info | Crear o editar un partido (solo admin/superadmin) |
| `PERFIL` | info | Edición de perfil propio (nombre, avatar, contraseña, teléfono) |
| `MENSAJE` | info | Envío de notificaciones/mensajes a usuarios |
| `NOTIFICACION` | info | Usuario marca notificaciones como leídas |

### Ejemplos de mensajes bien formados

```
ACCESO    info  "María García ingresó a la plataforma"         "Email: maria@empresa.com"
ACCESO    info  "Juan López cerró sesión"
REGISTRO  info  "Nuevo auto-registro: Pedro Quispe"            "Email: pedro@empresa.com"
PRONOSTICO info "María García registró pronóstico"             "Argentina vs Brasil: 2-1"
PRONOSTICO info "Juan López editó pronóstico"                  "Uruguay vs Francia: 1-0 → 1-1"
PRONOSTICO info "Juan López guardó 8 pronóstico(s) en lote"
PRONOSTICO warn "Admin Juan editó pronóstico de María García"  "Argentina vs Brasil | Anterior: 2-1 → Nuevo: 3-0"
USUARIO   info  "Admin Juan creó usuario Pedro Quispe"         "Email: pedro@empresa.com | Rol: externo"
USUARIO   info  "Admin Juan aprobó a Pedro Quispe"
USUARIO   warn  "Admin Juan denegó a Pedro Quispe"
USUARIO   warn  "Admin Juan eliminó usuario Pedro Quispe"      "Email: pedro@empresa.com"
PARTIDO   info  "Admin Juan editó partido Argentina vs Brasil"  "Estado: finished | Marcador: 2-1"
PERFIL    info  "María García editó su perfil"                  "Cambios: nombre, avatar"
MENSAJE   info  'Admin Juan envió mensaje: "Bienvenidos"'       "Destinatario: todos"
```

---

## 4. Dónde se registran los eventos (rutas)

| Ruta | Evento |
|---|---|
| `POST /api/auth` | Login |
| `DELETE /api/auth` | Logout |
| `POST /api/auth/register` | Auto-registro |
| `POST /api/predictions` — usuario regular | Pronóstico creado/editado |
| `POST /api/predictions` — lote | Pronósticos en lote |
| `POST /api/predictions` — superadmin | Edición admin → también escribe en audit_logs |
| `POST /api/admin/users` — create | Usuario creado por admin |
| `POST /api/admin/users` — approve | Usuario aprobado |
| `POST /api/admin/users` — deny | Usuario denegado |
| `POST /api/admin/users` — editUser | Usuario editado |
| `DELETE /api/admin/users` | Usuario eliminado |
| `POST /api/matches` | Partido creado o editado |
| `POST /api/profile` | Perfil editado |
| `POST /api/notifications` | Mensaje enviado |
| `POST /api/notifications/read` | Notificaciones marcadas como leídas |

---

## 5. API de estadísticas

**Ruta:** `GET /api/admin/stats?days=30`  
**Auth:** Solo `superadmin`  
**Parámetros:** `days` = 7 | 30 | 90 (default: 30)

### Respuesta

```typescript
{
  overview: {
    totalUsers: number,         // usuarios activos
    totalPredictions: number,   // pronósticos totales
    finishedMatches: number,    // partidos finalizados
    totalEvents: number,        // eventos en el período
    todayLogins: number,        // ingresos últimas 24h
  },
  dailyEvents: Array<{          // eventos por día
    date: string,               // 'YYYY-MM-DD' (Bolivia)
    total: number,
    acceso: number, pronostico: number, usuario: number,
    mensaje: number, registro: number, partido: number,
    perfil: number, notificacion: number,
  }>,
  byCategory: Array<{ categoria: string, count: number }>,
  predictionsPerMatch: Array<{
    label: string, local: string, visitante: string,
    fase: string, estado: string, count: number,
    score: string | null,
  }>,
  topUsers: Array<{
    nombre: string, predictions: number, puntos: number, posicion: number
  }>,
  newUsers: Array<{ date: string, count: number }>,
  loginsByHour: Array<{         // siempre 24 elementos (h=0..23)
    hour: number, label: string, count: number
  }>,
  predBeforeMatch: Array<{      // anticipación al apostar
    bucket: string,             // '< 1h' | '1–6h' | '6–24h' | '1–2 días' | '2–5 días' | '5+ días' | 'Post-partido'
    count: number,
  }>,
  messageStats: {
    totalSent: number,
    totalLeidas: number,
    globalReadPct: number,      // 0-100
    byType: Array<{ tipo: string, sent: number, leidas: number, pct: number }>,
  },
}
```

---

## 6. Componente StatsTab

**Ubicación:** `src/components/admin/StatsTab.tsx`  
**Acceso:** Solo `superadmin`, tab "Estadísticas" en `/admin`  
**Librería de gráficos:** `recharts@3.8.1` (cargada con `next/dynamic`, `ssr: false`)

### Secciones del dashboard

| Sección | Gráfico | Datos |
|---|---|---|
| Cards de resumen | — | 5 métricas clave + filtro de período |
| Actividad Diaria | LineChart | Líneas por categoría, filtrables con toggle |
| Eventos por Categoría | PieChart + barras | % de distribución con colores por categoría |
| Nuevos Usuarios | BarChart | Registros por día en el período |
| Pronósticos por Partido | Barras horizontales CSS | Top 15 partidos, con marcador real si está disponible |
| Top Usuarios | BarChart horizontal | Pronósticos + Puntos, mobile usa lista compacta |
| Ingresos por Hora | BarChart (0–23h) | Colores por franja (mañana/tarde/noche), mobile usa heatmap 24 celdas |
| Anticipación al apostar | BarChart por bucket | Distribución de cuándo los usuarios hacen pronósticos antes del partido |
| Estadísticas de Mensajes | Cards + barras | Enviados vs leídos, tasa global, desglose por tipo |

### Colores por categoría (constante `CATEGORY_COLORS`)

```typescript
ACCESO: '#eab308'       // amarillo
PRONOSTICO: '#22c55e'   // verde
USUARIO: '#3b82f6'      // azul
MENSAJE: '#a855f7'      // morado
REGISTRO: '#f97316'     // naranja
PARTIDO: '#ef4444'      // rojo
PERFIL: '#06b6d4'       // cyan
NOTIFICACION: '#ec4899' // rosa
```

---

## 7. Patrón para agregar nuevos eventos

Al implementar una nueva acción que deba aparecer en los logs:

1. **Definir la categoría** — usar una existente si encaja, o crear una nueva (en mayúsculas)
2. **Importar el helper** en la ruta correspondiente:
   ```typescript
   import { logSystem } from '@/lib/mail';
   ```
3. **Llamar después de la operación exitosa** (nunca antes):
   ```typescript
   logSystem('info', 'NUEVA_CAT', `${user.nombre} hizo X`, `Contexto: Y`).catch(() => {});
   ```
4. **Si la nueva categoría necesita un color propio** en el dashboard, agregar a `CATEGORY_COLORS` y `CATEGORY_LABELS` en `StatsTab.tsx`
5. **Si la nueva categoría necesita aparecer en la query diaria** del API, agregar la columna en `dailyEventsRes` en `/api/admin/stats/route.ts`

---

## 8. Sesión — Sliding Window

Implementado en `GET /api/auth` (v1.1.79+):

```typescript
// Cada vez que el cliente verifica la sesión, se renueva el JWT/cookie
await setSession({ id, nombre, email, tipo, avatar });
```

- TTL: 7 días (`SESSION_TTL_SECONDS = 604800`)
- Efecto: mientras el usuario use la app, nunca se desconecta
- Si no abre la app por 7 días, la sesión expira y debe volver a loguearse

---

## 9. Versiones de implementación

| Versión | Cambio |
|---|---|
| v1.1.79 | Logs de eventos (ACCESO, REGISTRO, PRONOSTICO, USUARIO, PARTIDO, PERFIL, MENSAJE, NOTIFICACION) + fix nombres en audit_logs + sliding session |
| v1.1.80 | Dashboard StatsTab con 5 gráficos básicos |
| v1.1.81 | Estadísticas avanzadas: ingresos por hora, anticipación pronósticos, lectura de mensajes |
| v1.1.82 | Tablas admin → tarjetas en mobile (LogsTab, PwaTab, PaymentsTab) |
