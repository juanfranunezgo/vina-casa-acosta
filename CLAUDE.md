@AGENTS.md

# Viña Casa Acosta — sitio web

Sitio público boutique de la viña (San Vicente de Tagua Tagua, Valle del Cachapoal). Live: https://vinacasaacosta.netlify.app (hasta que haya dominio propio).

## Estructura

Esta carpeta (`sitio-web/`) es la raíz del proyecto Next.js. Está anidada dentro de `vina-casa-acosta/web/` por motivos históricos — los `*_stitch.html` y los assets sueltos del nivel de arriba son referencia visual del prototipo original, no fuente activa. La carpeta hermana `vina-casa-acosta/app/` es **otro proyecto y otro repositorio**: el panel interno de pedidos de la viña (Express + Supabase + Resend, con frontends de vendedores y empaquetadores). No se toca desde acá, pero es el destino natural de los pedidos cuando la tienda web cobre de verdad — ver [`docs/HANDOFF.md`](docs/HANDOFF.md).

## Stack

- Next.js 16.2.6 + Turbopack · React 19.2.4 · TypeScript
- Tailwind v4 (vía `@tailwindcss/postcss`) + Material 3 design tokens en `app/globals.css`
- next-intl 4.11.2 — locales `es` / `en` / `pt`, default `es`, `localePrefix: "always"`
- zustand 5 para el carrito (`lib/cart.ts`)
- lucide-react para iconos (Material Symbols se eliminó — ~300KB menos por page load)

## Layout de carpetas

```
app/[locale]/       Páginas (todas i18n-aware, 60 rutas SSG = 3 locales × 20 páginas)
components/         Componentes UI; ui/ tiene el Button unificado
components/ui/      Sistema base (Button con 5 variants × 3 sizes)
data/wines.ts       Catálogo de los 13 vinos — fuente de verdad para tienda y detalle
data/activities.ts  Tours / experiencias / eventos
i18n/routing.ts     Config de locales
i18n/request.ts     Loader de mensajes por request
messages/           Bundles es/en/pt — UI completa
lib/cart.ts         Store zustand del carrito
proxy.ts            ⚠️ Es el middleware de Next, renombrado en Next 16
public/vinos/       Imágenes de botellas (HOY 500×500 — pendiente reemplazo HD)
public/brand/       Logos
```

## Comandos

```bash
npm run dev      # localhost:3000
npm run build    # Producción (verifica TS + SSG)
npm run lint
```

## Deploy a producción

**Netlify**, plan Free (permite uso comercial; el Hobby de Vercel no). Conectado a `juanfranunezgo/vina-casa-acosta`: push a `main` → deploy de producción, push a otra rama → deploy preview. No hay comando manual que correr.

El adaptador de Next (OpenNext) lo instala Netlify solo en cada build — no agregarlo a `package.json` ni fijarle versión. La config vive en `netlify.toml`; la URL pública sale del entorno vía `lib/siteUrl.ts` (`NEXT_PUBLIC_SITE_URL` → `URL` de Netlify → localhost), así que **no hay dominio hardcodeado en el código**.

Ojo con los créditos: cada deploy de producción cuesta 15 de los 300 mensuales; los previews son gratis. Iterar en ramas y mergear por tandas. Todo el detalle —creación del proyecto, dominio propio, apagar Vercel, troubleshooting— en [`docs/DEPLOY-NETLIFY.md`](docs/DEPLOY-NETLIFY.md).

## Convenciones

- **Botones**: usar siempre `components/ui/Button.tsx` (variants `primary` / `outline` / `ghost` / `glass` / `link`, sizes `sm` / `md` / `lg`). Renderiza como `<Link>` si recibe `href`, si no como `<button>`. No agregar estilos ad-hoc.
- **Iconos**: solo `lucide-react`. No volver a importar Material Symbols. Para Instagram lucide no lo tiene con ese nombre — se usa `Camera` como fallback.
- **Tipografía hero**: `clamp()` en CSS, no media queries. Una sola declaración cubre 375px–1920px.
- **Precios**: `tabular-nums` para que no bailen al cambiar dígito. Formateo por locale (`es-CL` / `en-US` / `pt-BR`), moneda CLP en los tres.
- **Reduced motion**: respetado en `Reveal`, skeletons y scroll-behavior. Hero usa `motion-safe:animate-*`.
- **Imágenes**: Next/Image siempre. Para drop-shadows vino-tinto usar las utilidades existentes en `globals.css`.

## Estado del proyecto

| Fase | Estado |
|---|---|
| 1 (demo HTML→Next) | ✅ |
| 1.5 parte 1 — i18n | ✅ |
| 1.5 parte 2 — polish visual | ✅ |
| 2 — Supabase / Webpay / admin | ⏳ post-pitch |

Blockers abiertos al cierre: fotos HD de botellas y retratos familiares pendientes, validación humana de copy EN/PT. **Ninguno de los formularios envía nada todavía** — la lista completa está en [`docs/HANDOFF.md`](docs/HANDOFF.md).

## Nomenclatura de secciones

Cada página tiene una letra y cada sección un número. Cuando el usuario diga **A5** o **B4** se refiere a una sección puntual, no a algo vago. El contrato vive en [`docs/NOMENCLATURA.md`](docs/NOMENCLATURA.md) — leerlo antes de proponer cambios a secciones específicas. Si se agrega/quita/reordena una sección, el archivo se actualiza primero, después el código.

## Bitácora / handoff

**Empezar por [`docs/HANDOFF.md`](docs/HANDOFF.md)**: estado real del proyecto, qué formularios no envían nada, qué falta para producción y las trampas técnicas ya pagadas (caché de imágenes, Tailwind v4 con `currentColor`, build vs dev server). Es lo que necesita cualquiera que retome el trabajo.

Cuando se cierra una sesión grande, queda además un `SESION-AAAA-MM-DD.md` en `vina-casa-acosta/web/` (un nivel arriba), junto con `BRIEF-FOTOS.md`. Esos **no entran en el repo**: este repositorio es público y las bitácoras traen decisiones y material internos del cliente. Lo técnico de cada sesión se destila en `docs/HANDOFF.md`, que sí se versiona.
