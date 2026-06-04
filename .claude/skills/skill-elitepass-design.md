---
name: skill-elitepass-design
description: >
  Directrices de diseño UI/UX para ElitePass (Genial-it). Basado en estética 
  neutral/Broker, componentes acromáticos, optimización PageSpeed y WebP avatars.
---

# ELITEPASS - DISEÑO, UI/UX Y RENDIMIENTO (FRONTEND)

## 1. Filosofía de Diseño (Estética Neutral)
- **Eliminación del estilo "Cyber":** Los estilos neón, colores azules invasivos o tintes púrpuras están completamente erradicados del sistema global.
- **Tokens Neutrales ("Zinc"):** El sistema base debe ser acromático (escala de grises). Los acentos de color se reservan exclusivamente para estados semánticos (Destructive=Rojo, Success=Verde, BulkAction=Amber) o para el branding específico del tenant.
- **Tipografía Limpia:** No usar fuentes personalizadas de carga lenta. Utilizar fuentes del sistema nativas (`system-ui`, `Segoe UI`, `Inter`, etc.) para reducir el TTFB y layout shifts.

## 2. Optimización de Imágenes (PageSpeed)
- **Conversión a WebP Obligatoria:** Todas las imágenes subidas por usuarios se convierten a WebP vía `sharp`.
- **Avatares y Fallbacks:** Los avatares de usuario convertidos a WebP deben incluir un fallback a `DiceBear` (avatares generados algorítmicamente) si el usuario no proporciona imagen.
- **Next Image:** Usar `next/image` con formatos prioritarios AVIF y WebP (`formats: ["image/avif", "image/webp"]`). Asegurar propiedades `priority` y `sizes` en imágenes sobre el pliegue (LCP).

## 3. Experiencia de Usuario (UX)
- **Streaming Boundaries:** Implementar siempre `loading.tsx` y `error.tsx` con skeletons para partes pesadas de la UI, garantizando un renderizado inicial ultra-rápido (< 100ms percebido).
- **Lazy Loading:** Librerías pesadas como `html5-qrcode` o gráficas complejas deben ser importadas dinámicamente (`await import()`) solo cuando el usuario las interactúe.
- **PWA / Instalación:** Mantener soporte para PWA con `Serwist`, manifest dinámico por tenant, notificaciones Push integradas en la UI y manejo de safe-areas en móviles.
