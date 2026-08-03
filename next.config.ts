import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * Las fotos de producto del catálogo vivo las sirve el Storage de Afeleia, así
 * que su host tiene que estar permitido para `next/image`. Se deriva de la misma
 * variable que usa el fetch del catálogo en vez de hardcodearse: local y
 * producción son hosts distintos y no debe haber una segunda fuente de verdad.
 * Sin la variable definida la web sirve el snapshot, cuyas imágenes salen de
 * `public/` y no necesitan permiso remoto.
 */
function afeleiaStoragePatterns() {
  const apiUrl = process.env.NEXT_PUBLIC_AFELEIA_API_URL;
  if (!apiUrl) return [];
  try {
    const { protocol, hostname, port } = new URL(apiUrl);
    if (protocol !== "http:" && protocol !== "https:") return [];
    return [
      {
        protocol: protocol.slice(0, -1) as "http" | "https",
        hostname,
        port,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [];
  }
}

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
      ...afeleiaStoragePatterns(),
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
