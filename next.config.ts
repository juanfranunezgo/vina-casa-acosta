import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
// Con extensión explícita: además de Next, este archivo lo importa
// `tests/afeleia-image-config-parity.test.mjs` desde node pelado, que no resuelve
// especificadores sin extensión.
import { STORAGE_PUBLIC_PREFIX } from "./lib/afeleia/contract.ts";

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
        // Mismo prefijo que exige `renderableImage`, importado y no repetido: un
        // guard más permisivo que esta config es el 500 de H-49 volviendo.
        pathname: `${STORAGE_PUBLIC_PREFIX}**`,
      },
    ];
  } catch {
    return [];
  }
}

/** Origen (`https://host:puerto`) de la API de Afeleia, para la CSP. */
function afeleiaOrigin(): string | null {
  const apiUrl = process.env.NEXT_PUBLIC_AFELEIA_API_URL;
  if (!apiUrl) return null;
  try {
    const { origin, protocol } = new URL(apiUrl);
    return protocol === "http:" || protocol === "https:" ? origin : null;
  } catch {
    return null;
  }
}

/**
 * Content-Security-Policy del sitio.
 *
 * QUÉ CUBRE Y QUÉ NO — leer antes de tocarla:
 *
 * `script-src` lleva `'unsafe-inline'` y eso NO es un descuido: el App Router
 * emite los datos de RSC en scripts inline (`self.__next_f.push`) en cada página.
 * Restringirlos exige un nonce por request, y el nonce obliga a leer headers, lo
 * que vuelve dinámica toda la ruta — o sea, mata el SSG/ISR sobre el que está
 * construido este catálogo (42 rutas estáticas revalidando cada 60s).
 *
 * Consecuencia honesta: esta CSP NO detiene un XSS inline. La defensa real
 * contra eso es escapar en el sink — `lib/jsonLd.ts` y el resto del árbol, que
 * React ya escapa por defecto. Esta política es la segunda línea: acota lo que
 * un XSS podría HACER después (no puede cargar script externo, ni exfiltrar a
 * un host cualquiera, ni reescribir la base de las URLs relativas, ni embeber
 * plugins, ni enviar formularios afuera).
 *
 * Si algún día se acepta pagar render dinámico, el upgrade es nonce +
 * `'strict-dynamic'` y borrar `'unsafe-inline'` de `script-src`.
 */
function contentSecurityPolicy(): string {
  const afeleia = afeleiaOrigin();

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Ver el comentario de arriba: 'unsafe-inline' es estructural en App Router.
    "script-src": ["'self'", "'unsafe-inline'"],
    // Tailwind y los `style={{…}}` de las páginas emiten estilo inline.
    "style-src": ["'self'", "'unsafe-inline'"],
    // Las fotos de producto salen del Storage de Afeleia; el Image CDN de
    // Netlify las reescribe al mismo origen, así que `'self'` lo cubre.
    "img-src": ["'self'", "data:", "blob:", "https://images.unsplash.com"],
    "font-src": ["'self'", "data:"],
    // CartDrawer consulta el catálogo desde el cliente al abrirse. Quitar el
    // origen de Afeleia rompe el marcado de líneas agotadas del carrito.
    "connect-src": ["'self'"],
    "frame-ancestors": ["'self'"],
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-src": ["'none'"],
  };

  if (afeleia) {
    directives["img-src"].push(afeleia);
    directives["connect-src"].push(afeleia);
  }

  return Object.entries(directives)
    .map(([directive, values]) => `${directive} ${values.join(" ")}`)
    .join("; ");
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
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
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
