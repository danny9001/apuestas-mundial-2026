---
name: skill-elitepass-security
description: >
  Directrices estrictas de seguridad para la familia ElitePass (Genial-it).
  Incluye manejo de WebAuthn, FIDO, rotación de JWT, anti-inyección, bcrypt-12,
  rate limiting en Nginx y encriptación de datos.
---

# ELITEPASS - SEGURIDAD (SECURITY HARDENING)

## 1. Autenticación y Autorización
- **Passkeys (WebAuthn/FIDO):** Preferir el uso de Passkeys (sin requerir email obligatorio en algunos flujos). Los desafíos WebAuthn deben ser persistidos en PostgreSQL, no solo en memoria. Al registrar una passkey, captura y muestra el nombre del dispositivo para gestión de sesiones.
- **Sesiones:** JWT debe ser rotado regularmente. Al configurar passkeys, se debe permitir o forzar el cierre de otras sesiones activas (Sign Out Everywhere).
- **Passwords:** Uso obligatorio de `bcrypt` con un cost factor mínimo de **12** (bcrypt-12).
- **Multi-tenancy:** Usar `requireOrganizationFilter()` y `assertOrganizationId()` obligatoriamente para garantizar que un tenant no pueda acceder a datos de otro.

## 2. Hardening contra Ataques
- **Anti-inyección y Sanitización:** Validación estricta usando zod. Todos los inputs deben ser sanitizados. Prevenir la creación de cuentas o registros duplicados manejando correctamente constraints a nivel de DB y aplicación.
- **Uploads:** Extensión estricta bloqueada (uso de `isBlockedExtension()` con más de 25 extensiones vetadas). Todo archivo gráfico debe convertirse a WebP antes de ser subido.
- **Rate Limiting:**
  - Nginx: Implementar `limit_req_zone` (Ej: `zone_auth:10m rate=20r/m`, `zone_api:10m rate=30r/m`).
  - Next.js Edge: Fallback in-memory o Redis compartido para rate limits a nivel de código.

## 3. Criptografía y Datos Sensibles
- Datos como teléfonos, documentos y correos secundarios en la DB deben ser encriptados usando AES-256-GCM. Usar keys derivadas y métodos `encrypt`/`decrypt`/`hashForIndex` provistos en utilidades de seguridad.
- No exponer el `sessionToken` en logs de auditoría bajo ninguna circunstancia.

> **Importante:** Cualquier nuevo endpoint debe pasar obligatoriamente por un chequeo de rate-limit y autorización (`getAuthSession()` usando React cache).
