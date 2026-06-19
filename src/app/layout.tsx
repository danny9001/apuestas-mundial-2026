import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { InactivityGuard } from "@/components/InactivityGuard";

export const metadata: Metadata = {
  title: "Apuestas Mundial 2026",
  description: "Pronósticos y Quiniela Oficial del Mundial de Fútbol 2026. ¡Sigue resultados en vivo y escala el ranking!",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Apuestas Mundial 2026",
  },
  applicationName: "Apuestas Mundial 2026",
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#131315",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Nonce injected by middleware (proxy.ts) — required so Next.js applies it
  // to its own hydration scripts and so our inline SW registration is allowed
  // by the nonce-based CSP (no unsafe-inline needed).
  const nonce = (await headers()).get('x-nonce') ?? '';

  return (
    <html lang="es" className="dark h-full">
      <head>
        <link rel="manifest" href="/api/manifest" />
        <link rel="icon" href="/api/favicon" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/api/favicon" />
        <link rel="apple-touch-icon" href="/api/favicon" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('PWA Service Worker registrado con éxito:', reg.scope);
                  }).catch(function(err) {
                    console.log('Error al registrar Service Worker:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className={`h-full bg-neutral-950 text-neutral-100 antialiased overflow-x-hidden`}>
        {children}
        <InactivityGuard />
      </body>
    </html>
  );
}

