# Handoff técnico — sitio Viña Casa Acosta

Estado real del proyecto para quien lo retome (persona o agente). `CLAUDE.md` explica el
stack y las convenciones; este archivo explica **en qué punto está**, qué no funciona
todavía y qué trampas ya se pagaron.

Última actualización: 2026-08-16.

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
- El formulario de reserva pasó de llamarse `reserva-tour` a **`reserva-actividad`**
  (campos nuevos: `actividad` y `tipo`, que vale `reserva` o `cotizacion`). Los envíos
  anteriores **no se pierden**: quedan en el panel bajo el nombre viejo, en su propia
  lista. Si la notificación por correo estaba configurada sobre `reserva-tour`, hay que
  volver a configurarla para el nombre nuevo.

---

## Actividades — arquitectura (rama `feat/actividades-subpaginas`)

Cada actividad tiene página propia bajo su categoría:
`/actividades/{tours|talleres|experiencias}/{slug}`. Las tres URLs planas de tour
(`/actividades/tour-ombu` y hermanas) redirigen **308** desde `next.config.ts`; las URLs
padre de categoría redirigen **307**, a propósito: sus landings están planificadas y un
308 cacheado en los navegadores impediría estrenarlas.

**Agregar una actividad** cuesta un objeto en `data/activities.ts` y un bloque en
`activities.items` de **los tres** archivos de `messages/`. Nada más: ruta, sitemap,
submenú del navbar y JSON-LD se derivan de esos datos.

**Las traducciones no son opcionales.** next-intl no falla cuando falta una clave:
`getMessageFallback` devuelve la ruta de la clave y la página se publica mostrando
`activities.items.pizzas.name` en pantalla. Pasó de verdad —tres portadas salieron así de
un build verde— y por eso existen `tests/actividades-i18n-parity.test.mjs` y
`tests/actividades-namespace-source.test.mjs`.

`tests/alias-hook.mjs` enseña a `node --test` el alias `@/` de tsconfig. Sin él, todo
módulo que use el alias solo se puede cubrir con un guard que lee su propio texto.

**Medición tras el hub de Vendimia:** build limpio, **112 páginas estáticas** (Turbopack las
genera en 805 ms con 15 workers). El sitemap emite **105 URLs**, 42 de ellas fichas de
actividad y 3 el hub. El costo por página resultó marginal, como se había estimado: el trabajo real
fue el copy en tres idiomas.

El catálogo son **14 actividades**: 3 tours, 3 talleres y 8 experiencias. Ninguna de las 11
nuevas publica precio, así que sus fichas salen en modo cotización. El orden dentro de cada
categoría es el del catálogo del cliente y **se ve en pantalla** (bloque "otras actividades
de la misma categoría").

**Las 14 fichas están a un salto desde cualquier página** (plan 3). Medido sobre el HTML del
build, no en el navegador: `/es/contacto`, `/es/historia`, `/es/staff`, `/es/tienda` y
`/es/vinos` traen las 14; antes traían **cero**. Ninguna ficha queda sin enlaces entrantes.

El desplegable de Actividades que existía **nunca contó como enlazado interno**: se montaba
con `{activitiesMenuOpen && <panel/>}` y el estado arranca cerrado, así que sus enlaces no
llegaban al HTML servido. Es la trampa que da nombre a `tests/navegacion-enlaces-source.test.mjs`:
**los paneles se renderizan siempre y se ocultan con el atributo `hidden`**, nunca se montan
por estado. Se rompe sin síntoma visible — la interfaz sigue funcionando y el crawler deja de
ver los enlaces.

Ojo con `hidden`: aplica `display:none` desde la hoja del navegador y **cualquier clase de
display lo pisa**. El elemento que lo lleva no puede traer `flex`, `grid` ni `block`; la
grilla va en un hijo. El test también lo afirma.

**Copy sin validar por el cliente.** De cada actividad, el `intro` es texto del catálogo
verbatim; `name`, `description`, `tagline` y `closing` los escribimos nosotros porque el
catálogo no los trae. EN y PT, además, sin validación humana como el resto del sitio.

**Las actividades nuevas no llevan `highlights`.** Ese array lo lee un solo lugar
(`app/[locale]/actividades/page.tsx`, dentro de `tours.map`), así que escribirlo para las
otras once serían 90 strings en tres idiomas que nada renderiza. Se escriben cuando las
tarjetas del plan 3 los necesiten. Los de `pizzas` quedaron de antes y tampoco se muestran.

**Fotos:** las 11 fichas nuevas comparten dos imágenes de categoría (`talleres.jpg` y
`pareja-columpio.webp`), que son hero, tarjeta de reserva y `og:image` a la vez; en las
experiencias esa foto aparece además tres veces en la misma página. **Aceptado por el
cliente**, que va a entregar fotos por actividad. Cuando lleguen es una línea `image` por
actividad, sin tocar componentes.

**Anclas de categoría:** solo `tours` tiene en el índice una sección que lista su categoría,
así que es la única cuya miga lleva fragmento. Talleres no tiene sección y la que se llama
Experiencias son tres tarjetas-puerta donde no está ninguna de las ocho experiencias. La
regla vive en `CATEGORIES_WITH_INDEX_ANCHOR` (`data/activities.ts`) y la afirman las tres
superficies que llevan ese enlace —miga visible, `BreadcrumbList` y redirect de URL padre—
en `tests/actividades-anclas.test.mjs`. Cuando el plan 3 estrene las secciones, el test se
pone rojo hasta que la lista las reconozca.

**Tres cosas que preguntarle al cliente:**
- *Cena Sensorial* es la única actividad sin lista de contenidos: el catálogo habla de
  "cinco tiempos" y no los enumera. Su ficha sale sin bloque de detalle a propósito. Si
  llegan los cinco tiempos, entran como `program`.
- Los tres talleres de cocina declaran "Cocción en horno tradicional", incluido el de
  ñoquis, donde el plato se hierve. Se transcribió tal cual.
- El catálogo da "3 horas + cierre" para *Cosecha tu historia*, que a la vez describe un
  ciclo completo de poda a embotellado. Se transcribió tal cual; probablemente sean las
  horas de cada jornada.

## Hub de Vendimia (`/actividades/vendimia`)

Existe desde el 2026-08-16. Es una **página informativa**, no una ficha: cuenta qué es la
vendimia, dibuja el ciclo de la vid —las cinco etapas salen del propio catálogo, de las
inclusiones de *Cosecha tu historia*— y recién después ofrece la jornada *corta, pisa y
celebra*, que por eso **no tiene ficha propia**: dos páginas nuestras compitiendo por la
misma búsqueda es peor que una.

**No publica fechas, precio ni mínimo de personas, y es una decisión, no un pendiente.** La
cosecha depende de la maduración de la uva y la viña confirma cada jornada por temporada; el
material que había (una publicación de Instagram) era de la temporada pasada, con fechas y
preventa ya vencidas. El único dato de calendario es la franja de meses, que sale de
`VENDIMIA_MONTHS`. Lo afirman doce tests en `tests/vendimia-hub.test.mjs`, incluido uno que
falla si aparece un `$` o un día concreto en el copy de cualquiera de los tres idiomas.

Por lo mismo el structured data va como `WebPage` + `BreadcrumbList` y no como `Event` ni
`Product`: el primero exige `startDate` y el segundo un precio.

`VENDIMIA_HUB` sigue siendo el interruptor: si vuelve a `null`, la página desaparece del
mega-menú, de la banda del índice y del sitemap a la vez. Antes esa constante existía pero
**ninguna superficie la leía** — el handoff afirmaba lo contrario.

El formulario estrena un **tercer modo, `temporada`**, y no es cosmético: nadie pide una
cotización de una jornada que se repite todos los años. En ese modo el formulario dice
"guarda tu lugar para la próxima fecha", **no muestra el campo de fecha** —no hay día que
elegir todavía— y manda `tipo=temporada` a Netlify, así la viña distingue ese lead del que
pide precio. Los otros dos modos (`reserva`, `cotizacion`) quedaron igual.

Va además **sin `minPeople`**, que pasó a ser opcional en `ActivityReservationForm`: el campo
arranca vacío y no muestra la ayuda "desde N personas". Poner 1 para rellenar el hueco habría
afirmado un mínimo que el cliente no dio.

Su hero es la única foto propia de una actividad que no es tour: aérea del grupo en el
viñedo, servida en tres anchos WebP. Sin encuadre vertical a propósito y con el `sizes` en
`vh` — el detalle y las mediciones están en [`FOTOS.md`](FOTOS.md).

**Las nueve fotos de la página salen de material real**: cuatro son encuadres de esa misma
aérea (`npm run fotos:vendimia`) y el resto son fotos de la viña que ya estaban en el repo.
No hay stock ni fotos de otras actividades haciéndose pasar por vendimia; los `alt`
describen lo que se ve y no afirman que el asado o la mesa puesta sean de una vendimia. Por
eso **el hub no usa `GalleryPlaceholder`**: su galería tiene fotos de verdad, y el
placeholder de marcos vacíos se quedó solo en las 14 fichas.

**Ritmo visual:** el resto del sitio es claro y parejo, y esta página alterna — las dos
secciones de contexto (qué es la vendimia, el ciclo de la vid) van en penumbra sobre
`--color-primary`, con las fotos grandes encima, y vuelve a la luz para la jornada, la
galería y el formulario. Son los mismos tokens del sistema con otra intensidad, no una
paleta nueva.

**Lo que le falta:** fechas y precio de la próxima temporada, fotos de la jornada para la
galería (hoy son marcos vacíos) y la validación del copy, que en ES es nuestro salvo el
programa y el ciclo, y en EN/PT no lo vio una persona.

**Pendiente tras el plan 3:**
- **Las tarjetas del mosaico `A4` (home) siguen sin selector.** Las de `D3` (índice) sí lo
  tienen. Convertir las de la home exige que `HomeActivitiesShowcase` ramifique sus dos rutas
  de render, y ese componente ya está en 328 líneas mezclando filtros, mosaico y banner — el
  spec dice explícitamente no refactorizarlo en este trabajo. Sus tarjetas de experiencia sí
  dejaron de apuntar al ancla `#experiencias`, que no lista la categoría. No es un agujero de
  enlazado: el mega-menú está en la home igual que en el resto del sitio.
- **`ActivitiesTabs` sigue con sus tres pestañas escritas a mano**, sin Talleres. Se resuelve
  con la reestructuración del índice, que el cliente no aprobó.

**Detalle de UI anotado, sin resolver:** en una ficha de experiencia se apilan tres
encabezados antes del contenido —"¿Qué incluye?" → "Durante la experiencia disfrutarás de:"
→ "Programa de la jornada"— donde en un taller son dos. El tercero lo trae
`ActivityProgram`. No es incorrecto, pero sobra un nivel.

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

**Tienda — compra mínima:** desde el 2026-08-17 el pedido no se puede cerrar con menos de
**6 botellas**, sumando todo el carrito (seis etiquetas distintas cumplen). El número es
`MIN_BOTTLES` en `lib/cart.ts` — está ahí, y no en el cajón, porque es una regla del
negocio y cualquier superficie que la anuncie tiene que leer el mismo valor. Las líneas
agotadas no cuentan, igual que no suman al total estimado. **Pendiente:** hoy la regla
sólo se descubre al abrir el carrito; falta anunciarla en la tienda y en la ficha de cada
vino (una cadena nueva en tres idiomas) para que nadie llegue al cierre con la sorpresa.

**Legal:** Términos y Condiciones **sí existe** desde el 2026-08-17:
`public/documentos/terminos-y-condiciones.pdf` (v1.0, vigencia 16-08-2026), enlazado desde
el footer **sólo en español** — en `/en` y `/pt` la etiqueta sigue siendo texto, porque
enlazar un documento que el visitante no puede leer promete algo que no se cumple; el mapa
de idiomas está en `Footer.tsx`. El nombre del archivo es estable a propósito: una v1.1 lo
reemplaza sin tocar el enlace. **Pendiente:** el propio documento dice que esta edición es
"para publicación y adaptación web", y un PDF enlazado desde el pie es ilegible para Google
y para los buscadores de IA — falta la página `/terminos` con el texto. Privacidad y Mapa de
Sitio siguen sin existir (texto sin enlace, a propósito). Tampoco hay verificación de edad
ni aviso de consumo moderado: para vender alcohol en Chile hay que revisarlo contra la Ley
19.925.

**Medición:** cero analítica instalada.

**Assets:** las botellas de `public/vinos/` son 500×500 y se ven blandas en la ficha, salvo
**Lajau Betúm Yú y Estación Francia Tannat**, reemplazadas el 2026-08-17 por masters HD de
1000×1000 que pesan lo mismo que las viejas (84 y 96 KB). Sus fuentes sí están en el disco
(`_fuentes-fotos/`, fuera del repo) y las procesa `npm run fotos:botellas`: recorta la
transparencia, escala por la botella real y la centra en un cuadrado con el 94% del alto,
que es la proporción medida sobre las botellas ya publicadas. Para las once restantes
alcanza con poner su fuente en esa carpeta y sumar dos líneas a la lista del script. Los
originales de las fotos ya optimizadas **no están en el disco** (los tiene el cliente en su
respaldo en la nube): hasta que se repongan no se puede regenerar nada salvo el hero de la
home, cuyo master de desktop sí está versionado. Los `.webp` están todos versionados, así
que el sitio funciona. Qué archivo espera cada script está en [`FOTOS.md`](FOTOS.md).

**i18n:** el copy EN/PT lo tradujo un agente y **nunca lo validó una persona**. Lo agregado
el 2026-08-17 entra en la misma deuda, con una distinción útil para quien revise: los puntos
nuevos de las tarjetas de tour son **recortes** de oraciones ya traducidas en el mismo
archivo (`includes` → "Copa de bienvenida Berá Rosé"), mientras que las tres líneas de
degustación (`3 wines: reserva and blend`, `Degustação de toda a coleção`…), el aviso de
grupo bajo el mínimo y el de compra mínima son **redacción nueva**. Ese segundo grupo es el
que hay que leer con ojo.

---

## Trampas técnicas ya pagadas (no repetirlas)

- **Caché de imágenes**: si se reemplaza una foto manteniendo el nombre, el navegador y el
  optimizador de Next siguen sirviendo la vieja. Convención: sufijo `-vN` en el archivo
  (ver el encabezado de `scripts/optimize-fotos.mjs`).
  - **Las botellas son la excepción y hay que saberlo antes de desplegar.** No pueden
    versionar el nombre: el catálogo apunta a `/vinos/<slug>.png` y esa ruta llega por la
    red desde el panel de Afeleia, así que renombrar acá deja la ficha sin foto en
    producción. Las dos reemplazadas el 2026-08-17 (Betúm Yú y Estación Francia Tannat)
    **necesitan purgado de caché en Netlify** en el primer deploy que las lleve.
- **Tailwind v4 gira con la propiedad `rotate`, no con `transform`**: `rotate-180` compila
  a `rotate: 180deg`. Al depurar, `getComputedStyle(el).transform` dice `"none"` aunque el
  icono esté dado vuelta — cuesta una hora dar por rota una utilidad que funciona. Medir
  `.rotate`. (Y no medir nunca durante el recambio de CSS del HMR: recargar y medir en frío.)
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
