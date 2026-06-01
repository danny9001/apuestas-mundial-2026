# 🏆 Apuestas Mundial 2026 (PWA Dockerizada)

Bienvenido a **Apuestas Mundial 2026**, una Progressive Web App (PWA) de alto rendimiento, diseñada mobile-first y completamente dockerizada. La plataforma permite realizar pronósticos deportivos en tiempo real, visualizar clasificaciones animadas de usuarios (con flechas de tendencia ▲, ▼ y medallas para el podio) y proyectar una pantalla de visualización masiva estilo aeropuerto para retransmisión de puntuaciones y partidos en vivo.

---

## 🚀 Arquitectura de Contenedores (Docker)

El proyecto completo corre de forma aislada en contenedores Docker mediante una red interna protegida, con persistencia total de datos y caché optimizado de dependencias.

### Servicios Incorporados:
1. **`app`**: Aplicación web interactiva en Next.js (Puerto `3000`). En desarrollo utiliza montajes directos para hot-reload inmediato.
2. **`db`**: Servidor de base de datos PostgreSQL 16 (Puerto `5432`) que inicializa automáticamente el esquema y las semillas de prueba.
3. **`supabase-studio`**: pgAdmin 4 (Puerto `5050`) como estudio visual ligero para gestionar la base de datos local.

---

## 🛠️ Comandos de Ejecución

Para iniciar la aplicación, no necesitas instalar nada en tu máquina local. Todo corre directamente en Docker.

### 🟢 Modo Desarrollo (Con Hot Reload & Volúmenes Compartidos)
Monta los archivos de código fuente localmente para reflejar cambios instantáneamente:
```bash
docker compose -f docker-compose.dev.yml up --build
```
*   **Web App**: [http://localhost:3000](http://localhost:3000)
*   **Studio / pgAdmin**: [http://localhost:5050](http://localhost:5050)

### 🔴 Modo Producción (Compilación Multi-Stage Altamente Optimizada)
Genera una build reducida y segura optimizada para entornos reales:
```bash
docker compose up -d --build
```
*   **Detener contenedores**: `docker compose down` o `docker compose -f docker-compose.dev.yml down`

---

## ⚽ Cuentas de Demostración Iniciales

La base de datos se autosemilla en su primer arranque con varios perfiles ya listos para pruebas de apuestas y clasificaciones:

*   **Administrador**: `admin@mundial.com`
*   **Usuario Estándar 1**: `diego@mundial.com`
*   **Usuario Estándar 2**: `juan@mundial.com`
*   **Usuario Estándar 3**: `maria@mundial.com`
*   **Usuario Estándar 4**: `pedro@mundial.com`
*   **Contraseña para todos**: `mundial2026`

---

## 📋 Reglas de Puntuación de Apuestas
*   **3 Puntos**: Acierto exacto del marcador (ej: Pronóstico 2-1, Marcador real 2-1).
*   **1 Punto**: Acierto del ganador o del empate pero no de los goles exactos (ej: Pronóstico 3-1, Marcador real 1-0).
*   **0 Puntos**: Fallo total en la predicción.

---

## 📺 Pantalla de Aeropuerto / Modo TV (`/tv`)
Disponible en la ruta `/tv`. Diseñada para pantallas grandes de visualización pasiva (legible a 5+ metros). Cicla automáticamente cada 10 segundos entre:
1.  **Tabla de posiciones (Top 20)** con animaciones mecánicas de tipo tablero flap-board para cambios de datos.
2.  **Partidos en Juego** en vivo (Livescores).
3.  **Próximos Encuentros**.
4.  Incluye reloj interno y banner emergente con ráfaga de gol si hay anotaciones reales.

---

## 📈 Tecnologías del Stack
*   **Next.js 15 (App Router)** & React 19.
*   **TailwindCSS v4** (Estética deportiva oscura de alto contraste).
*   **PostgreSQL 16** (Con disparadores PL/pgSQL y procedimientos automáticos de clasificación).
*   **Realtime**: Server-Sent Events (SSE) nativos de alto rendimiento integrados en Next.js.
*   **PWA**: Service Worker personalizado con caché inteligente offline y manifest de aplicación instalable.
