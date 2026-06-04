---
name: skill-elitepass-organizer
description: >
  Skill principal y organizador maestro para cualquier sistema de Genial-it (ElitePass).
  Contiene el checklist oficial de revisión (Arquitectura, Seguridad, Base de Datos, Diseño)
  y referencias a las sub-skills. Siempre invocar esta skill al iniciar un nuevo módulo
  o realizar mantenimiento. Sincroniza memoria entre Gemini y Claude.
---

# ELITEPASS - ORGANIZADOR MAESTRO Y CHECKLIST DE CREACIÓN

Este es el documento central de referencia para la familia de aplicaciones **ElitePass** (club-administrator, apuestas-mundial-2026, etc.).

> **Nota de Sincronización:** Este archivo unifica las memorias de Claude y Gemini, garantizando que ambos agentes apliquen exactamente las mismas reglas de negocio, diseño y seguridad en todos los proyectos de Genial-it.

## CHECKLIST OBLIGATORIO DE INICIO/MODIFICACIÓN

Antes de crear un módulo o modificar el sistema, verifica los siguientes puntos:

### 1. SEGURIDAD (Referencia: `skill-elitepass-security`)
- [ ] **Passkeys / WebAuthn:** Integrados para login sin contraseña (FIDO, registro de dispositivo).
- [ ] **Autenticación:** Rotación de JWT, cierre de sesiones activas, bcrypt-12.
- [ ] **Prevención de Inyección:** Sanitización de inputs estricta, protección contra duplicados.
- [ ] **Rate Limiting:** Zonas configuradas en Nginx y fallback in-memory/Redis en Edge.
- [ ] **Multi-tenancy:** Uso de `requireOrganizationFilter()` para aislamiento de datos.

### 2. BASE DE DATOS Y BACKEND (Referencia: `skill-elitepass-backend`)
- [ ] **PostgreSQL:** Optimización de queries (cuidado con `json_agg` y `DISTINCT`), índices compuestos aplicados.
- [ ] **Infraestructura:** Despliegue usando clúster de Podman (migración desde PM2) o Nginx con caché agresivo (Brotli activado).
- [ ] **Archivos y Media:** Conversión automática a WebP para todos los uploads. Avatares con fallback a DiceBear.

### 3. DISEÑO Y UI/UX (Referencia: `skill-elitepass-design`)
- [ ] **Paleta:** Tokens neutrales (zinc/escala de grises). PROHIBIDOS los estilos "cyber", colores primarios invasivos o tintes purpuras.
- [ ] **Tipografía:** Uso estricto de fuentes del sistema (Inter/Roboto/Segoe UI), sin fuentes personalizadas pesadas.
- [ ] **Componentes:** Skeleton loaders integrados (Streaming Boundaries `loading.tsx`), Lazy Loading de módulos pesados.
- [ ] **Rendimiento:** PageSpeed optimizado, imágenes servidas en AVIF/WebP a través de Next Image.

## ÍNDICE DE SUB-SKILLS

Para detalles de implementación, invocar las siguientes skills específicas:
- `/skill-elitepass-security`: Directrices profundas de FIDO, JWT, bcrypt, encriptación y rate limits.
- `/skill-elitepass-design`: Design System acromático, tokens UI, manejo de WebP y PWA.
- `/skill-elitepass-backend`: Directrices de base de datos PostgreSQL, Prisma, Podman y Nginx.

**Historial Reciente (Apuestas Mundial 2026):**
- Migración a clúster de Podman.
- Adopción de Passkeys (WebAuthn) persistidos en PostgreSQL.
- Eliminación global de estilos cyber/azules hacia tokens neutrales zinc.
- Fallback automático DiceBear para WebP avatars.
- Fixes de SQL (`json_agg`, `DISTINCT`).
