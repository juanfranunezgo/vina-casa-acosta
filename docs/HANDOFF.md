# Handoff técnico — sitio Viña Casa Acosta

Estado real del proyecto para quien lo retome (persona o agente). `CLAUDE.md` explica el
stack y las convenciones; este archivo explica **en qué punto está**, qué no funciona
todavía y qué trampas ya se pagaron.

Última actualización: 2026-07-30.

---

## En una línea

El sitio está **completo como pieza visual y vacío como software**: 74 páginas SSG en tres
idiomas, sin backend, sin base de datos y sin pagos. Nada de lo que el visitante escribe
llega a ninguna parte.

---

## Qué pasa hoy cuando alguien intenta contactar o comprar

Esto es lo primero que hay que saber, porque no se nota mirando la interfaz:

| Formulario | Qué hace realmente |
|---|---|
| Reserva de tours (`components/TourReservationForm.tsx`) | **No envía nada.** El submit es un `setTimeout` que muestra "enviado". Al lado hay un botón de WhatsApp que sí funciona. |
| Contacto (`components/ContactForm.tsx`) | Abre el cliente de correo del visitante con un `mailto:` prearmado. Si no tiene cliente configurado, el mensaje se pierde en silencio. |
| Carrito (`components/CartDrawer.tsx`) | El "checkout" arma un mensaje de WhatsApp con el pedido. No hay cobro. |

El formulario de tours es el más urgente: promete algo que no cumple.

---

## Lo que falta para producción

**Infraestructura de SEO (nada de esto existe):**
- No hay `app/sitemap.ts` ni `app/robots.ts`.
- ~~`metadataBase` y `SITE_URL` apuntan al dominio de preview de Vercel~~ → resuelto:
  ambos leen `lib/siteUrl.ts`, que toma la URL del entorno. Queda pendiente definir
  `NEXT_PUBLIC_SITE_URL` en Netlify cuando exista el dominio propio.
- `/tienda` no tiene metadata: es `"use client"`, así que no admite `generateMetadata`.
  Necesita un `layout.tsx` propio y una clave `metadata.tienda` en los mensajes.
- JSON-LD solo en `/vinos` (`ItemList`). Faltan `Winery`/`LocalBusiness` en el inicio,
  `Product` con `offers` en la ficha de vino, y `BreadcrumbList`.
- `app/[locale]/vinos/page.tsx` pide `quality={84}` y `next.config.ts` solo permite
  `[65, 70, 75, 85, 95]` → warning en cada build. Cambiar a 85.

**Legal:** no existen Privacidad, Términos ni Mapa de Sitio (en el footer son texto sin
enlace, a propósito). Tampoco hay verificación de edad ni aviso de consumo moderado: para
vender alcohol en Chile hay que revisarlo contra la Ley 19.925.

**Medición:** cero analítica instalada.

**Assets:** las botellas de `public/vinos/` son 500×500 y se ven blandas en la ficha. Los
originales de las fotos ya optimizadas **no están en el disco** (los tiene el cliente en su
respaldo en la nube): hasta que se repongan no se puede regenerar nada salvo el hero de la
home, cuyo master de desktop sí está versionado. Los `.webp` están todos versionados, así
que el sitio funciona. Qué archivo espera cada script está en [`FOTOS.md`](FOTOS.md).

**i18n:** el copy EN/PT lo tradujo un agente y **nunca lo validó una persona**.

---

## Trampas técnicas ya pagadas (no repetirlas)

- **Caché de imágenes**: si se reemplaza una foto manteniendo el nombre, el navegador y el
  optimizador de Next siguen sirviendo la vieja. Convención: sufijo `-vN` en el archivo
  (ver el encabezado de `scripts/optimize-fotos.mjs`).
- **Tailwind v4 descarta la opacidad sobre `currentColor`**: `bg-current/15` compila a
  `background-color: currentColor`, sin el 15%. Para tintes que heredan color, usar tokens
  explícitos por estado.
- **RSC**: no se pueden pasar funciones de un server component a uno cliente. Las etiquetas
  del carrusel de colecciones se pasan como array de strings ya traducidos.
- **`npm run build` borra `.next`** y deja zombi al dev server (EBUSY / 500 en rutas). Bajar
  el dev, buildear, y recién ahí volver a levantarlo.
- **SVG**: `fill="none"` y `stroke` van como **atributos del `<path>`**, no solo en CSS. Un
  error de compilación que dejó el CSS sin cargar rellenó de negro toda la curva del
  timeline de Historia.
- **Headers en Netlify**: los `[[headers]]` de `netlify.toml` solo llegan a los archivos
  estáticos. Las páginas las sirve el handler de Next y se los saltan — verificado con
  `curl -I` en producción. Los headers que deban valer para el HTML van en la función
  `headers()` de `next.config.ts`.
- Al iterar CSS conviene hard refresh (Ctrl+Shift+R).

---

## Deploy

El hosting se movió **de Vercel a Netlify** (2026-08-01) por dos razones: el plan Hobby de
Vercel prohíbe el uso comercial —y este sitio va a vender— y el proyecto de Vercel estaba
conectado a un repo distinto (`web-casa-acosta`) del que recibía los push
(`vina-casa-acosta`), así que el push nunca disparó deploy.

En Netlify el proyecto queda conectado al repo correcto: push a `main` → producción, push a
otra rama → deploy preview gratis. El adaptador de Next (OpenNext) lo instala Netlify solo;
la config está en `netlify.toml` y la URL pública sale del entorno (`lib/siteUrl.ts`).

**Lo que hay que saber del plan Free:** 300 créditos al mes, límite duro. Cada deploy de
producción son 15; el ancho de banda, 20 por GB; los previews, cero. Si se agotan, el sitio
queda en `Site not available` hasta el ciclo siguiente. Conviene mergear a `main` por tandas.

Guía completa —crear el proyecto, dominio propio, apagar Vercel, troubleshooting— en
[`DEPLOY-NETLIFY.md`](DEPLOY-NETLIFY.md).

---

## Proyecto hermano: el panel interno de pedidos

En `vina-casa-acosta/app/` (repositorio **distinto**, no se toca desde acá) vive la app
interna de logística de la viña: Express + Supabase + Resend, con dos frontends React
(vendedores y empaquetadores). Modela pedidos con estados `pendiente → en_preparacion →
listo → entregado`, retiro o despacho, código de retiro y bloqueo transaccional para que dos
empaquetadores no tomen el mismo pedido.

**Importa para la fase de pagos**: cuando la tienda web cobre de verdad, el pedido debería
entrar en ese sistema, no en uno nuevo. Su tabla `pedidos` ya cubre casi todo lo que
necesita una venta web; le faltan campos de pago (el ID del pago del proveedor, con índice
único, es lo que evita que un reintento de webhook duplique el pedido) y un origen para
distinguir la venta web de la de un vendedor.

---

## Documentos relacionados

- [`DEPLOY-NETLIFY.md`](DEPLOY-NETLIFY.md) — la migración a Netlify paso a paso y el deploy
  del día a día.
- [`NOMENCLATURA.md`](NOMENCLATURA.md) — el contrato de IDs de sección (A5, C2f, Dd6…).
  Se actualiza **antes** de tocar el código.
- [`reglas-frontend-nextjs.md`](reglas-frontend-nextjs.md) — reglas de semántica,
  accesibilidad, SEO y rendimiento que aplican a todo componente nuevo.
- [`../CONTENT_BRIEF.md`](../CONTENT_BRIEF.md) — brief de contenido.
- [`superpowers/plans/`](superpowers/plans/) y [`superpowers/specs/`](superpowers/specs/) —
  diseños y planes de sesiones anteriores.

Las bitácoras de sesión (`SESION-*.md`) y los briefs para el cliente viven en `web/`, fuera
del repositorio, porque contienen decisiones y material internos y **este repo es público**.
