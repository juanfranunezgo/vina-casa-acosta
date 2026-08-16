# Diseño — Subpáginas de Actividades (`Dd`, `Dv`)

## Objetivo

Dar página propia a cada actividad del *Catálogo de Actividades 2026*: 3 talleres
de cocina y 8 experiencias de viña, más un hub de temporada para la Vendimia.
Hoy solo los 3 tours tienen ficha; el resto del catálogo no existe en el sitio.

El resultado debe poder compartirse pieza por pieza: si el dueño manda el enlace
del taller de pizzas a un cliente, ese cliente ve el taller de pizzas — no una
sección dentro de una página larga.

## Alcance

**Entra:**

| Contenido | Cantidad |
|---|---|
| Tours migrados a la jerarquía nueva | 3 |
| Talleres de cocina | 3 |
| Experiencias de viña | 8 |
| Hub de Vendimia | 1 |
| Índice `/actividades` — ajuste mínimo, sin reestructurar | 1 |
| Navegación (mega-menú) y tarjetas selectoras | — |

**15 páginas de actividad + índice = 16 rutas × 3 idiomas = 48 páginas.**

**No entra (`YAGNI` — no confirmado por el cliente):**

- **Reestructuración del índice `D`** (banda selectora de 5 categorías, sección
  propia de Talleres, banner de Vendimia). Queda diseñada y numerada en este
  spec, sin ejecutar; ver *Índice `D` — ajuste mínimo*.
- Landings de categoría (`/actividades/tours`, `/talleres`, `/experiencias`). El
  espacio de URL queda reservado y redirigido; ver *Redirecciones*.
- Página propia de Eventos privados. Sigue siendo la sección del índice.
- Ficha propia de la alianza Tren EFE: la vende un tercero.
- Precios de talleres y experiencias: el catálogo no los trae.
- Fotos reales por actividad y cobro en línea.

## Inventario de contenido

Fuente única: `web/catálogo-de-actividades-vina-casa-acosta.md`. Nada se inventa;
lo que el catálogo no dice, la página no lo afirma.

### Talleres de cocina — `/actividades/talleres/`

| Slug | Nombre | Duración | Mínimo | Meses |
|---|---|---|---|---|
| `pizzas` | Pizzas | 3 h + cierre | 8 | todos |
| `pastas` | Pastas | 3 h + cierre | 8 | todos |
| `noquis` | Ñoquis | 3 h + cierre | 8 | todos |

### Experiencias de viña — `/actividades/experiencias/`

| Slug | Nombre | Duración | Mínimo | Meses |
|---|---|---|---|---|
| `cosecha-tu-historia` | Cosecha tu historia | 3 h + cierre | 8 | todos |
| `enologo-por-un-dia` | Enólogo por un día | 3 h + cierre | 8 | todos |
| `taller-mimbre` | Taller mimbre | 4 h + cierre | 8 | todos |
| `trasquilado-de-alpacas` | Trasquilado de alpacas | 3 h + cierre | 20 | sep · oct · nov |
| `lagrimas-de-invierno` | Lágrimas de invierno | breve, de temporada | 10 | jul · ago |
| `apicultura` | Apicultura en Casa Acosta | 3 h + cierre | 8 | sep · oct |
| `yoga` | Yoga: respirar, estirar y compartir | 3 h + cierre | 8 | todos |
| `cena-sensorial` | Cena Sensorial | 3 h + cierre | 12 | todos |

*Taller mimbre* queda en Experiencias porque ahí lo ubica el catálogo, aunque su
nombre diga "taller". La taxonomía del cliente manda por sobre la coherencia
nominal.

### Vendimia — `/actividades/vendimia`

*Vendimia corta, pisa y celebra* (jornada completa, desde 35 personas, mar · abr ·
may) **no tiene ficha propia**: es el programa reservable dentro del hub. El hub
aporta contexto de temporada que la ficha sola no daría, y así no hay dos páginas
compitiendo por la misma búsqueda.

### Tours — `/actividades/tours/`

Sin cambios de contenido. Solo migran de URL y de namespace de mensajes.

| Slug nuevo | Nombre | Precio | Duración | Mínimo |
|---|---|---|---|---|
| `ombu` | Tour Ombú | $30.000 | 2 h | 2 |
| `bera` | Tour Berá | $35.000 | 2 h 30 min | 2 |
| `carmenere` | Tour Carménère | $45.000 | 3 h | 4 |

## Arquitectura de rutas

```
app/[locale]/actividades/
├── page.tsx                        D   índice · "Ver todo"
├── vendimia/page.tsx               Dv  hub de temporada
└── [categoria]/[slug]/page.tsx     Dd  ficha ×14
```

**Dos archivos de ruta, no ocho.** `generateStaticParams` produce las 14 ternas
`(locale, categoria, slug)` desde `data/activities.ts`.

`vendimia` es un segmento estático y gana por sobre `[categoria]`, que es
dinámico — precedencia documentada de Next. Es la única sutileza del enrutado,
así que no queda librada a la memoria: un test verifica que ningún slug de
actividad ni de categoría colisione con un segmento reservado.

Segmentos reservados: `vendimia`, y `eventos-privados` para cuando exista.

## Redirecciones

En `next.config.ts` (`async redirects()`), **no** en `netlify.toml`: las páginas
las contesta el handler de Next y los redirects del CDN se las saltan — es el
mismo motivo por el que el redirect de dominio necesitó `force = true`.

| Origen | Destino | Código | Por qué |
|---|---|---|---|
| `/:locale/actividades/tour-ombu` | `/:locale/actividades/tours/ombu` | **301** | La URL vieja no vuelve nunca |
| `/:locale/actividades/tour-bera` | `/:locale/actividades/tours/bera` | **301** | ídem |
| `/:locale/actividades/tour-carmenere` | `/:locale/actividades/tours/carmenere` | **301** | ídem |
| `/:locale/actividades/tours` | `/:locale/actividades#tours` | **307** | La landing está planificada |
| `/:locale/actividades/talleres` | `/:locale/actividades#talleres` | **307** | ídem |
| `/:locale/actividades/experiencias` | `/:locale/actividades#experiencias` | **307** | ídem |

La distinción no es cosmética. Un 301 lo cachea el navegador de forma agresiva y
cuesta revertirlo; las URLs padre van a dejar de redirigir el día que exista la
landing, así que deben ser temporales. Las de tour sí son definitivas.

`:locale` se restringe a `(es|en|pt)` para no capturar rutas ajenas. Si el
destino con fragmento (`#tours`) no funcionara en esta versión de Next, el
fallback es redirigir a `/:locale/actividades` sin ancla; se verifica en la
implementación contra `node_modules/next/dist/docs/`.

## Modelo de datos

`data/activities.ts` deja de mezclar copy con datos duros. **Una sola fuente por
cosa**: el texto vive en `messages/`, el dato en `data/`.

```ts
export type ActivityCategory = "tours" | "talleres" | "experiencias";

export type Activity = {
  /** Único en todo el catálogo: es también la clave en messages. */
  slug: string;
  category: ActivityCategory;
  /** CLP por persona. Ausente ⇒ la ficha pide cotización en vez de precio. */
  priceCLP?: number;
  minPeople: number;
  /** Meses en que se realiza, 1–12. Los doce = todo el año. */
  months: number[];
  /** ISO 8601 para schema.org ("PT3H"). Ausente cuando el catálogo no da
   *  una duración medible ("jornada completa", "actividad breve"). */
  durationISO?: string;
  image: string;
  premium?: boolean;
};
```

Helpers exportados: `activities`, `ACTIVITY_CATEGORIES`, `getActivity(category,
slug)`, `activitiesByCategory(category)`. El mega-menú, el índice, el sitemap y
el JSON-LD se derivan de ahí: agregar una actividad no obliga a tocar ningún
componente.

La alianza **Tren EFE** sale del array de experiencias y pasa a `alliances`. No
es una actividad de la viña, la vende un tercero y no tiene ficha: modelarla como
"experiencia con un flag raro" sería el parche que este diseño existe para evitar.

## i18n

Los namespaces `tours` y `tourDetail` se retiran y los reemplaza uno solo, que
cubre las 15 páginas. **`experiences` sobrevive**, pero solo como los textos de las tres
tarjetas del inicio y del índice (nombre y distintivo), que ahora son selectoras.
La alianza Tren EFE pasa de ahí a `alliances` en `data/`, porque su URL de compra
es un dato, no una traducción.

```jsonc
"activities": {
  "labels": {  /* plantilla: back, whatIncludes, programTitle, seasonTitle,
                  priceOnRequest, requestQuote, conditions…, form: {…} */ },
  "categories": { "tours": {…}, "talleres": {…}, "experiencias": {…} },
  "items": {
    "pizzas": {
      "name": "…", "tagline": "…", "intro": "…",
      "duration": "3 horas + cierre",
      "groupFrom": "Grupos desde 8 personas",
      "program": ["…", "…"],
      "closing": "…"
    }
  }
}
```

Mantener `tours`/`tourDetail` en paralelo al sistema nuevo dejaría dos formas de
describir lo mismo. Se migra.

**Polimorfismo de la ficha, derivado de la categoría** (sin flag redundante):

- `tours` → renderiza `includes` como tickets canjeables, más `wines`, `pairing`
  e `includesHighlight`. Es lo que ya hace la ficha actual.
- `talleres` y `experiencias` → renderizan `program` como línea de tiempo
  numerada. El catálogo entrega una secuencia ordenada (Desayuno campesino →
  Introducción al oficio → Tejido guiado → Cierre), no una lista de ítems
  sueltos: mostrarla como bullets perdería la información del orden.

**Los nombres de mes no se traducen a mano.** Salen de
`Intl.DateTimeFormat(locale, { month: "long" })` y la enumeración de
`Intl.ListFormat`. Cero claves nuevas por idioma y cero riesgo de desajuste.

Un test de paridad falla si una clave existe en `es` y falta en `en` o `pt`: es
lo que impide publicar una página a medio traducir.

## Secciones de la ficha (`Dd`)

Evoluciona la plantilla actual de tour. Numeración top → bottom:

| ID | Sección |
|---|---|
| Dd1 | Hero + breadcrumbs visibles + ficha rápida (Lugar · Duración · Participantes · Temporada) |
| Dd2 | Sub-nav ancla (Detalle · Galería · Reserva) |
| **Dd3** | **Estacionalidad** — franja de 12 meses con los disponibles encendidos |
| Dd4 | Detalle: tickets (tours) o programa de la jornada (talleres · experiencias) |
| Dd5 | Tarjeta lateral: precio **o** "a consultar", más condiciones |
| Dd6 | Galería (marcos de diseño hasta que haya fotos) |
| Dd7 | Reserva o cotización |
| Dd8 | Otras actividades de la misma categoría |

### Dd3 — Estacionalidad (componente nuevo)

Es el dato que el catálogo trae y que hoy no se usa en ninguna parte. Resuelve la
duda real del visitante ("¿lo puedo hacer en julio?"), da contenido único por
página y alimenta `validFrom`/`validThrough` del structured data.

- Marca semántica: `<ul>` de 12 `<li>`, no una fila de `<div>`.
- El mes disponible se distingue por color **y** por peso tipográfico, no solo
  por color (WCAG 1.4.1).
- Resumen textual para lectores de pantalla, construido con `Intl.ListFormat`:
  *"Disponible en septiembre, octubre y noviembre."*
- Cuando son los doce meses, se colapsa a la frase "Todo el año" en vez de pintar
  doce casillas iguales, que no comunicarían nada.

### Dd5 / Dd7 — Reserva bimodal

Un solo componente con dos estados, no dos formularios paralelos:

- **Con precio** → precio formateado (`tabular-nums`, moneda CLP en los tres
  locales) + "Reservar".
- **Sin precio** → "Precio a consultar" + "Solicitar cotización".

`TourReservationForm` pasa a `ActivityReservationForm` con props `activityName`,
`minPeople` y `mode` derivado de `priceCLP`. El formulario de Netlify se renombra
de `reserva-tour` a `reserva-actividad`, con campo `actividad` y `tipo`
(`reserva` | `cotizacion`).

**Consecuencia a asumir:** en el panel de Netlify los envíos históricos quedan
bajo el nombre viejo. No se pierden, quedan en otra lista. Se acepta porque el
nombre `reserva-tour` sería falso a partir de este trabajo.

Todo campo nuevo se declara en `public/__forms.html` — Netlify descarta en
silencio los que no figuren ahí.

## Hub de Vendimia (`Dv`)

| ID | Sección |
|---|---|
| Dv1 | Hero + breadcrumbs |
| Dv2 | Qué es la vendimia en Casa Acosta |
| Dv3 | El ciclo de la vid a lo largo del año |
| Dv4 | El programa: *corta, pisa y celebra* (jornada completa, desde 35 personas) |
| Dv5 | Otras actividades de temporada (Cosecha tu historia · Lágrimas de invierno) |
| Dv6 | Galería |
| Dv7 | Reserva / cotización |

Dv3 usa el patrón visual de `HistoriaTimeline` (B4), ya probado en el sitio, con
contenido propio. El copy de Dv2 y Dv3 es distinto del de la experiencia para no
canibalizar: el hub habla de la temporada; el programa, de la jornada.

## Índice `D` — ajuste mínimo

**La reestructuración del índice queda reservada, no se ejecuta.** El cliente no
la ha aprobado. La estructura de `D` no cambia: mismo hero, mismas pestañas de
`ActivitiesTabs`, mismas secciones D2 Tours / D3 Experiencias / D4 Eventos, misma
numeración en `NOMENCLATURA.md`.

Lo único que se toca en `D`:

- **Las tres tarjetas de D3 pasan a ser selectoras** (ver abajo).
- **Las tarjetas de tours (D2) apuntan a las URLs nuevas.** No es un cambio de
  diseño: los enlaces se derivan de `data/activities.ts` y siguen a los datos
  solos.

Cuando se apruebe, el índice reestructurado (banda selectora de 5 categorías,
sección propia de Talleres, banner de Vendimia) se numera `D1 · D1b · D2
Vendimia · D3 Tours · D4 Talleres · D5 Experiencias · D6 Eventos`. Queda escrito
acá para no volver a diseñarlo.

## Tarjetas selectoras (`CategoryChooserCard`)

Las tres tarjetas que hoy existen en el mosaico del inicio (`A4`) y en la sección
de experiencias del índice (`D3`) dejan de ser decorativas y pasan a preguntar
cuál quieres ver. **No se agregan tarjetas nuevas: se les da función a las que ya
están.**

| Tarjeta | Menú |
|---|---|
| Vendimia 2026 | **9 entradas**: Vendimia (hub, destacada arriba) + las 8 experiencias |
| Talleres y clases prácticas | 3 talleres |
| Experiencia Tren EFE | sin menú — enlace externo a la venta de pasajes |

La tarjeta conserva su nombre y su foto. El menú de Vendimia abre con Vendimia
arriba y, tras un separador, las otras ocho: así las 9 entradas caben sin que la
tarjeta prometa una cosa y entregue otra.

Tren EFE no lleva selector: anunciar un menú que no existe sería mentir sobre el
destino del clic.

**Comportamiento.** La tarjeta es un `<button>` con `aria-expanded` y
`aria-controls`. Al activarse despliega un panel flotante: anclado a la tarjeta
en escritorio, subiendo desde el borde inferior en móvil. Cierra con `Escape`,
con clic fuera o al elegir una opción. Sin *focus trap*: es un menú, no un
diálogo.

**Regla que hace que esto sume y no reste para SEO.** Los enlaces del panel se
renderizan en el servidor y solo se **ocultan** hasta que el panel abre (atributo
`hidden` / CSS). No se renderizan condicionalmente al hacer clic. Si dependieran
de un evento del cliente, esos 12 enlaces internos no existirían para el crawler.

Con esto las 15 páginas quedan alcanzables desde el inicio en un salto: 3 por las
tarjetas de tour del mosaico y 12 por los dos selectores. Es la compensación
exacta de no reestructurar el índice — el enlazado interno no queda esperando esa
reestructuración.

## Navegación (`NV`)

Mega-menú bajo "Actividades", en el orden pedido:

```
Vendimia · Tours · Talleres · Experiencias · Eventos privados
                                                    Ver todo
```

- Los 15 destinos no caben en el desplegable de 248 px actual: pasa a panel ancho
  con columnas, una por categoría, y "Ver todo" al pie.
- Vendimia es una entrada directa al hub, no una columna con lista.
- Cada encabezado de columna es un enlace a su ancla del índice, mientras no
  exista la landing.
- **Es el enlazado interno que sostiene las 15 páginas**: al estar en el navbar,
  cada ficha queda a un salto desde cualquier página del sitio. Mientras el
  índice no se reestructure, esto y las tarjetas selectoras son la vía completa.
- Móvil: acordeón de dos niveles dentro del drawer existente.
- Teclado: apertura con foco, cierre con `Escape`, orden de tabulación natural,
  `aria-expanded` en el disparador. Sin *focus trap*: es un menú, no un diálogo.
- Se deriva de `data/activities.ts`: agregar una actividad la agrega al menú.

La maqueta se valida con el usuario antes de codearse.

## Imágenes

Cero archivos nuevos. Todo sale de fotos ya optimizadas en `public/`:

```ts
const CATEGORY_IMAGE: Record<ActivityCategory, string> = {
  talleres:     "/images/actividades/talleres.jpg",
  experiencias: "/images/actividades/pareja-columpio.webp",
  // los tours conservan la suya
};
```

Vendimia usa `vendimia-2026.jpg`; Eventos, `eventos.jpg`. El campo `image` de una
actividad pisa la de su categoría: **una línea por foto** cuando lleguen las
reales, sin tocar componentes.

Las galerías (Dd6, Dv6) usan marcos de diseño, no fotos de stock: una foto que no
es de la viña, servida como `og:image`, es una promesa que la visita no cumple.

## SEO y structured data

Por página de detalle:

- `alternatesFor(locale, path)` — canonical + hreflang `es`/`en`/`pt` +
  `x-default`. La función ya existe en `lib/alternates.ts`.
- `title` único y `description` salen del propio ítem (`activities.items.{slug}`:
  `name` y `tagline`), igual que hoy hace la ficha de tour. No se crea un
  namespace `metadata` paralelo por actividad, que sería una segunda fuente de
  verdad para el mismo texto. El hub de Vendimia sí lleva su bloque propio en
  `activities.vendimia`, porque no es un ítem del catálogo.
- Open Graph y Twitter card completos, con la imagen de la actividad.
- **`BreadcrumbList` + breadcrumbs visibles**: *Inicio › Actividades › Talleres ›
  Pizzas*. Es lo que desbloquea la jerarquía nueva y el marcado es honesto
  porque la miga existe en pantalla.
- **`Product`** con `Offer` **solo cuando hay precio**. Sin precio no se emite
  `offers`: un `Offer` sin `price` no produce rich result y afirmarlo sería
  marcado vacío. Tampoco se declara `availability`, criterio ya establecido en
  `lib/siteJsonLd.ts`.
- Nodo `Winery`/`LocalBusiness` por `@id`, reutilizando el grafo existente.

**Tipos evaluados y descartados:** `Event` (exige `startDate`; no hay fechas
publicadas), `Course` para los talleres (su rich result exige
`hasCourseInstance` con fechas), `Service` (más preciso en abstracto, pero
rompería la consistencia con los tours que `main` ya emite como `Product`).

Sitemap: `app/sitemap.ts` deriva las rutas de `data/activities.ts` más
`/actividades/vendimia`. Agregar una actividad la mete sola. Pasa de 26 a 38
rutas (78 → 114 URLs con los tres idiomas).

## Accesibilidad y rendimiento

- Un solo `<h1>` por página; jerarquía `h2`/`h3` sin saltos.
- `<article>`, `<section>`, `<nav>`, `<time>` donde corresponde. `<div>` solo
  para layout.
- Todas las páginas son Server Components. Solo el mega-menú, las pestañas y el
  formulario llevan `"use client"`.
- `next/image` con `sizes` correcto y dimensiones reservadas (CLS).
- Animaciones 150–300 ms sobre `transform`/`opacity`, con `prefers-reduced-motion`
  respetado.
- Foco visible en todo elemento interactivo; área táctil mínima 44 px.

## Nomenclatura

`docs/NOMENCLATURA.md` se actualiza **antes** que el código:

| ID | Página |
|---|---|
| `D` | Índice de Actividades — **sin cambios** (D1 · D1b · D2 · D3 · D4) |
| `Dd` | Ficha de actividad (Dd1 – Dd8) |
| `Dv` | Hub de Vendimia (Dv1 – Dv7) |
| `Dc` | Landing de categoría — **reservado**, aún no existe |
| `De` | Eventos privados — **reservado**, aún no existe |

## Decisiones tomadas

1. **URLs anidadas por categoría**, con página propia por actividad.
2. **Slugs de tour renombrados** (`tour-ombu` → `tours/ombu`): ya se paga el 301,
   conviene llegar a la URL correcta y no a `tours/tour-ombu`.
3. **Sin precio ⇒ cotización.** No se inventan cifras.
4. **Vendimia como hub**, absorbiendo *corta, pisa y celebra*.
5. **Sin landings de categoría ni página de eventos**, con el espacio de URL
   reservado y redirigido en temporal.
6. **Una imagen por categoría**, reutilizando fotos existentes.
7. **Taxonomía del catálogo respetada** (mimbre queda en Experiencias).
8. **Tarjetas selectoras sobre las tres tarjetas que ya existen**, en inicio y en
   `/actividades`, con los enlaces renderizados en servidor y ocultos — no
   creados al hacer clic.
9. **El índice `D` no se reestructura**: no está aprobado. Queda diseñado y
   numerado en este spec para cuando lo esté.

## Deuda detectada en código existente (regla 14 — se avisa, no se corrige solo)

1. **`data/activities.ts`: campos muertos.** `name`, `description`, `highlights`
   y `duration` no los lee nadie; toda lectura pasa por `messages/*.json`
   (verificado con grep sobre `app/`, `components/` y `lib/`). **Se eliminan en
   este trabajo**, porque replicar esa duplicación en 14 actividades es
   exactamente el problema que el diseño evita.
2. **Tours Ombú y Berá usan fotos remotas de Unsplash.** Su `og:image` apunta a
   una imagen que no es de la viña, y obliga a mantener `images.unsplash.com` en
   la CSP y en `remotePatterns`. **Fuera de alcance**; se propone reemplazarlas
   cuando haya foto propia y cerrar esa excepción.
3. **`tourDetail.otherTours` dice "Otras experiencias que te pueden interesar".**
   Con la taxonomía nueva, "experiencias" pasa a ser una categoría concreta y el
   label induce a error. Se renombra en la migración de namespace.
4. **`ActivitiesTabs` tiene sus 3 pestañas escritas a mano** y no contempla
   Talleres ni Vendimia. **Fuera de alcance**: se resuelve con la
   reestructuración del índice, que el cliente aún no aprobó. Se deja como está.
5. **`HomeActivitiesShowcase` mezcla filtros, mosaico y banner de eventos en un
   solo componente de 330 líneas** — por encima de la señal de alerta de ~200 de
   las reglas de frontend. Se le cambian las tarjetas por `CategoryChooserCard`;
   **no se refactoriza el resto**, que excede este trabajo.
6. **El filtro "Experiencias" del mosaico `A4` seguirá mostrando 3 tarjetas
   selectoras y no 8 experiencias.** Es coherente con no reestructurar, pero
   conviene saberlo: es contenido que existe y el inicio no lista.

## Verificación

Tests al estilo del repo (`node --test "tests/*.test.mjs"`, ASCII puro):

- `actividades-routing.test.mjs` — sin colisiones entre slugs, categorías y
  segmentos reservados; slug único en todo el catálogo.
- `actividades-i18n-parity.test.mjs` — toda clave de `activities` existe en
  `es`, `en` y `pt`.
- `actividades-sitemap.test.mjs` — cada actividad y el hub están en el sitemap.
- `actividades-redirects.test.mjs` — las 3 URLs viejas de tour redirigen en 301
  y las 3 URLs padre en 307.
- `category-chooser-source.test.mjs` — el panel se oculta con `hidden`, no se
  renderiza condicionalmente. Es la regla que sostiene los 15 enlaces internos y
  la única que se rompe sin síntoma visible: la tarjeta seguiría funcionando en
  pantalla mientras el crawler deja de ver los enlaces.

Más `npm run lint`, `npm run typecheck` y `npm run build` (verifica TS y las 48
rutas SSG). El tiempo de build se mide antes y después en la fase 1 y se registra
en `docs/HANDOFF.md`.

## Fases

| # | Entrega | Cómo se revisa |
|---|---|---|
| 0 | Rama desde `main` + `NOMENCLATURA.md` actualizado | doc |
| 1 | Datos + ruta `[categoria]/[slug]` + redirects + sitemap + tests. Tours migrados | build verde + tiempo medido |
| 2 | Plantilla `Dd` (estacionalidad, programa, tarjeta bimodal) sobre los 3 tours | 3 páginas |
| 3 | 3 talleres + 8 experiencias en español | 11 páginas |
| 4 | Hub de Vendimia | 1 página |
| 5 | `CategoryChooserCard` en `A4` y `D3` + mega-menú `NV` | navegación completa |
| 6 | EN/PT + JSON-LD + breadcrumbs + auditoría final | 48 páginas |

## Criterio de éxito

- Las 48 páginas construyen, con canonical y hreflang correctos.
- Las 3 URLs viejas de tour redirigen sin cadenas.
- Ninguna URL padre devuelve 404.
- Ninguna afirmación en pantalla ni en el structured data que el catálogo no
  respalde: sin precios inventados, sin fechas inventadas, sin fotos que no sean
  de la viña.
- Agregar la actividad número 15 cuesta un objeto en `data/` y un bloque por
  idioma en `messages/`. Nada más.
