@AGENTS.md

# Viña Casa Acosta — sitio web

Sitio público boutique de la viña (San Vicente de Tagua Tagua, Valle del Cachapoal). Live: https://web-casa-acosta.vercel.app.

## Estructura

Esta carpeta (`sitio-web/`) es la raíz del proyecto Next.js. Está anidada dentro de `vina-casa-acosta/web/` por motivos históricos — los `*_stitch.html` y los assets sueltos del nivel de arriba son referencia visual del prototipo original, no fuente activa. La carpeta hermana `vina-casa-acosta/app/` es **otro proyecto** (app interna de pedidos), no tocar desde acá.

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

**Crossed wire Git↔Vercel sin resolver:** Vercel apunta al repo `juanfranunezgo/web-casa-acosta`, git local pushea a `juanfranunezgo/vina-casa-acosta`. El push **no** triggea auto-deploy. Mientras no se arregle en el dashboard:

```bash
cd sitio-web && vercel --prod
```

Solución definitiva (5 min): Vercel dashboard → Settings → Git → cambiar repo conectado a `vina-casa-acosta`.

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

Blockers abiertos al cierre: fotos HD de botellas y retratos familiares pendientes, validación humana de copy EN/PT, crossed wire Vercel.

## Nomenclatura de secciones

Cada página tiene una letra y cada sección un número. Cuando el usuario diga **A5** o **B4** se refiere a una sección puntual, no a algo vago. El contrato vive en [`../NOMENCLATURA.md`](../NOMENCLATURA.md) — leerlo antes de proponer cambios a secciones específicas. Si se agrega/quita/reordena una sección, el archivo se actualiza primero, después el código.

## Bitácora / handoff

Cuando se cierra una sesión grande, queda un `SESION-AAAA-MM-DD.md` en `vina-casa-acosta/web/` (un nivel arriba). Sirve para retomar: qué se hizo, decisiones, blockers, cómo continuar. El último está en [`../SESION-2026-07-08.md`](../SESION-2026-07-08.md). Los briefs para el cliente (fotos, contenido) también viven ahí: `BRIEF-FOTOS.md`, `CONTENT_BRIEF.md`.
