# 🏆 Apuestas Mundial 2026 (PWA Dockerizada)

Bienvenido a **Apuestas Mundial 2026**, una Progressive Web App (PWA) de alto rendimiento, diseñada para entornos productivos reales, completamente dockerizada, responsiva y orientada a la inmediatez de los datos.

---

## 🌟 Características Destacadas e Innovaciones

La plataforma ofrece una experiencia moderna de alto impacto visual y funcional tanto para dispositivos móviles como para computadores de escritorio:

### 1. 💻 Versión de Escritorio (Widescreen Responsive Dashboard)
*   **Mobile-First Adaptativo**: En celulares, la app muestra un menú táctil inferior fijo y una distribución vertical pensada para el uso cómodo con una sola mano.
*   **Widescreen Split-Screen**: En computadoras o tabletas (resolución `md:` y superior), la navegación inferior se oculta y es reemplazada por un **elegante menú lateral izquierdo (sidebar)**. El contenido principal se expande fluidamente en grillas anchas para aprovechar todo el monitor.

### 2. 📊 Resumen Detallado y Estadísticas del Partido (ESPN Style)
*   Al hacer clic en cualquier tarjeta o fila de partido, se despliega una **pantalla de resumen e información analítica**.
*   **Estadísticas de Juego**: Compara la Posesión de Balón, Remates Totales y Faltas de cada selección en barras de progreso personalizadas con acentos dorados de alta gama.
*   **Apuestas de la Comunidad en Directo**: Realiza llamadas dinámicas al backend para listar en tiempo real todos los pronósticos colocados por otros participantes (con nombres y avatares). Si el partido ya finalizó, muestra cuántos puntos acumuló cada jugador por su predicción, permitiendo comparar los resultados con el resto de la quiniela.

### 3. 📉 Llenado Rápido Tipo Planilla (Excel-Style Grid)
*   **Vista Alternativa**: Un selector interactivo te permite alternar entre la vista tradicional de tarjetas y la **Vista Planilla (Excel)**.
*   **Edición Compacta**: Convierte la cartelera de partidos en una hoja de cálculo. Puedes ingresar todos tus pronósticos directamente en las celdas usando el teclado numérico de forma fluida.
*   **Celdas Protegidas (Kickoff Lock)**: Los encuentros que ya están en vivo o finalizados bloquean y deshabilitan automáticamente sus inputs con un candado de seguridad para evitar apuestas fuera de tiempo.
*   **Guardado por Lote (Batch Submissions)**: Mientras editas la planilla, un panel flotante dinámico se despliega en la esquina inferior: **"Planilla de Cambios (N Modificados)"**. Al hacer clic en **"Guardar Planilla"**, el sistema realiza una única petición masiva, optimizando la red y actualizando tu perfil en segundos.

### 4. 📺 Pantalla de Aeropuerto / Modo TV (`/tv`)
*   Diseñada para proyección estática y pantallas gigantes, cicla automáticamente cada 10 segundos entre la tabla de posiciones general (Top 20), los partidos en vivo y los próximos encuentros.
*   Incorpora el efecto **Split-Flap Display**, simulando mecánicamente el volteo de tarjetas de aeropuertos cuando cambian las puntuaciones o nombres.
*   Pulsaciones de ráfaga y visualizador de gol ante eventos live de ESPN.

---

## 🛠️ Arquitectura de Contenedores y Arranque

El ecosistema corre aislado de forma limpia usando variables del entorno configuradas en `.env`:

### 🟢 Modo de Desarrollo (Con Hot-Reload)
```bash
docker compose -f docker-compose.dev.yml up --build
```
*   **App / PWA**: [http://localhost:3000](http://localhost:3000)
*   **TV Airport Display**: [http://localhost:3000/tv](http://localhost:3000/tv)
*   **Consola de Datos (pgAdmin)**: [http://localhost:5050](http://localhost:5050) *(admin@mundial.com / admin123)*

### 🔴 Modo de Producción (Optimizado en segundo plano)
```bash
docker compose up -d --build
```

---

## ⚽ Acceso Rápido y Semillas
La base de datos viene sembrada con 5 perfiles para pruebas inmediatas de clasificaciones, tendencias de podio (▲ / ▼) y validación de roles:

*   **Administrador**: `admin@mundial.com`
*   **Diego Messi**: `diego@mundial.com`
*   **Juan Neymar**: `juan@mundial.com`
*   **María Mbappé**: `maria@mundial.com`
*   **Pedro Haaland**: `pedro@mundial.com`
*   **Contraseña de Acceso**: `mundial2026`
