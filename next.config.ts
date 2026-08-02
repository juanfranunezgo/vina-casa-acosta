import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Permite abrir el dev server desde otros dispositivos de la LAN (celular).
  // Next 16 bloquea por defecto los recursos de dev (HMR, chunks) si el origen
  // no es localhost. Solo aplica en desarrollo; no afecta producción.
  allowedDevOrigins: ["192.168.1.25"],
  images: {
    // Calidades permitidas para next/image. Silencia el warning de Next 16
    // cuando un <Image> pide algo distinto del default (75).
    // 85 = balance calidad/peso del hero full-bleed · 95 = botellas de vino.
    qualities: [65, 70, 75, 85, 95],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  // Headers de seguridad. Van acá y no solo en netlify.toml: los headers del
  // toml los aplica el CDN a los archivos estáticos, pero las páginas las sirve
  // el handler de Next y se las saltan. Definidos en Next, valen para todo.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
