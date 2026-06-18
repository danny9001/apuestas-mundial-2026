# ElitePass — Plataforma de Pronósticos Mundial 2026

**ElitePass** es una Progressive Web App (PWA) de alto rendimiento para gestión de pronósticos y quinielas del Mundial de Fútbol 2026. Diseñada para grupos de empresas privadas con rankings por equipo, notificaciones push en tiempo real y experiencia móvil nativa instalable.

🌐 **Producción**: [https://mundial.genial-it.net](https://mundial.genial-it.net)

---

## Características Principales

- **Multi-empresa** — Rankings privados y configuración de apuestas independiente por empresa
- **Modos de apuesta parametrizables** — Por partido, en bloque o por fase (definido por empresa)
- **Marcadores en tiempo real** — Sincronización automática de resultados vía API FIFA
- **Notificaciones push (Web Push API)** — Avisos de partidos próximos, goles y rankings semanales
- **PWA instalable** — Funciona como app nativa en iOS y Android sin pasar por tiendas
- **Panel de administración** — Tres sub-paneles: Usuarios, Empresa, Mensajes
- **Scheduler automático** — Proceso PM2 dedicado: avisos de partidos (cada hora) y rankings (lunes)
- **Modo TV** — Pantalla de aeropuerto con split-flap animado para proyección en pantallas grandes
- **Vista Planilla (Excel)** — Ingreso masivo de pronósticos estilo hoja de cálculo
- **Bracket eliminatorio** — Visualización del árbol de eliminación directa del torneo

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| Lenguaje | TypeScript |
| Base de datos | PostgreSQL 15 |
| Estilos | Tailwind CSS (dark-first) |
| Autenticación | JWT + cookies HttpOnly |
| Push | Web Push API (VAPID) |
| Email | Microsoft Graph API |
| Proceso background | PM2 — `scheduler.js` |
| Servidor | VPS Azure Ubuntu + PM2 (puerto 3002) |

---

---

## 🌟 Características Destacadas e Innovaciones

La plataforma ofrece una experiencia moderna de alto impacto visual y funcional tanto para dispositivos móviles como para computadores de escritorio:

### 1. 💻 Versión de Escritorio (Widescreen Responsive Dashboard)
*   **Mobile-First Adaptativo**: En celulares, la app muestra un menú táctil inferior fijo y una distribución vertical pensada para el uso cómodo con una sola mano.
*   **Widescreen Split-Screen**: En computadoras o tabletas (resolución `md:` y superior), la navegación inferior se oculta y es reemplazada por un **elegante menú lateral izquierdo (sidebar)**. El contenido principal se expande fluidamente en grillas anchas para aprovechar todo el monitor.

### 2. 🌳 Fixture del Mundial (Knockout Stage Bracket Tree)
*   **Sección Interactiva**: Una nueva pestaña principal visualiza la fase de eliminación directa completa (Octavos de Final, Cuartos de Final, Semifinales y la Gran Final de la Copa del Mundo).
*   **Diseño Conectado**: Utiliza un bracket adaptativo con tarjetas *glassmorphic* conectadas visualmente, mostrando las sedes emblemáticas (MetLife Stadium, NY/NJ) y fechas de juego, las cuales se sincronizan dinámicamente con los partidos registrados en la base de datos.
*   **Fácil Acceso**: El ícono del podio general en el menú fue actualizado al gráfico de barras (`BarChart3`), reservando el trofeo (`Trophy`) para el fixture de la Copa Mundial.

### 3. 📂 Partidos Restantes por Grupo (Agrupamiento Dinámico)
*   **Filtros Inteligentes**: Se incorporó el conmutador `"📂 Agrupar por Grupo"` en la barra de búsqueda de partidos.
*   **Organización de Cartelera**: Al activarse, la interfaz filtra y agrupa automáticamente los encuentros que faltan por disputar (`estado = 'upcoming'`), organizándolos bajo cabeceras estilizadas para cada grupo (`GRUPO A`, `GRUPO B`, etc.) con recuentos en vivo del torneo.

### 4. 📝 Registro de Usuarios Autónomo
*   **Formulario Dinámico**: El Splash Screen inicial ahora cuenta con un toggle intuitivo para alternar entre "Iniciar Sesión" y "Registrarse".
*   **Campos Seguros**: Los nuevos usuarios pueden introducir su nombre completo, correo electrónico y contraseña (con validación de longitud).
*   **Automatización de Registro**: Al registrarse, el backend encripta la contraseña usando `bcryptjs`, genera un avatar único animado de Dicebear y realiza una recalculación PL/pgSQL instantánea de la tabla de clasificación.
*   **Sesiones Seguras**: Al completar el registro, se crea automáticamente una cookie segura HttpOnly base64, iniciando sesión sin pasos adicionales.

### 5. 📊 Resumen Detallado y Estadísticas del Partido (ESPN Style)
*   Al hacer clic en cualquier tarjeta o fila de partido, se despliega una **pantalla de resumen e información analítica**.
*   **Estadísticas de Juego**: Compara la Posesión de Balón, Remates Totales y Faltas de cada selección en barras de progreso personalizadas con acentos dorados de alta gama.
*   **Apuestas de la Comunidad en Directo**: Realiza llamadas dinámicas al backend para listar en tiempo real todos los pronósticos colocados por otros participantes (con nombres y avatares). Si el partido ya finalizó, muestra cuántos puntos acumuló cada jugador por su predicción, permitiendo comparar los resultados con el resto de la quiniela.

### 6. 📉 Llenado Rápido Tipo Planilla (Excel-Style Grid)
*   **Vista Alternativa**: Un selector interactivo te permite alternar entre la vista tradicional de tarjetas y la **Vista Planilla (Excel)**.
*   **Edición Compacta**: Convierte la cartelera de partidos en una hoja de cálculo. Puedes ingresar todos tus pronósticos directamente en las celdas usando el teclado numérico de forma fluida.
*   **Celdas Protegidas (Kickoff Lock)**: Los encuentros que ya están en vivo o finalizados bloquean y deshabilitan automáticamente sus inputs con un candado de seguridad para evitar apuestas fuera de tiempo.
*   **Guardado por Lote (Batch Submissions)**: Mientras editas la planilla, un panel flotante dinámico se despliega en la esquina inferior: **"Planilla de Cambios (N Modificados)"**. Al hacer clic en **"Guardar Planilla"**, el sistema realiza una única petición masiva, optimizando la red y actualizando tu perfil en segundos.

### 7. 📺 Pantalla de Aeropuerto / Modo TV (`/tv`)
*   Diseñada para proyección estática y pantallas gigantes, cicla automáticamente cada 10 segundos entre la tabla de posiciones general (Top 20), los partidos en vivo y los próximos encuentros.
*   Incorpora el efecto **Split-Flap Display**, simulando mecánicamente el volteo de tarjetas de aeropuertos cuando cambian las puntuaciones o nombres con la tipografía monospaciada `JetBrains Mono`.
*   Pulsaciones de ráfaga y visualizador de gol ante eventos live de ESPN.

---

## 🎨 Sistema de Diseño Google Stitch

La interfaz de usuario sigue estrictamente el manifiesto visual de **Modern Dark Minimalism** con glassmorphism:

*   **Fondo Obsidiana (`#131315`)**: Una superficie profunda de alto contraste diseñada para la legibilidad en condiciones de baja iluminación o luces de estadio.
*   **Botones Primarios Dorados (`#ffd165` a `#eab308`)**: Los botones principales implementan un degradado lineal dorado-ámbar, un borde shimmer dorado de 1px y sombras difusas doradas en estado hover.
*   **Inputs Elegantes (`.input-stitch`)**: Cajas de texto con radio de 8px, fondo negro profundo y una transición dinámica que aplica bordes dorados e iluminación difusa de 4px al recibir el foco.
*   **Escarapelas de Banderas Circulares**: Las banderas de los equipos se encapsulan en esferas circulares con sombras internas hundidas (`shadow-inner rounded-full`) para simular medallones físicos inyectados en la tarjeta.
*   **Menú de Píldora Flotante**: En la navegación móvil, los iconos activos se realzan con una píldora dorada translúcida flotando en el fondo con animaciones suaves de pulso.

---

## Despliegue en Producción

```bash
# Instalar dependencias
npm install

# Build de producción
npm run build

# Iniciar con PM2 (aplicación + scheduler)
pm2 start ecosystem.config.js --env production

# Ver estado de los procesos
pm2 list
# mundial-2026      → Next.js en puerto 3002
# mundial-scheduler → Notificaciones automáticas
```

## Variables de Entorno

Crear `.env.local` con:

```env
DATABASE_URL=postgres://user:pass@127.0.0.1:5432/apuestas_mundial
JWT_SECRET=...
SCHEDULER_SECRET=...
APP_BASE_URL=https://tu-dominio.com
PORT=3002
NODE_ENV=production

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Email via Microsoft Graph
MAIL_GRAPH_ENABLED=true
MAIL_GRAPH_CLIENT_ID=...
MAIL_GRAPH_CLIENT_SECRET=...
MAIL_GRAPH_TENANT_ID=...
MAIL_GRAPH_USER_EMAIL=notifica@dominio.com
MAIL_GRAPH_BCC=admin@dominio.com
```

## Roles de Usuario

| Rol | Permisos |
|-----|---------|
| `superadmin` | Control total: empresas, usuarios, partidos, personalización del sistema |
| `admin` | Gestiona sus empresas: usuarios, modo de apuesta, mensajes a su grupo |
| `user` | Registra pronósticos, consulta ranking de su empresa, recibe notificaciones |

## Modos de Apuesta por Empresa

Configurables por empresa desde el panel de administración:

| Modo | Descripción |
|------|-------------|
| `partido` | Cada usuario apuesta libremente partido a partido |
| `bloque` | Se apuesta todo de una sola vez antes de iniciar la fase |
| `fase` | Las apuestas se habilitan al inicio de cada fase del torneo |

## Notificaciones Automáticas

El proceso `scheduler.js` corre como daemon PM2 y ejecuta:

- **Cada hora** — Detecta partidos en las próximas 24h y envía push + notificación in-app a todos los usuarios activos
- **Lunes 8:00 AM** — Envía ranking top-3 de cada empresa a sus miembros
- **Deduplicación** — La tabla `scheduled_notify_log` evita reenvíos

El endpoint `POST /api/admin/notify-scheduled` también permite disparo manual desde el panel Mensajes del superadmin.

### Timing de Notificaciones (Verificado 2026-06-18)

✅ **Verificación de Sistema Completada**

| Evento | Timing | Estado |
|--------|--------|--------|
| Entrada de Scores (Admin) | Sin restricción | ✅ Permitida |
| Notificación 1:30 antes | 75-105 minutos | ✅ Confirmada |
| Notificación 1 hora antes | 45-75 minutos | ✅ Confirmada |
| Cierre de Apuestas | 15 minutos antes | ✅ Validada |

**Detalles de Validación:**
- Scores pueden ser ingresados/actualizados en cualquier momento por admins
- Sistema envía dos notificaciones por partido con ventanas temporales específicas
- Mensaje de notificación comunica el cierre de apuestas en 15 minutos
- API `/api/predictions` valida cierre de apuestas exactamente 15 min antes del kickoff
- Scheduler sincroniza scores cada 1 minuto para partidos en vivo/próximos

Ver: [Verificación Completa](https://github.com/danny9001/ElitePass-OpenSec/blob/main/specs/antigravity/verification_score_notifications_2026.md)

## Estructura del Proyecto

```
src/app/
├── page.tsx                      # SPA principal con todos los tabs
├── layout.tsx                    # Layout + PWA meta tags dinámicos
├── tv/                           # Pantalla TV / aeropuerto
└── api/
    ├── admin/
    │   ├── users/                # CRUD de usuarios
    │   └── notify-scheduled/     # Notificaciones automáticas
    ├── auth/                     # Login, registro, WebAuthn
    ├── companies/                # CRUD empresas + modo_apuesta
    ├── favicon/                  # Favicon dinámico desde DB
    ├── manifest/                 # Manifest PWA dinámico
    ├── notifications/            # Mensajes internos
    ├── predictions/              # Pronósticos
    ├── push/subscribe/           # Suscripción/baja Web Push
    ├── realtime/                 # Server-Sent Events
    ├── settings/                 # Personalización
    └── sync/                     # Sincronización de marcadores
public/
├── sw.js                         # Service Worker (PWA + Push)
└── offline.html                  # Página sin conexión
scheduler.js                      # Daemon de notificaciones automáticas
ecosystem.config.js               # Configuración PM2
```

---

Desarrollado por [Genial IT](https://genial-it.net) · Mundial 2026

## Licencia

**LICENCIA CREATIVA ELITEPASS**  
© 2024–2026 Genial IT — Todos los derechos reservados.

Este software nació de la colaboración entre intelecto humano e inteligencia artificial:

| Rol | |
|-----|--|
| Concepción y dirección | Daniel Landivar |
| Asistencia en desarrollo | Claude · Antigravity · Codex |

> Claude, Antigravity y Codex son herramientas de la línea de desarrollo de Genial IT.

El código, diseño y arquitectura son propiedad exclusiva de Genial IT. No se permite su uso, copia, modificación ni distribución sin autorización expresa y por escrito.

Hecho con 🤝 humanos + IA · Genial IT · Bolivia
