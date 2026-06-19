---
name: skill-elitepass-design
description: >
  Directrices de diseño UI/UX para ElitePass (Genial-it). Standard de diseño compartido
  entre reservas y POS: system fonts, colores reservas como source of truth, animaciones
  consistentes. Optimización PageSpeed y WebP avatars.
---

# ELITEPASS - DISEÑO, UI/UX Y RENDIMIENTO (FRONTEND)

## 0. ESTÁNDAR VISUAL ECOSISTEMA (2026-06-10)

**Regla:** Todas las apps del ecosistema ElitePass deben compartir el mismo design language.
**Source of truth:** `elitepass-reservas` define la paleta, tipografía y tokens base.
`elitepass-pos` y futuras apps deben replicar el estilo visual de reservas.

### Tipografía estándar
```css
font-family: "Segoe UI", "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif;
font-mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
```
**Prohibido:** importar Google Fonts (Inter, Space Grotesk, etc.) — usar system fonts siempre.

### Paleta de colores (modo claro — source: reservas globals.css)
```
--background: oklch(1 0 0)          → #ffffff
--foreground: oklch(0.145 0 0)      → #1a1a1a
--card: oklch(1 0 0)                → #ffffff
--border: oklch(0.922 0 0)          → #e5e7eb
--muted: oklch(0.97 0 0)            → #f5f5f5
--primary: oklch(0.205 0 0)         → #333333
--secondary: oklch(0.97 0 0)        → #f5f5f5
```

### Paleta de colores (modo oscuro — source: reservas .dark)
```
--background: oklch(0.145 0 0)      → #1a1a1a
--foreground: oklch(0.985 0 0)      → #fafafa
--card: oklch(0.205 0 0)            → #333333
--border: oklch(1 0 0 / 10%)        → rgba(255,255,255,0.1)
--muted: oklch(0.269 0 0)           → #444444
```

### Border radius
```css
--radius: 0.625rem;  /* 10px — estándar en todo el ecosistema */
```

### Animaciones (animaciones de página y modales)
```css
@keyframes page-enter { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
@keyframes modal-enter { from { opacity:0; transform:translateY(10px) scale(0.98) } to { opacity:1; transform:none scale(1) } }
/* .ui-page-stage > * { animation: page-enter 220ms ease-out } */
```

### Tokens de estado (modo claro — legible sobre fondos claros)
```css
--status-success: bg #f0fdf4, border #bbf7d0, text #166534
--status-warning: bg #fffbeb, border #fde68a, text #92400e
--status-danger:  bg #fef2f2, border #fecaca, text #b91c1c
--status-info:    bg #f5f3ff, border #ddd6fe, text #5b21b6
```

### Reglas de aplicación
- **POS**: Mantiene Tailwind 3 + CSS variables `--surface-*` (nomenclatura propia), pero alinea valores al rango visual de reservas en modo claro.
- **Reservas**: Tailwind 4 + `@theme inline` + oklch.
- **Identity**: Dark theme fijo (panel de administración).
- Cualquier nueva app debe usar system fonts y la paleta de reservas como base.

---

## 1. Filosofía de Diseño (Estética Neutral)
- **Eliminación del estilo "Cyber":** Los estilos neón, colores azules invasivos o tintes púrpuras están completamente erradicados del sistema global.
- **Tokens Neutrales ("Zinc" / Acromático):** El sistema base se rige por una paleta acromática. Los acentos de color se reservan exclusivamente para estados semánticos (ej: Destructive=Rojo, Success=Verde, BulkAction=Amber) o para la marca de la organización.
- **Tipografía Limpia:** No usar fuentes personalizadas de carga lenta. Utilizar fuentes del sistema nativas (`system-ui`, `Segoe UI`, `Inter`, etc.) para reducir el TTFB y layout shifts.
- **Fuentes de Iconos:** Uso local de `Material Symbols Outlined` cargado desde `/fonts/material-symbols-outlined.ttf` con configuraciones tipográficas consistentes (`opsz 24`, `wght 600`, `FILL 0`).

## 2. Paleta OKLCH y Estructura Visual (Tailwind CSS v4)
- **Esquema de Colores (OKLCH):**
  - `--background`: `oklch(1 0 0)` (Claro) | `oklch(0.145 0 0)` (Oscuro)
  - `--foreground`: `oklch(0.145 0 0)` (Claro) | `oklch(0.985 0 0)` (Oscuro)
  - `--card`: `oklch(1 0 0)` (Claro) | `oklch(0.205 0 0)` (Oscuro)
  - `--primary`: `oklch(0.205 0 0)` (Claro) | `oklch(0.922 0 0)` (Oscuro)
  - `--secondary`: `oklch(0.97 0 0)` (Claro) | `oklch(0.269 0 0)` (Oscuro)
  - `--border` / `--input`: `oklch(0.922 0 0)` (Claro) | `oklch(1 0 0 / 10%)` / `oklch(1 0 0 / 15%)` (Oscuro)
  - `--destructive`: `oklch(0.577 0.245 27.325)` (Claro) | `oklch(0.704 0.191 22.216)` (Oscuro)
- **Derived Border Radii:** Base `--radius: 0.625rem` (10px). Derived: `radius-sm` (6px), `radius-md` (8px), `radius-lg` (10px), `radius-xl` (14px), `radius-2xl` (18px), `radius-3xl` (22px), `radius-4xl` (26px). Avatares siempre circulares (`rounded-full`).
- **Escala de Espaciado (Base 4px):** `xs` (4px), `sm` (8px), `md` (16px), `lg` (32px), `xl` (64px). Padding estándar de tarjetas y layouts es 24px (lg).
- **Interactive Map Canvas Colors:**
  - Fondo Canvas: `#0b1220`
  - Disponible: `#16a34a` (tableAvailable)
  - Pendiente: `#ca8a04` (tablePending)
  - Pago en Proceso: `#2563eb` (tablePendingPayment)
  - Ocupado: `#dc2626` (tableOccupied)
  - Borde de Mesa: `#0f172a` (stroke), `#f8fafc` (selected)
- **Clases de Estados y Componentes (`design-tokens.ts`):**
  - *Status Badges:* PENDING (bg-amber-100 / text-amber-800), OBSERVED (bg-orange-100 / text-orange-800), PRE_APPROVED (bg-blue-100 / text-blue-800), APPROVED (bg-emerald-100 / text-emerald-800), REJECTED (bg-red-100 / text-red-800).
  - *Tiers de Lealtad:* BRONZE (bg-orange-100 / text-orange-800), SILVER (bg-slate-100 / text-slate-800), GOLD (bg-yellow-100 / text-yellow-800), BLACK (bg-zinc-900 / text-white).
  - *Event Availability Badges:* PREVENTA (bg-blue-100 / text-blue-700), DISPONIBLE (bg-green-100 / text-green-700), ULTIMOS_CUPOS (bg-amber-100 / text-amber-700), AGOTADO (bg-red-100 / text-red-700), FINALIZADO (bg-gray-100 / text-gray-600).

## 3. Comportamiento Responsivo y Adaptación PWA
- **Breakpoints:** Estructurados bajo los defaults de Tailwind (`sm: 640px`, `md: 768px`, `lg: 1024px`, etc.).
- **Safe Areas & Notch Support:**
  - `.system-layout` e inset del layout general: `padding-top: env(safe-area-inset-top)`, `padding-left: env(safe-area-inset-left)`, `padding-right: env(safe-area-inset-right)`.
  - `.system-bottom-nav` de navegación inferior: `padding-bottom: env(safe-area-inset-bottom)`.
- **Media Queries para PWA Standalone:**
  - `@media (display-mode: standalone)` -> `.system-content` tiene `padding-bottom: calc(5.5rem + env(safe-area-inset-bottom))`.
  - `@media (max-width: 767px)` -> En vistas móviles con navegación inferior, la separación es `padding-bottom: calc(5.75rem + env(safe-area-inset-bottom))`.
  - `@media (max-width: 767px) and (display-mode: standalone)` -> `.system-sidebar-inset { margin-left: 0 !important; }` y `[data-slot="sidebar"] { display: none !important; }`.

## 3.1 Tablas en Vistas Móviles — Regla de No Scroll Horizontal

**Regla obligatoria:** Ninguna tabla (`<table>`) debe requerir scroll horizontal en mobile (`< 640px`).

### Patrón estándar: tabla en desktop / tarjetas en mobile

```tsx
{/* Desktop: tabla completa */}
<div className="hidden sm:block overflow-x-auto">
  <table className="w-full text-left border-collapse text-xs">
    <thead>...</thead>
    <tbody>...</tbody>
  </table>
</div>

{/* Mobile: tarjetas apiladas */}
<div className="sm:hidden divide-y divide-neutral-900">
  {items.map(item => (
    <div key={item.id} className="p-3 space-y-1.5">
      {/* Fila superior: dato principal + badge de estado */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-neutral-200 truncate">{item.nombre}</span>
        <span className="badge">{item.estado}</span>
      </div>
      {/* Datos secundarios */}
      <p className="text-[10px] text-neutral-500">{item.detalle}</p>
      {/* Fecha al pie */}
      <p className="text-[9px] text-neutral-600 font-mono">{item.fecha}</p>
    </div>
  ))}
</div>
```

### Reglas de la tarjeta mobile

| Elemento | Regla |
|---|---|
| Dato principal | `font-bold text-neutral-200`, truncate si puede ser largo |
| Estado/badge | `flex-shrink-0` para que nunca se comprima |
| Montos | Grid de 3 columnas con `grid grid-cols-3` para Cuota / Pagado / Saldo |
| Botones de acción | `flex-1` para que ocupen ancho completo dividido |
| Fecha | `text-[9px] text-neutral-600 font-mono` al pie de la tarjeta |
| Avatar | `w-9 h-9 rounded-full flex-shrink-0` siempre a la izquierda |

### Apps donde aplica
- **elitepass-mundial:** LogsTab, PwaTab, PaymentsTab ya implementados (v1.1.82)
- **elitepass-pos, elitepass-reservas:** aplicar el mismo patrón en cualquier tabla con más de 3 columnas

### Lo que NO se debe hacer
- `overflow-x-auto` en mobile sin fallback de tarjetas
- Tablas con más de 3 columnas visibles en `< 640px`
- Texto en `font-mono` de más de 20 caracteres sin `truncate` en mobile

---

## 4. Persistencia de Preferencias y Personalización
- **Temas:** Persistencia mediante `next-themes` utilizando la clase `dark` e inyección vía `ThemeProvider`. Persistido automáticamente en localStorage bajo la clave `theme`.
- **Configuraciones de la UI y Cache local (LocalStorage):**
  - `pwa-dismissed`: Evita mostrar el prompt de instalación PWA si el usuario lo descartó (`1`).
  - `stats-mode:${storageKey}`: Guarda la vista y filtros del dashboard analítico.
  - `pwa-credential-data`: Guarda en caché local los datos de la credencial digital para permitir su visualización sin conexión.
  - `passkey-onboarding-prompt`: Evita sugerir repetidamente el enrolamiento de passkeys si se marcó como descartado (`1`).
- **Personalización de Credenciales (Base de Datos):**
  - La tabla `VirtualCredentialPreference` guarda la personalización de la credencial virtual del usuario relacionador: `backgroundPrimaryColor` (default `#000428`), `backgroundSecondaryColor` (default `#004e92`), `textColor` (default `#f1f1f1`), `customCompanyName` y `customCompanyLogoUrl` (almacenado en Azure Blob).
  - Al actualizarse, se invalida el cache de Next.js mediante `revalidatePath("/relacionadores/actividad")`.

## 5. Rendimiento (PageSpeed)
- **Conversión a WebP Obligatoria:** Todas las imágenes subidas por usuarios se convierten a WebP vía `sharp` antes de ser persistidas en Azure Blob Storage.
- **Avatares y Fallbacks:** Los avatares de usuario convertidos a WebP deben incluir un fallback a `DiceBear` (avatares generados algorítmicamente) si el usuario no proporciona imagen.
- **Next Image:** Usar `next/image` con formatos prioritarios AVIF y WebP (`formats: ["image/avif", "image/webp"]`). Asegurar propiedades `priority` y `sizes` en imágenes sobre el pliegue (LCP).
- **Streaming Boundaries:** Implementar siempre `loading.tsx` y `error.tsx` con skeletons para partes pesadas de la UI, garantizando un renderizado inicial ultra-rápido (< 100ms percibido).
- **Lazy Loading:** Librerías pesadas como `html5-qrcode` o gráficas complejas deben ser importadas dinámicamente (`await import()`) solo cuando el usuario las interactúe.
