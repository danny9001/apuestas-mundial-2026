---
name: skill-elitepass-backend
description: >
  Directrices de Backend, Base de Datos (PostgreSQL) e Infraestructura (Podman)
  para ElitePass (Genial-it). Reglas de Prisma y Nginx.
---

# ELITEPASS - BACKEND, BASE DE DATOS E INFRAESTRUCTURA

## 1. Base de Datos (PostgreSQL & Prisma)
- **Queries Complejas y N+1:** Evitar cascadas de queries DB (waterfalls). Usar raw SQL (`$queryRaw`) con `Promise.all` cuando involucre métricas complejas, pero tener especial cuidado con las funciones de agregación como `json_agg` y el uso correcto de `DISTINCT` para evitar errores de agrupamiento.
- **Índices:** Usar índices compuestos donde sea necesario (ej: filtrado condicional por estado y tenant) para prevenir sequential scans.

## 2. Server Actions y Fetching
- **Caché de Autenticación:** Las resoluciones de sesión en Server Actions deben usar `React.cache` (`getAuthSession()`) para no hacer múltiples round-trips al servicio de Auth en una misma petición.
- **Cache Público:** Endpoints o páginas de consulta general no autenticada deben tener un caché configurado con `stale-while-revalidate` (CDN).

## 3. Infraestructura y Despliegue
- **Podman Cluster:** La arquitectura de producción evoluciona de PM2 (Node clásico) hacia un esquema de clúster de Podman. Cada servicio o worker se despliega de manera aislada mejorando la eficiencia y escalabilidad.
- **Nginx Reverse Proxy:** Nginx maneja TLS, HTTP/2, compresión extrema (Brotli `brotli_comp_level 6`) y Rate Limiting real compartido (ya que en clúster el rate limit en memoria se multiplica por worker). Las imágenes (`_next/image`) estáticas tienen caché agresivo de 60 días en Nginx.
- **Logging / Monitoreo:** Mantener alertas de Server Actions lentos. El SLO para acciones de lectura es < 300ms (P95) y escrituras < 500ms (P95).
