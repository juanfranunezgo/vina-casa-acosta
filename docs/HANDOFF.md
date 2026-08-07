# Handoff técnico — sitio Viña Casa Acosta

Estado real del proyecto para quien lo retome (persona o agente). `CLAUDE.md` explica el
stack y las convenciones; este archivo explica **en qué punto está**, qué no funciona
todavía y qué trampas ya se pagaron.

Última actualización: 2026-08-03.

---

## En una línea

El sitio está **completo como pieza visual y casi vacío como software**: 74 páginas SSG en
tres idiomas, sin backend propio, sin base de datos y sin pagos. Los dos formularios ya
llegan a la viña vía Netlify Forms; el carrito sigue derivando a WhatsApp sin cobro.

---

## Qué pasa hoy cuando alguien intenta contactar o comprar

Esto es lo primero que hay que saber, porque no se nota mirando la interfaz:

| Formulario | Qué hace realmente |
|---|---|
| Reserva de tours (`components/TourReservationForm.tsx`) | Envía a **Netlify Forms** (`reserva-tour`). Al lado hay un botón de WhatsApp que sí funciona. |
| Contacto (`components/ContactForm.tsx`) | Envía a **Netlify Forms** (`contacto`). Antes era un `mailto:` que se perdía si el visitante no tenía cliente de correo. |
| Carrito (`components/CartDrawer.tsx`) | El "checkout" arma un mensaje de WhatsApp con el pedido. **No hay cobro.** |

### Netlify Forms — cómo está armado

Solución provisoria mientras no haya backend. Plan Free: **100 envíos/mes**.

- `public/__forms.html` declara los dos formularios. Existe porque Netlify detecta
  formularios parseando el HTML **estático** del deploy, y con OpenNext los `<form>` de
  React no existen como HTML en el build. **Cada campo que envíe un componente tiene que
  estar declarado ahí**: Netlify descarta en silencio los que no figuren.
- `lib/netlifyForms.ts` hace el POST contra `/__forms.html` (no contra una ruta de Next,
  que se la llevaría OpenNext antes de que Forms la vea).
- ⚠️ **En `npm run dev` los formularios siempre fallan** (405/404): el handler de Forms es
  parte del runtime de Netlify. Se prueban en un deploy preview, no en local.
- La casilla de destino se configura en Netlify → Notifications → Form submission
  notifications. **No sale de `lib/contact.ts`**: cambiar esa constante no cambia a dónde
  llegan los envíos.
- Los envíos quedan guardados en el panel aunque la notificación por correo falle.

---

## Lo que falta para producción

**Infraestructura de SEO:**
- ~~No hay `app/sitemap.ts` ni `app/robots.ts`~~ → hechos. El sitemap emite 69 URLs
  (23 rutas × 3 locales) con el set completo de hreflang + `x-default`, y sale de `data/`,
  así que agregar un vino o un tour lo incluye solo. Va **sin `lastmod`** a propósito: no
  existe fecha real de modificación y estampar la hora del build entrena a Google a ignorar
  el campo. Cuando el catálogo traiga `updated_at` desde Afeleia, se agrega.
- ~~`metadataBase` y `SITE_URL` apuntan al dominio de preview de Vercel~~ → resuelto:
  ambos leen `lib/siteUrl.ts`. **Falta definir `NEXT_PUBLIC_SITE_URL =
  https://vinacasaacosta.cl` en Netlify y redeployar** — sin eso los canonical siguen
  saliendo con el dominio `*.netlify.app`.
- ~~Canonical roto en todo el sitio~~ → resuelto. Las 78 páginas declaraban **la home**
  como su canónica (solo `/actividades` estaba bien): `alternates` vivía en el layout y se
  hereda entero, así que toda ruta que no lo redeclarara heredaba el de la portada. Google
  lo lee como "indexá una sola página". Ahora cada ruta lo declara con `alternatesFor()`
  de `lib/alternates.ts` y el layout ya **no** lo trae — si una ruta nueva se olvida, queda
  sin canonical (Google se auto-canonicaliza) en vez de apuntar mal.
- ~~`/tienda` no tiene metadata: es `"use client"`~~ → tiene su `layout.tsx` con el
  canonical. **Sigue faltando la clave `metadata.tienda`** en `messages/*.json`: hasta que
  exista, hereda el title y la description genéricos del sitio. Es copy y necesita
  validación del cliente, por eso no se inventó.
- Las fichas de vino y tour ya emiten su propio Open Graph (antes compartir un vino por
  WhatsApp mostraba el título y la foto genéricos del sitio). Ojo: `tour-ombu` y
  `tour-bera` todavía usan fotos de Unsplash como `og:image`.
- ~~JSON-LD solo en `/vinos` (`ItemList`)~~ → las cinco páginas principales (inicio,
  historia, vinos, actividades, contacto) emiten un `@graph` con la viña como
  `["Winery","LocalBusiness"]` — NAP, horario, coordenadas y `sameAs` — más el tipo de
  página que corresponde (`WebSite`, `AboutPage`, `CollectionPage`, `ContactPage`). Los
  tours de `/actividades` van como `Product` + `Offer` con precio, porque el precio se ve
  en la grilla. Todo en `lib/siteJsonLd.ts`.
  - Las **coordenadas** salen del propio listado de Google del negocio (el link del
    footer resuelve a `@-34.465133,-71.009675`), no de un geocode adivinado.
  - **Sin `aggregateRating`**: no hay reseñas propias publicadas y copiar las de Google
    sería marcado falso. **Sin `availability`** en las ofertas de tours: se reservan y
    tienen mínimo de personas, así que afirmar "InStock" diría algo que el sitio no dice.
  - **Sin `BreadcrumbList`**, y es a propósito: no existe un breadcrumb visible en
    ninguna página. Google pide que el schema refleje un rastro que el usuario ve. Si se
    agrega esa UI, el schema se suma en una línea.
  - **Sin `SearchAction`** en `WebSite`: el sitio no tiene buscador.
- Falta todavía `Product` + `offers` en la **ficha individual** de cada vino. Los precios
  ya son reales, así que es la pieza con más retorno comercial que queda pendiente.
- ~~Dos helpers para escapar el JSON-LD~~ → unificado al mergear `main`. Quedó
  `serializeJsonLd()` de `lib/jsonLd.ts`, y **el único emisor sancionado es
  `<JsonLd data={...} />`** (`components/JsonLd.tsx`). El `jsonLdHtml()` que traía la rama
  de SEO se borró y sus cinco bloques pasaron por el componente. No volver a escribir
  `application/ld+json` a mano: `tests/json-ld-source.test.mjs` falla si aparece en
  cualquier archivo que no sea `JsonLd.tsx`.
- ~~Deriva de NAP entre el footer y `/contacto`~~ → resuelto: el footer dice "O'Higgins" y
  suma la excepción del jueves en los tres idiomas, igual que `/contacto` y que el
  `OpeningHoursSpecification` del schema.
- `app/[locale]/vinos/page.tsx` pide `quality={84}` y `next.config.ts` solo permite
  `[65, 70, 75, 85, 95]` → warning en cada build. Cambiar a 85.

**Catálogo:** los 13 precios reales llegaron el 2026-08-03 y están aplicados en el repo
(`data/wines.ts` y `data/catalogo-fallback.json`), pero **falta cargarlos en el panel de
Afeleia**: desde el M3 el precio sale de `producto.precio` de la API
(`lib/afeleia/catalog.ts`), así que mientras la API responda el visitante sigue viendo los
precios inventados de la demo. Ojo con el orden al hacerlo: el respaldo de hoy está editado
a mano y `npm run catalogo:snapshot` lo sobrescribe con lo que diga el panel. La lista y su
mapeo a cada producto están en
[`../CONTENT_BRIEF.md`](../CONTENT_BRIEF.md#2-texto-de-cada-vino).

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
