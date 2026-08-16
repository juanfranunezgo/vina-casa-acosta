# Actividades — Contenido del catálogo (plan 2 de 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cargar las 10 actividades que le faltan al sitio —2 talleres de cocina y 8 experiencias de viña— sobre la arquitectura que dejó el plan 1, y reparar los dos defectos que la migración de URLs dejó atrás.

**Architecture:** No se crean componentes ni rutas nuevas. Cada actividad son dos cosas: un objeto de datos duros en `data/activities.ts` y un bloque de copy en `activities.items` de los tres archivos de `messages/`. Ruta, sitemap, JSON-LD y enlaces cruzados se derivan solos. La única excepción es *Cena Sensorial*, la única actividad del catálogo sin lista de contenidos, que obliga a que el bloque de detalle sepa no dibujar un encabezado que promete una lista inexistente.

**Tech Stack:** Next.js 16.2.6 · React 19.2.4 · TypeScript · Tailwind v4 · next-intl 4.11.2 · `node:test` + `node:assert/strict` (Node 24 importa `.ts` directo por type stripping; `tests/alias-hook.mjs` enseña el alias `@/`).

**Spec:** [`docs/superpowers/specs/2026-08-15-actividades-subpaginas-design.md`](../specs/2026-08-15-actividades-subpaginas-design.md) — fase 3 de su tabla de entregas.

**Plan anterior:** [`2026-08-15-actividades-fundacion.md`](2026-08-15-actividades-fundacion.md) (plan 1, completo).

**Fuente de contenido:** `vina-casa-acosta/web/catálogo-de-actividades-vina-casa-acosta.md` — fuera del repo, es material del cliente.

## Global Constraints

- **Repo:** `vina-casa-acosta/web/sitio-web`, rama `feat/actividades-subpaginas` (continúa donde quedó el plan 1, en `b9a47ae`).
- **Comentarios y UI en español; código en inglés; commits en inglés (Conventional Commits).**
- **Archivos de test en ASCII puro** — sin tildes ni `ñ`. Convención vigente en `tests/*.test.mjs`.
- **Toda clave de `messages/` se escribe en los 3 idiomas a la vez.** next-intl NO falla cuando falta una clave: `getMessageFallback` devuelve la ruta de la clave como texto y `t.raw()` devuelve ese string donde el código espera un array (`.map is not a function` en pleno build). Es el motivo de existir de `tests/actividades-i18n-parity.test.mjs`.
- **El `intro` de cada actividad es el texto del cliente, verbatim.** Se corrige puntuación y se quita el marcado de Markdown, nada más. Lo que sí se escribe acá es `name`, `description`, `tagline` y `closing`: cuatro campos que el catálogo no trae. Quedan marcados como **copy sin validar por el cliente**, igual que el resto del sitio.
- **Ninguna actividad nueva lleva `highlights`.** Ese array lo lee un solo lugar del sitio —`app/[locale]/actividades/page.tsx:213`, dentro de `tours.map`— así que escribirlo para talleres y experiencias son 90 strings en tres idiomas que nada renderiza. Es la misma duplicación que el plan 1 existió para borrar. Se escriben cuando las tarjetas selectoras del plan 3 los necesiten, con el consumidor a la vista. El test de paridad los valida solo si existen, así que su ausencia no rompe nada.
- **Las fotos se repiten y está aceptado.** Las 8 experiencias comparten una imagen y los 3 talleres otra: son las únicas disponibles. Decisión del cliente, que las va a reemplazar más adelante. Cuando lleguen es una línea `image` por actividad, sin tocar componentes.
- **No se inventan datos duros.** Precio, mínimo de personas, meses y duración salen del catálogo tal cual. Ninguna de las 10 actividades nuevas publica precio: las 10 fichas salen en modo cotización, que es lo que el plan 1 dejó construido.
- **`durationISO` solo cuando el catálogo da una duración medible.** "Actividad breve de temporada" y "Jornada completa" van sin él — el test `tests/actividades-catalogo.test.mjs:72` exige formato `PT…` a lo que exista.
- **Slugs en ASCII, sin tildes ni `ñ`**: son segmento de URL y clave de `messages` a la vez.
- **Este plan NO toca la navegación.** Ni el navbar (sigue mostrando solo los 3 tours), ni la reestructuración del índice `D`, que el cliente no aprobó. Ver *Consecuencia conocida* más abajo.
- **`AGENTS.md`: este Next tiene breaking changes.** Antes de tocar `redirects()` o cualquier API de rutas, leer la guía correspondiente en `node_modules/next/dist/docs/`.
- **El orden del array `activities` se ve en pantalla.** Gobierna el bloque "otras actividades de la misma categoría" de cada ficha. Dentro de cada categoría manda el **orden del catálogo del cliente**, no el orden en que las tareas las van agregando:
  - talleres: `pizzas` · `pastas` · `noquis`
  - experiencias: `cosecha-tu-historia` · `enologo-por-un-dia` · `mimbre` · `alpacas` · `lagrimas-de-invierno` · `apicultura` · `yoga` · `cena-sensorial`

  Los tours conservan el suyo (de menor a mayor precio), que `tests/actividades-catalogo.test.mjs:96` afirma. Cada tarea dice **entre qué dos vecinos** inserta, justamente porque no las agrega en ese orden.
- **Gate de cada tarea:** `npm test` y `npm run typecheck`. `npm run build` al cierre (Task 7).
- **`npm run build` borra `.next`** y deja zombi al dev server. Bajar el dev, buildear, y recién ahí volver a levantarlo.

## Consecuencia conocida: las 10 fichas nacen huérfanas

Al terminar este plan el sitio tendrá 30 URLs nuevas (10 actividades × 3 idiomas) a las que **no llega ningún enlace desde el sitio**:

- El submenú del navbar itera `tours`, no `activities` (`components/Navbar.tsx:214` y `:406`): muestra 3 entradas y seguirá mostrando 3.
- El índice `/actividades` tiene tres secciones —`#tours`, `#experiencias`, `#eventos`— y la de "experiencias" son 3 tarjetas-puerta escritas a mano (Vendimia 2026 · Talleres · Tren EFE) que no enlazan a ninguna ficha.
- Lo único que las conecta es el bloque "otras actividades de la misma categoría" de cada ficha, que las agrupa en dos islas: 3 talleres entre sí y 8 experiencias entre sí. Se entra a una isla solo por el sitemap.

Es deliberado y es el reparto que fijó el spec: **el mega-menú del plan 3 es el enlazado interno que sostiene estas páginas**. La consecuencia práctica es que **el plan 3 pasa a ser prerequisito para publicar**, no un extra: mergear este plan a `main` sin el siguiente le entrega a Google 30 URLs huérfanas en el sitemap.

La alternativa —darle al índice una sección de Talleres y llenar la de Experiencias— es la reestructuración de `D` que el cliente todavía no aprobó, y además dejaría mintiendo por omisión a `ActivitiesTabs`, que tiene sus 3 pestañas escritas a mano. No se hace acá.

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `lib/siteJsonLd.ts` | `TourEntry` recibe la ruta ya armada en vez de reconstruirla desde el slug. | Modificar |
| `app/[locale]/actividades/page.tsx` | Pasa `path: activityPath(tour)` al constructor de JSON-LD. Cambia el destino de la miga de talleres. | Modificar |
| `data/activities.ts` | Los 10 objetos nuevos, en orden de catálogo. | Modificar |
| `messages/es.json` | 10 bloques en `activities.items`. Fuente del copy. | Modificar |
| `messages/en.json` | Los mismos 10 bloques, traducidos. | Modificar |
| `messages/pt.json` | Los mismos 10 bloques, traducidos. | Modificar |
| `app/[locale]/actividades/[categoria]/[slug]/page.tsx` | El encabezado "¿Qué incluye?" deja de dibujarse cuando no hay lista. | Modificar |
| `next.config.ts` | El redirect de `/actividades/talleres` deja de apuntar a un ancla inexistente. | Modificar |
| `tests/actividades-jsonld.test.mjs` | Afirma que el índice emite la ruta anidada, no la plana. | Modificar |
| `tests/actividades-anclas.test.mjs` | Toda ancla de categoría a la que enlaza el sitio existe en el índice. | Crear |
| `tests/actividades-detalle-source.test.mjs` | El encabezado de la lista no se dibuja sin lista. | Crear |
| `docs/HANDOFF.md` | Bitácora técnica. | Modificar |

---

### Task 1: La URL plana que quedó en el JSON-LD del índice

El plan 1 movió las fichas de `/actividades/{slug}` a `/actividades/{categoria}/{slug}` y dejó `tests/actividades-jsonld.test.mjs:94` afirmándolo. Ese test cubre `buildActivityJsonLd` —la ficha— pero **no** `buildActividadesJsonLd`, que es el que emite el `ItemList` del índice. Ahí quedó la construcción vieja:

```ts
url: `${SITE_URL}/${locale}/actividades/${tour.slug}`,   // lib/siteJsonLd.ts:216 y :225
```

Con los slugs nuevos eso resuelve a `/es/actividades/ombu`, que no es la ruta nueva ni una de las tres URLs viejas con redirect: es un **404**. El índice le está declarando a Google tres `Product` cuya `url` y cuya `offers.url` no existen, y la ficha del mismo tour declara otra. Se arregla antes de multiplicar el contenido por diez.

La corrección no es reconstruir la ruta acá: es **recibirla ya armada**, para que `activityPath()` siga siendo la única función del repo que arma esta URL.

**Files:**
- Modify: `lib/siteJsonLd.ts:163-170` (tipo `TourEntry`), `:206-228` (uso)
- Modify: `app/[locale]/actividades/page.tsx:92-98`
- Test: `tests/actividades-jsonld.test.mjs`

**Interfaces:**
- Produces: `TourEntry` gana el campo obligatorio `path: string` (ruta sin prefijo de idioma, tal como la devuelve `activityPath()`), y pierde el uso de `slug` para armar URLs.

- [ ] **Step 1: Escribir el test que falla**

Agregar al final de `tests/actividades-jsonld.test.mjs` (recordar: ASCII puro):

```js
const { buildActividadesJsonLd } = await import("@/lib/siteJsonLd");

const COPY_INDICE = { name: "Actividades", description: "Bajada del indice" };

const ENTRADA = {
  slug: "ombu",
  name: "Tour Ombu",
  description: "Bajada",
  path: "/actividades/tours/ombu",
  priceCLP: 30000,
  image: "/images/actividades/tour-carmenere.webp",
};

test("el ItemList del indice apunta a la ruta anidada, no a la plana", () => {
  const graph = buildActividadesJsonLd("es", COPY_INDICE, [ENTRADA]);
  const [lista] = nodes(graph, "ItemList");
  const producto = lista.itemListElement[0].item;
  assert.match(producto.url, /\/es\/actividades\/tours\/ombu$/);
  assert.doesNotMatch(producto.url, /\/es\/actividades\/ombu$/);
});

test("la URL del Offer del indice es la misma del Product", () => {
  const graph = buildActividadesJsonLd("es", COPY_INDICE, [ENTRADA]);
  const [lista] = nodes(graph, "ItemList");
  const producto = lista.itemListElement[0].item;
  assert.equal(producto.offers.url, producto.url);
});

test("el indice y la ficha declaran la MISMA url para la misma actividad", () => {
  // Dos Product con la misma identidad y distinta url son dos señales que se
  // contradicen. La ficha manda: es la pagina que existe.
  const indice = buildActividadesJsonLd("es", COPY_INDICE, [ENTRADA]);
  const ficha = buildActivityJsonLd("es", CON_PRECIO, COPY, CRUMBS);
  const [lista] = nodes(indice, "ItemList");
  const [productoFicha] = nodes(ficha, "Product");
  assert.equal(lista.itemListElement[0].item.url, productoFicha.url);
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --test-name-pattern="indice"`
Expected: FAIL. El primero por `doesNotMatch` (la url sale `/es/actividades/ombu`), el tercero por desigualdad entre `/es/actividades/ombu` y `/es/actividades/tours/ombu`.

- [ ] **Step 3: Agregar `path` al tipo**

En `lib/siteJsonLd.ts`, reemplazar el tipo `TourEntry` (líneas 163-170) por:

```ts
type TourEntry = {
  slug: string;
  name: string;
  description: string;
  /**
   * Ruta de la ficha SIN prefijo de idioma, tal como la arma `activityPath()`.
   * Llega armada a propósito: reconstruirla acá desde el slug fue lo que dejo
   * el ItemList apuntando a la URL plana anterior a la migracion por categoria.
   */
  path: string;
  /** Ausente cuando la actividad no publica precio: entonces no se emite `offers`. */
  priceCLP?: number;
  image: string;
};
```

- [ ] **Step 4: Usar `path` en las dos URLs**

En la misma función, reemplazar las dos apariciones de la plantilla vieja:

```ts
          url: `${SITE_URL}/${locale}${tour.path}`,
```

y, dentro de `offers`:

```ts
                  url: `${SITE_URL}/${locale}${tour.path}`,
```

- [ ] **Step 5: Pasar la ruta desde el índice**

En `app/[locale]/actividades/page.tsx`, en el `tours.map` que arma el JSON-LD (líneas 92-98), agregar la ruta. `activityPath` ya está importado en el archivo:

```tsx
    tours.map((tour) => ({
      slug: tour.slug,
      name: tTour(`${tour.slug}.name`),
      description: tTour(`${tour.slug}.description`),
      path: activityPath(tour),
      priceCLP: tour.priceCLP,
      image: tour.image,
    })),
```

- [ ] **Step 6: Correr los tests y el typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, 108 tests.

- [ ] **Step 7: Commit**

```bash
git add lib/siteJsonLd.ts app/[locale]/actividades/page.tsx tests/actividades-jsonld.test.mjs
git commit -m "fix(seo): point the index ItemList at the activity page that exists"
```

---

### Task 2: Los dos talleres de cocina que faltan

Pastas y Ñoquis son gemelos de Pizzas: misma duración, mismo mínimo, todo el año, sin precio, y una lista de **inclusiones** (no una secuencia). Van primero porque verifican el patrón completo —datos, tres idiomas, ficha en modo cotización— sobre la forma de página que ya está probada.

Nota de contenido: el catálogo repite "Cocción en horno tradicional" en las tres, incluida la de ñoquis, donde el plato se hierve. Se transcribe tal cual: es el texto del cliente y corregirlo por cuenta propia sería inventar. Queda anotado en el handoff para preguntárselo.

**Files:**
- Modify: `data/activities.ts:78-119` (array `activities`)
- Modify: `messages/es.json`, `messages/en.json`, `messages/pt.json` (`activities.items`)

**Interfaces:**
- Consumes: el tipo `Activity` y la constante `TODO_EL_ANO` de `data/activities.ts`.
- Produces: los slugs `pastas` y `noquis` bajo la categoría `talleres`, que `generateStaticParams` convierte en 6 páginas.

- [ ] **Step 1: Agregar los datos duros**

Los datos van antes que el copy a propósito: así se ve fallar la red que protege las traducciones.

Agregar los dos objetos a `data/activities.ts`, justo después del bloque `pizzas` (línea 88) y antes de `ombu`:

```ts
  {
    slug: "pastas",
    category: "talleres",
    minPeople: 8,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.talleres,
  },
  {
    slug: "noquis",
    category: "talleres",
    minPeople: 8,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.talleres,
  },
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test`
Expected: FAIL en `actividades-i18n-parity.test.mjs`, con `es: falta activities.items.pastas`. Es exactamente el error que en el plan 1 se publicó en silencio tres veces.

- [ ] **Step 3: Copy en español**

En `messages/es.json`, dentro de `activities.items`, después del bloque `pizzas`:

```json
      "pastas": {
        "name": "Taller de Pastas",
        "description": "Prepara la masa desde cero, estírala y córtala en distintas formas, y comparte las pastas recién hechas con una copa de vino.",
        "tagline": "Del amasado al plato, con una copa en la mano",
        "intro": "Prepararemos la masa desde cero, la amasaremos, estiraremos y cortaremos en distintas formas. Luego cocinaremos y compartiremos en grupo, disfrutando las pastas recién hechas con una copa de vino.",
        "duration": "3 horas + cierre",
        "groupFrom": "Grupos desde 8 personas",
        "reservationNote": "Sujeto a disponibilidad — coordinamos la fecha contigo",
        "includes": [
          "Ingredientes frescos y utensilios.",
          "Recetas impresas para llevar.",
          "Cocción en horno tradicional.",
          "Degustación de vinos: de bienvenida, durante el taller y al cierre.",
          "Jugos naturales para menores."
        ],
        "closing": "Te vas con la receta, el corte aprendido y la sobremesa."
      },
      "noquis": {
        "name": "Taller de Ñoquis",
        "description": "Prepara la masa, dales forma a los ñoquis y acompáñalos con salsas caseras para cerrar con una cena compartida.",
        "tagline": "Formar, cocinar y cerrar con una cena de grupo",
        "intro": "Prepararemos la masa desde cero, la amasaremos, cortaremos y daremos forma a los ñoquis para luego cocinarlos y acompañarlos con salsas caseras. Finalmente, compartiremos este plato terminado en una cena grupal, disfrutando la experiencia.",
        "duration": "3 horas + cierre",
        "groupFrom": "Grupos desde 8 personas",
        "reservationNote": "Sujeto a disponibilidad — coordinamos la fecha contigo",
        "includes": [
          "Ingredientes frescos y utensilios.",
          "Recetas impresas para llevar.",
          "Cocción en horno tradicional.",
          "Degustación de vinos: de bienvenida, durante el taller y al cierre.",
          "Jugos naturales para menores."
        ],
        "closing": "Te vas con la receta, las salsas anotadas y la cena compartida."
      },
```

- [ ] **Step 4: Copy en inglés**

En `messages/en.json`, misma posición:

```json
      "pastas": {
        "name": "Pasta Workshop",
        "description": "Make the dough from scratch, roll it out and cut it into different shapes, then share the fresh pasta with a glass of wine.",
        "tagline": "From the dough to the plate, glass in hand",
        "intro": "We'll make the dough from scratch, knead it, roll it out and cut it into different shapes. Then we'll cook it and share it as a group, enjoying the fresh pasta with a glass of wine.",
        "duration": "3 hours + closing",
        "groupFrom": "Groups from 8 people",
        "reservationNote": "Subject to availability — we arrange the date with you",
        "includes": [
          "Fresh ingredients and utensils.",
          "Printed recipes to take home.",
          "Cooked in a traditional oven.",
          "Wine tasting: on arrival, during the workshop and at the close.",
          "Natural juices for under-18s."
        ],
        "closing": "You leave with the recipe, the cut you learned, and the table talk."
      },
      "noquis": {
        "name": "Gnocchi Workshop",
        "description": "Make the dough, shape the gnocchi and pair them with homemade sauces to close with a shared dinner.",
        "tagline": "Shape it, cook it, and close with a group dinner",
        "intro": "We'll make the dough from scratch, knead it, cut it and shape the gnocchi, then cook them and pair them with homemade sauces. To finish, we'll share the finished dish over a group dinner.",
        "duration": "3 hours + closing",
        "groupFrom": "Groups from 8 people",
        "reservationNote": "Subject to availability — we arrange the date with you",
        "includes": [
          "Fresh ingredients and utensils.",
          "Printed recipes to take home.",
          "Cooked in a traditional oven.",
          "Wine tasting: on arrival, during the workshop and at the close.",
          "Natural juices for under-18s."
        ],
        "closing": "You leave with the recipe, the sauces written down, and the dinner you shared."
      },
```

- [ ] **Step 5: Copy en portugués**

En `messages/pt.json`, misma posición:

```json
      "pastas": {
        "name": "Oficina de Massas",
        "description": "Prepare a massa do zero, abra e corte em diferentes formatos, e compartilhe as massas recém-feitas com uma taça de vinho.",
        "tagline": "Da massa ao prato, com uma taça na mão",
        "intro": "Vamos preparar a massa do zero, sovar, abrir e cortar em diferentes formatos. Depois vamos cozinhar e compartilhar em grupo, aproveitando as massas recém-feitas com uma taça de vinho.",
        "duration": "3 horas + encerramento",
        "groupFrom": "Grupos a partir de 8 pessoas",
        "reservationNote": "Sujeito à disponibilidade — combinamos a data com você",
        "includes": [
          "Ingredientes frescos e utensílios.",
          "Receitas impressas para levar.",
          "Cozimento em forno tradicional.",
          "Degustação de vinhos: de boas-vindas, durante a oficina e no encerramento.",
          "Sucos naturais para menores."
        ],
        "closing": "Você leva a receita, o corte aprendido e a conversa da mesa."
      },
      "noquis": {
        "name": "Oficina de Nhoque",
        "description": "Prepare a massa, dê forma ao nhoque e acompanhe com molhos caseiros para encerrar com um jantar compartilhado.",
        "tagline": "Modelar, cozinhar e encerrar com um jantar em grupo",
        "intro": "Vamos preparar a massa do zero, sovar, cortar e dar forma ao nhoque para depois cozinhá-lo e acompanhá-lo com molhos caseiros. No final, vamos compartilhar esse prato pronto em um jantar em grupo.",
        "duration": "3 horas + encerramento",
        "groupFrom": "Grupos a partir de 8 pessoas",
        "reservationNote": "Sujeito à disponibilidade — combinamos a data com você",
        "includes": [
          "Ingredientes frescos e utensílios.",
          "Receitas impressas para levar.",
          "Cozimento em forno tradicional.",
          "Degustação de vinhos: de boas-vindas, durante a oficina e no encerramento.",
          "Sucos naturais para menores."
        ],
        "closing": "Você leva a receita, os molhos anotados e o jantar compartilhado."
      },
```

- [ ] **Step 6: Correr los tests y el typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS. La paridad de i18n vuelve a verde y el catálogo suma 2 slugs únicos.

- [ ] **Step 7: Verificar las dos fichas en el navegador**

Run: `npm run dev`
Abrir `/es/actividades/talleres/pastas` y `/es/actividades/talleres/noquis`.
Expected: hero con el nombre, ficha rápida con "3 horas + cierre" y "Grupos desde 8 personas", franja de estacionalidad en verde los 12 meses, lista de inclusiones **sin numerar**, tarjeta de reserva en "Precio a consultar" y formulario en modo cotización. Ningún texto tipo `activities.items.pastas.name` en pantalla.

- [ ] **Step 8: Commit**

```bash
git add data/activities.ts messages/es.json messages/en.json messages/pt.json
git commit -m "feat(activities): add the two cooking workshops the catalog already sells"
```

---

### Task 3: La ficha que no tiene lista

*Cena Sensorial* es la única de las 12 actividades del catálogo que no trae ni inclusiones ni programa: describe "cinco tiempos maridados" pero no los enumera. Inventarlos sería el mismo pecado que inventar un precio.

Hoy la ficha dibuja el encabezado `¿Qué incluye?` y la bajada `Durante la experiencia disfrutarás de:` **incondicionalmente** (`page.tsx:363-368`), y recién después decide si hay lista. Sin lista queda un encabezado que promete algo y un párrafo que introduce el vacío. Se corrige antes de cargar la actividad, para que la ficha nazca bien.

**Files:**
- Modify: `app/[locale]/actividades/[categoria]/[slug]/page.tsx:360-381`
- Modify: `data/activities.ts` (array `activities`)
- Modify: `messages/{es,en,pt}.json`
- Test: `tests/actividades-detalle-source.test.mjs` (crear)

**Interfaces:**
- Consumes: `includes` y `program` de `activities.items.{slug}`, ya leídos como `asList()` en la página.
- Produces: el slug `cena-sensorial` bajo `experiencias`.

- [ ] **Step 1: Escribir el test que falla**

Es un guard de fuente, igual que `tests/season-strip-source.test.mjs`: lo que se afirma es una decisión de estructura, no un valor calculado. Crear `tests/actividades-detalle-source.test.mjs` (ASCII puro):

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Cena Sensorial es la unica actividad del catalogo sin inclusiones ni
 * programa: el cliente describe "cinco tiempos" y no los enumera. Inventarlos
 * seria marcado falso. Lo que queda por resolver es la pagina: un encabezado
 * "Que incluye?" seguido de nada promete una lista que no existe.
 */

const fuente = await readFile(
  new URL(
    "../app/[locale]/actividades/[categoria]/[slug]/page.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("el encabezado de la lista solo se dibuja cuando hay lista", () => {
  assert.match(fuente, /hasDetail\s*=\s*includes\.length\s*>\s*0\s*\|\|\s*program\.length\s*>\s*0/);
  assert.match(fuente, /\{hasDetail\s*&&\s*\(/);
});

test("el aviso de tickets sigue siendo solo de los tours", () => {
  assert.match(fuente, /isTour\s*&&\s*\(/);
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --test-name-pattern="encabezado de la lista"`
Expected: FAIL — `hasDetail` no existe todavía.

- [ ] **Step 3: Condicionar el encabezado**

En `app/[locale]/actividades/[categoria]/[slug]/page.tsx`, después de la línea que declara `program` (línea 151), agregar:

```tsx
  /**
   * Cena Sensorial no trae inclusiones ni programa: el catálogo describe cinco
   * tiempos y no los enumera. Sin este cruce, la ficha dibuja "¿Qué incluye?"
   * seguido de nada — un encabezado que promete una lista inexistente.
   */
  const hasDetail = includes.length > 0 || program.length > 0;
```

Después, envolver el encabezado y su bajada. Reemplazar las líneas 362-377 (desde el `<span>` separador hasta el cierre del bloque `isTour &&` del aviso de tickets) por:

```tsx
              <span className="block h-px w-12 bg-wine-accent/60 mb-5" />
              {hasDetail && (
                <>
                  <h2 className="font-display text-headline-h2 text-primary mb-6">
                    {t("whatIncludes")}
                  </h2>
                  <p className="font-body text-body-md text-on-surface-variant mb-4">
                    {t("duringExperience")}
                  </p>
                </>
              )}
              {/* La lista de abajo son los tickets de la reserva: se canjean el
                  día de la visita, así que conviene decirlo antes de leerla.
                  Solo aplica a los tours — un taller no entrega tickets. */}
              {isTour && (
                <p className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-wine-accent/25 bg-wine-accent/5 px-4 py-2 font-body text-body-md text-wine-accent">
                  <Ticket className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t("ticketsNote")}
                </p>
              )}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- --test-name-pattern="encabezado de la lista"`
Expected: PASS.

- [ ] **Step 5: Agregar la actividad**

En `data/activities.ts`, al final del array `activities`, después de `carmenere`. **Queda última entre las experiencias y ahí se queda**: es la novena del catálogo, y las tareas 4 y 5 insertan por delante de ella, no detrás.

```ts
  {
    slug: "cena-sensorial",
    category: "experiencias",
    minPeople: 12,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.experiencias,
  },
```

- [ ] **Step 6: Copy en los tres idiomas**

`messages/es.json`, en `activities.items`, después de `carmenere`:

```json
      "cena-sensorial": {
        "name": "Cena Sensorial",
        "description": "Cinco tiempos maridados con nuestras etiquetas, guiados por el enólogo, el chef y el sommelier.",
        "tagline": "Cinco tiempos, cada uno con su etiqueta",
        "intro": "Una experiencia gastronómica única que invita a descubrir el vino con todos los sentidos: cinco tiempos cuidadosamente diseñados, cada uno maridado con una de nuestras etiquetas, seleccionadas especialmente para realzar cada preparación. Durante la velada, nuestro enólogo, chef y sommelier guían a los comensales en un recorrido por los aromas, sabores y emociones que despierta cada combinación.",
        "duration": "3 horas + cierre",
        "groupFrom": "Grupos desde 12 personas",
        "reservationNote": "Sujeto a disponibilidad — coordinamos la fecha contigo",
        "closing": "Te vas con cinco maridajes probados y con el porqué de cada uno explicado en la mesa."
      },
```

`messages/en.json`:

```json
      "cena-sensorial": {
        "name": "Sensory Dinner",
        "description": "Five courses paired with our labels, guided by the winemaker, the chef and the sommelier.",
        "tagline": "Five courses, each with its own label",
        "intro": "A dining experience that invites you to discover wine with every sense: five carefully designed courses, each paired with one of our labels, chosen to bring out the best in the dish. Through the evening, our winemaker, chef and sommelier guide the table across the aromas, flavours and feelings each pairing awakens.",
        "duration": "3 hours + closing",
        "groupFrom": "Groups from 12 people",
        "reservationNote": "Subject to availability — we arrange the date with you",
        "closing": "You leave having tasted five pairings, and having heard why each one works."
      },
```

`messages/pt.json`:

```json
      "cena-sensorial": {
        "name": "Jantar Sensorial",
        "description": "Cinco tempos harmonizados com nossos rótulos, guiados pelo enólogo, pelo chef e pelo sommelier.",
        "tagline": "Cinco tempos, cada um com seu rótulo",
        "intro": "Uma experiência gastronômica que convida a descobrir o vinho com todos os sentidos: cinco tempos cuidadosamente pensados, cada um harmonizado com um de nossos rótulos, escolhidos especialmente para realçar cada preparo. Durante a noite, nosso enólogo, chef e sommelier guiam a mesa por um percurso de aromas, sabores e emoções que cada combinação desperta.",
        "duration": "3 horas + encerramento",
        "groupFrom": "Grupos a partir de 12 pessoas",
        "reservationNote": "Sujeito à disponibilidade — combinamos a data com você",
        "closing": "Você leva cinco harmonizações provadas e o porquê de cada uma explicado à mesa."
      },
```

- [ ] **Step 7: Correr los tests y verificar la ficha**

Run: `npm test && npm run typecheck`
Expected: PASS.

Run: `npm run dev` y abrir `/es/actividades/experiencias/cena-sensorial`.
Expected: la sección de detalle muestra el separador y directo el recuadro de cierre, **sin** el encabezado "¿Qué incluye?" ni la bajada. Las otras fichas siguen mostrando su lista con encabezado.

- [ ] **Step 8: Commit**

```bash
git add app/[locale]/actividades tests/actividades-detalle-source.test.mjs data/activities.ts messages/es.json messages/en.json messages/pt.json
git commit -m "feat(activities): let an activity describe itself without a list of contents"
```

---

### Task 4: Las cuatro experiencias de todo el año

Las experiencias no llevan `includes` sino `program`: el catálogo del cliente las describe como una **secuencia** (desayuno → oficio → tejido → cierre), y `ActivityProgram` la dibuja como línea de tiempo numerada. Es la distinción que la ficha ya sabe resolver por el dato presente — estas cuatro son las primeras en ejercerla.

Dos notas de contenido:

- **`mimbre` se llama "Taller de mimbre" y vive bajo `/experiencias`.** Así lo clasifica el catálogo del cliente: la taxonomía manda por sobre la coherencia nominal. Está previsto en el spec.
- **`cosecha-tu-historia` tiene ocho viñetas en el catálogo y acá van siete.** La última —"Y al final… Cosechaste tu historia y la embotellaste"— no es un paso de la jornada sino su remate, y numerada como paso 8 leería como una tarea más. Pasa a `closing`, que es el campo que la ficha destina exactamente a eso.

**Files:**
- Modify: `data/activities.ts` (array `activities`)
- Modify: `messages/es.json`, `messages/en.json`, `messages/pt.json` (`activities.items`)

**Interfaces:**
- Consumes: el tipo `Activity`, `TODO_EL_ANO` y `CATEGORY_IMAGE` de `data/activities.ts`.
- Produces: los slugs `cosecha-tu-historia`, `enologo-por-un-dia`, `mimbre` y `yoga` bajo `experiencias` — 12 páginas.

- [ ] **Step 1: Agregar los datos duros**

En `data/activities.ts`, **después de `carmenere` y antes de `cena-sensorial`** — no al final. `cena-sensorial` es la novena del catálogo y tiene que quedar última entre las experiencias:

```ts
  {
    slug: "cosecha-tu-historia",
    category: "experiencias",
    minPeople: 8,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.experiencias,
  },
  {
    slug: "enologo-por-un-dia",
    category: "experiencias",
    minPeople: 8,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.experiencias,
  },
  {
    // El catálogo lo llama "Taller mimbre" y lo clasifica como experiencia.
    // La taxonomía del cliente manda: el nombre dice taller, la URL dice
    // experiencias. Ver el spec de subpáginas de actividades.
    slug: "mimbre",
    category: "experiencias",
    minPeople: 8,
    months: TODO_EL_ANO,
    durationISO: "PT4H",
    image: CATEGORY_IMAGE.experiencias,
  },
  {
    slug: "yoga",
    category: "experiencias",
    minPeople: 8,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.experiencias,
  },
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test`
Expected: FAIL en `actividades-i18n-parity.test.mjs` con `es: falta activities.items.cosecha-tu-historia`.

- [ ] **Step 3: Copy en español**

En `messages/es.json`, en `activities.items`, **antes** de `cena-sensorial` — misma posición relativa que en `data/activities.ts`, para que los dos archivos se lean en el mismo orden:

```json
      "cosecha-tu-historia": {
        "name": "Cosecha tu historia",
        "description": "Trabajas un grupo definido de parras durante todo el ciclo y acompañas tu propia uva en bodega hasta embotellarla.",
        "tagline": "Tu propia uva, desde la poda hasta la botella",
        "intro": "Una experiencia única y personalizada donde realizas labores reales en un grupo definido de parras, desde la poda hasta la vendimia. Luego, acompañas tu propia uva en bodega, siguiendo de cerca su fermentación, mezcla y embotellado final. Una conexión completa, trazable y profundamente significativa con el vino que tú mismo ayudaste a crear.",
        "duration": "3 horas + cierre",
        "groupFrom": "Grupos desde 8 personas",
        "reservationNote": "El ciclo completo se coordina con la viña",
        "program": [
          "Poda y amarra (invierno)",
          "Desbrote (primavera)",
          "Deshoje (verano)",
          "Vendimia (fin del verano / inicio del otoño)",
          "Fermentación",
          "Mezclas",
          "Embotellado final"
        ],
        "closing": "Cosechaste tu historia y la embotellaste: esa botella lleva tu trabajo de todo el ciclo."
      },
      "enologo-por-un-dia": {
        "name": "Enólogo por un día",
        "description": "Guiado por un enólogo, creas tu propio vino, lo evalúas a ciegas y compites por el mejor ensamblaje del grupo.",
        "tagline": "Crea tu ensamblaje, cátalo a ciegas y compite por el mejor",
        "intro": "Una experiencia única donde cada participante se convierte en enólogo por un día, guiado por un enólogo. Crearás tu propio vino, lo evaluarás a ciegas y competirás por el mejor ensamblaje. Diversión, aprendizaje y espíritu de equipo en una jornada inolvidable.",
        "duration": "3 horas + cierre",
        "groupFrom": "Grupos desde 8 personas",
        "reservationNote": "Sujeto a disponibilidad — coordinamos la fecha contigo",
        "program": [
          "Charla técnica de bienvenida",
          "Introducción al uso de los materiales",
          "Primer tiempo: creación y embotellado",
          "Entretiempo: pausa sensorial con maridaje",
          "Instrucción para la cata a ciegas",
          "Evaluación y votación grupal",
          "Cata final",
          "Premiación de los ganadores"
        ],
        "closing": "Te vas con tu botella ensamblada y, si el grupo lo decide, con el premio."
      },
      "mimbre": {
        "name": "Taller de mimbre",
        "description": "Desde la preparación del mimbre hasta el tejido de tu propia pieza, acompañado por artesanos de la zona.",
        "tagline": "Tejer tu propia pieza junto a artesanos locales",
        "intro": "Una experiencia artesanal donde la tradición y la creatividad se entrelazan. Acompañados por artesanos locales, los participantes aprenderán desde la preparación del mimbre hasta el tejido de su propia pieza, en un entorno cálido y lleno de historia. Una jornada para reconectar con lo hecho a mano, disfrutar sabores locales y llevarse un recuerdo tejido con raíz.",
        "duration": "4 horas + cierre",
        "groupFrom": "Grupos desde 8 personas",
        "reservationNote": "Sujeto a disponibilidad — coordinamos la fecha contigo",
        "program": [
          "Desayuno campesino",
          "Introducción al oficio",
          "Preparación del material",
          "Tejido guiado",
          "Cierre"
        ],
        "closing": "Te vas con la pieza que tejiste y con el oficio visto de cerca."
      },
      "yoga": {
        "name": "Yoga: respirar, estirar y compartir",
        "description": "Yoga al aire libre entre viñedos, brunch saludable y productores locales, en una mañana tranquila.",
        "tagline": "Una sesión entre parras, y un brunch para cerrar",
        "intro": "Una experiencia de bienestar entre viñedos que invita a conectar cuerpo, mente y naturaleza. Combina una sesión de yoga al aire libre con un brunch saludable y la oportunidad de descubrir productos locales en un ambiente tranquilo y armonioso.",
        "duration": "3 horas + cierre",
        "groupFrom": "Grupos desde 8 personas",
        "reservationNote": "Sujeto a disponibilidad — coordinamos la fecha contigo",
        "program": [
          "Sesión de yoga",
          "Brunch saludable",
          "Productores locales",
          "Cierre y venta de vinos"
        ],
        "closing": "Te vas con el cuerpo suelto y la mañana bien empezada."
      },
```

- [ ] **Step 4: Copy en inglés**

En `messages/en.json`, misma posición:

```json
      "cosecha-tu-historia": {
        "name": "Harvest Your Story",
        "description": "You work a defined set of vines through the whole cycle and follow your own grapes in the cellar until they're bottled.",
        "tagline": "Your own grapes, from pruning to bottle",
        "intro": "A one-of-a-kind, personal experience where you do real work on a defined set of vines, from pruning through harvest. Then you follow your own grapes into the cellar, watching their fermentation, blending and final bottling up close. A complete, traceable and deeply meaningful connection with the wine you helped create.",
        "duration": "3 hours + closing",
        "groupFrom": "Groups from 8 people",
        "reservationNote": "The full cycle is arranged with the winery",
        "program": [
          "Pruning and tying (winter)",
          "Shoot thinning (spring)",
          "Leaf removal (summer)",
          "Harvest (late summer / early autumn)",
          "Fermentation",
          "Blending",
          "Final bottling"
        ],
        "closing": "You harvested your story and bottled it: that bottle carries your work across the whole cycle."
      },
      "enologo-por-un-dia": {
        "name": "Winemaker for a Day",
        "description": "Guided by a winemaker, you create your own wine, judge it blind and compete for the best blend of the group.",
        "tagline": "Build your blend, taste it blind, compete for the best",
        "intro": "A one-of-a-kind experience where every participant becomes a winemaker for a day, guided by a winemaker. You'll create your own wine, judge it blind and compete for the best blend. Fun, learning and team spirit in one unforgettable session.",
        "duration": "3 hours + closing",
        "groupFrom": "Groups from 8 people",
        "reservationNote": "Subject to availability — we arrange the date with you",
        "program": [
          "Technical welcome talk",
          "Introduction to the materials",
          "First half: blending and bottling",
          "Half-time: a sensory pause with a pairing",
          "Briefing for the blind tasting",
          "Group judging and vote",
          "Final tasting",
          "Prizes for the winners"
        ],
        "closing": "You leave with the bottle you blended and, if the group says so, with the prize."
      },
      "mimbre": {
        "name": "Wicker Workshop",
        "description": "From preparing the wicker to weaving your own piece, alongside craftspeople from the area.",
        "tagline": "Weave your own piece alongside local craftspeople",
        "intro": "A craft experience where tradition and creativity come together. Alongside local artisans, you'll learn everything from preparing the wicker to weaving your own piece, in a warm setting full of history. A day to reconnect with what's made by hand, enjoy local flavours and take home a keepsake woven with roots.",
        "duration": "4 hours + closing",
        "groupFrom": "Groups from 8 people",
        "reservationNote": "Subject to availability — we arrange the date with you",
        "program": [
          "Country breakfast",
          "Introduction to the craft",
          "Preparing the material",
          "Guided weaving",
          "Closing"
        ],
        "closing": "You leave with the piece you wove and the craft seen up close."
      },
      "yoga": {
        "name": "Yoga: breathe, stretch and share",
        "description": "Outdoor yoga among the vines, a healthy brunch and local producers, in one unhurried morning.",
        "tagline": "A session among the vines, and a brunch to close",
        "intro": "A wellbeing experience among the vines that invites you to connect body, mind and nature. It combines an outdoor yoga session with a healthy brunch and the chance to discover local products in a calm, harmonious setting.",
        "duration": "3 hours + closing",
        "groupFrom": "Groups from 8 people",
        "reservationNote": "Subject to availability — we arrange the date with you",
        "program": [
          "Yoga session",
          "Healthy brunch",
          "Local producers",
          "Closing and wine sales"
        ],
        "closing": "You leave loose, and with the morning well started."
      },
```

- [ ] **Step 5: Copy en portugués**

En `messages/pt.json`, misma posición:

```json
      "cosecha-tu-historia": {
        "name": "Colha a sua história",
        "description": "Você trabalha um conjunto definido de videiras durante todo o ciclo e acompanha a sua própria uva na adega até o engarrafamento.",
        "tagline": "A sua própria uva, da poda à garrafa",
        "intro": "Uma experiência única e personalizada em que você realiza trabalhos reais em um conjunto definido de videiras, da poda até a colheita. Depois acompanha a sua própria uva na adega, seguindo de perto a fermentação, o corte e o engarrafamento final. Uma conexão completa, rastreável e profundamente significativa com o vinho que você ajudou a criar.",
        "duration": "3 horas + encerramento",
        "groupFrom": "Grupos a partir de 8 pessoas",
        "reservationNote": "O ciclo completo é combinado com a vinícola",
        "program": [
          "Poda e amarração (inverno)",
          "Desbrota (primavera)",
          "Desfolha (verão)",
          "Colheita (fim do verão / início do outono)",
          "Fermentação",
          "Cortes",
          "Engarrafamento final"
        ],
        "closing": "Você colheu a sua história e a engarrafou: essa garrafa carrega o seu trabalho de todo o ciclo."
      },
      "enologo-por-un-dia": {
        "name": "Enólogo por um dia",
        "description": "Guiado por um enólogo, você cria o seu próprio vinho, avalia às cegas e disputa o melhor corte do grupo.",
        "tagline": "Crie o seu corte, prove às cegas e dispute o melhor",
        "intro": "Uma experiência única em que cada participante vira enólogo por um dia, guiado por um enólogo. Você vai criar o seu próprio vinho, avaliá-lo às cegas e disputar o melhor corte. Diversão, aprendizado e espírito de equipe em um dia inesquecível.",
        "duration": "3 horas + encerramento",
        "groupFrom": "Grupos a partir de 8 pessoas",
        "reservationNote": "Sujeito à disponibilidade — combinamos a data com você",
        "program": [
          "Palestra técnica de boas-vindas",
          "Introdução ao uso dos materiais",
          "Primeiro tempo: criação e engarrafamento",
          "Intervalo: pausa sensorial com harmonização",
          "Instruções para a degustação às cegas",
          "Avaliação e votação em grupo",
          "Degustação final",
          "Premiação dos vencedores"
        ],
        "closing": "Você leva a garrafa que montou e, se o grupo decidir, o prêmio."
      },
      "mimbre": {
        "name": "Oficina de vime",
        "description": "Da preparação do vime até a tecelagem da sua própria peça, ao lado de artesãos da região.",
        "tagline": "Teça a sua própria peça ao lado de artesãos locais",
        "intro": "Uma experiência artesanal em que tradição e criatividade se entrelaçam. Acompanhados por artesãos locais, os participantes aprendem desde a preparação do vime até a tecelagem da própria peça, em um ambiente acolhedor e cheio de história. Um dia para reconectar com o feito à mão, provar sabores locais e levar uma lembrança tecida com raiz.",
        "duration": "4 horas + encerramento",
        "groupFrom": "Grupos a partir de 8 pessoas",
        "reservationNote": "Sujeito à disponibilidade — combinamos a data com você",
        "program": [
          "Café da manhã caipira",
          "Introdução ao ofício",
          "Preparação do material",
          "Tecelagem guiada",
          "Encerramento"
        ],
        "closing": "Você leva a peça que teceu e o ofício visto de perto."
      },
      "yoga": {
        "name": "Yoga: respirar, alongar e compartilhar",
        "description": "Yoga ao ar livre entre as videiras, brunch saudável e produtores locais, em uma manhã tranquila.",
        "tagline": "Uma sessão entre as videiras, e um brunch para encerrar",
        "intro": "Uma experiência de bem-estar entre os vinhedos que convida a conectar corpo, mente e natureza. Combina uma sessão de yoga ao ar livre com um brunch saudável e a oportunidade de descobrir produtos locais em um ambiente tranquilo e harmonioso.",
        "duration": "3 horas + encerramento",
        "groupFrom": "Grupos a partir de 8 pessoas",
        "reservationNote": "Sujeito à disponibilidade — combinamos a data com você",
        "program": [
          "Sessão de yoga",
          "Brunch saudável",
          "Produtores locais",
          "Encerramento e venda de vinhos"
        ],
        "closing": "Você sai com o corpo solto e a manhã bem começada."
      },
```

- [ ] **Step 6: Correr los tests y el typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Verificar el bloque de programa en el navegador**

Run: `npm run dev` y abrir `/es/actividades/experiencias/mimbre`.
Expected: bajo "¿Qué incluye?" aparece la línea de tiempo **numerada** (1 Desayuno campesino → 5 Cierre), no la lista de ticks. Sin aviso de tickets, sin bloque de cata, sin maridaje: esos tres son solo de los tours.

- [ ] **Step 8: Commit**

```bash
git add data/activities.ts messages/es.json messages/en.json messages/pt.json
git commit -m "feat(activities): add the four year-round vineyard experiences"
```

---

### Task 5: Las tres experiencias de temporada

Estas son las que hacen trabajar de verdad a `SeasonStrip`: hasta ahora todas las actividades del sitio se hacían los doce meses y la franja se dibujaba entera. *Lágrimas de invierno* además es la primera actividad del catálogo **sin duración medible** —"Actividad breve de temporada"— y por eso va sin `durationISO`.

**Files:**
- Modify: `data/activities.ts` (array `activities`)
- Modify: `messages/es.json`, `messages/en.json`, `messages/pt.json` (`activities.items`)

**Interfaces:**
- Consumes: el tipo `Activity` y `CATEGORY_IMAGE` de `data/activities.ts`.
- Produces: los slugs `alpacas`, `lagrimas-de-invierno` y `apicultura` bajo `experiencias` — 9 páginas. Con esto el catálogo queda en 14 actividades.

- [ ] **Step 1: Agregar los datos duros**

En `data/activities.ts`, **entre `mimbre` y `yoga`** — es la posición que ocupan en el catálogo del cliente:

```ts
  {
    slug: "alpacas",
    category: "experiencias",
    minPeople: 20,
    months: [9, 10, 11],
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.experiencias,
  },
  {
    // Sin `durationISO`: el catálogo dice "Actividad breve de temporada", que
    // no es una duración medible. Inventar PT1H sería marcar un dato que el
    // cliente no dio.
    slug: "lagrimas-de-invierno",
    category: "experiencias",
    minPeople: 10,
    months: [7, 8],
    image: CATEGORY_IMAGE.experiencias,
  },
  {
    slug: "apicultura",
    category: "experiencias",
    minPeople: 8,
    months: [9, 10],
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.experiencias,
  },
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test`
Expected: FAIL en `actividades-i18n-parity.test.mjs` con `es: falta activities.items.alpacas`.

- [ ] **Step 3: Copy en español**

En `messages/es.json`, en `activities.items`, **entre `mimbre` y `yoga`** — misma posición relativa que en `data/activities.ts`:

```json
      "alpacas": {
        "name": "Trasquilado de alpacas",
        "description": "Aprendes el proceso artesanal de la lana de alpaca, del trasquilado al hilado, y te llevas tu propio ovillo.",
        "tagline": "De la trasquila al ovillo, con artesanas locales",
        "intro": "Una experiencia única donde aprenderás el proceso artesanal de la lana de alpaca, desde el trasquilado hasta el hilado final. Guiado por artesanas locales, vivirás cada etapa con tus propias manos y te llevarás tu propio ovillo como recuerdo.",
        "duration": "3 horas + cierre",
        "groupFrom": "Grupos desde 20 personas",
        "reservationNote": "Solo en primavera — coordinamos la fecha contigo",
        "program": [
          "Desayuno campesino",
          "Introducción al oficio",
          "Trasquilado participativo",
          "Lavado y preparación",
          "Hilado tradicional",
          "Cierre"
        ],
        "closing": "Te vas con tu ovillo hilado y con el proceso completo visto de principio a fin."
      },
      "lagrimas-de-invierno": {
        "name": "Lágrimas de invierno",
        "description": "Durante la poda tardía las parras lloran savia cristalina: una salida breve para ver de cerca el inicio del ciclo.",
        "tagline": "El llanto de la parra que anuncia el ciclo nuevo",
        "intro": "Una experiencia natural y simbólica que celebra el despertar de la vida. Durante la poda tardía, las parras lloran gotas de savia cristalina, conocidas como lágrimas de invierno, marcando el inicio de un nuevo ciclo en la viña.",
        "duration": "Actividad breve de temporada",
        "groupFrom": "Grupos desde 10 personas",
        "reservationNote": "Solo en pleno invierno — coordinamos la fecha contigo",
        "program": [
          "Charla introductoria",
          "Demostración en campo",
          "Curiosidad enológica",
          "Cierre simbólico"
        ],
        "closing": "Te vas habiendo visto el momento exacto en que la viña vuelve a empezar."
      },
      "apicultura": {
        "name": "Apicultura en Casa Acosta",
        "description": "De la mano de un apicultor local, conoces el rol de las abejas, observas una colmena en vivo y pruebas miel recién sacada.",
        "tagline": "Una colmena en vivo y miel desde su origen",
        "intro": "Una experiencia inmersiva que te invita a conocer el fascinante mundo de las abejas. De la mano de un apicultor local, descubrirás su rol en la naturaleza, observarás una colmena en vivo y probarás miel directamente desde su origen, en un entorno natural y educativo.",
        "duration": "3 horas + cierre",
        "groupFrom": "Grupos desde 8 personas",
        "reservationNote": "Solo en primavera — coordinamos la fecha contigo",
        "program": [
          "Desayuno campesino",
          "Charla introductoria",
          "Experiencia en el apiario",
          "Cierre"
        ],
        "closing": "Te vas con el sabor de la miel recién sacada y con las abejas vistas de cerca."
      },
```

- [ ] **Step 4: Copy en inglés**

En `messages/en.json`, misma posición:

```json
      "alpacas": {
        "name": "Alpaca Shearing",
        "description": "You learn the craft of alpaca wool, from shearing to spinning, and take home your own ball of yarn.",
        "tagline": "From the shears to the yarn, with local artisans",
        "intro": "A one-of-a-kind experience where you'll learn the craft process behind alpaca wool, from shearing to the final spinning. Guided by local artisans, you'll go through every stage with your own hands and take home your own ball of yarn as a keepsake.",
        "duration": "3 hours + closing",
        "groupFrom": "Groups from 20 people",
        "reservationNote": "Spring only — we arrange the date with you",
        "program": [
          "Country breakfast",
          "Introduction to the craft",
          "Hands-on shearing",
          "Washing and preparing",
          "Traditional spinning",
          "Closing"
        ],
        "closing": "You leave with the yarn you spun and the whole process seen end to end."
      },
      "lagrimas-de-invierno": {
        "name": "Winter Tears",
        "description": "During late pruning the vines weep clear sap: a short outing to see the start of the cycle up close.",
        "tagline": "The weeping vine that announces a new cycle",
        "intro": "A natural, symbolic experience that celebrates life waking up. During late pruning the vines weep drops of clear sap — known as winter tears — marking the start of a new cycle in the vineyard.",
        "duration": "Short seasonal activity",
        "groupFrom": "Groups from 10 people",
        "reservationNote": "Deep winter only — we arrange the date with you",
        "program": [
          "Introductory talk",
          "Demonstration in the field",
          "A winemaking curiosity",
          "Symbolic close"
        ],
        "closing": "You leave having seen the exact moment the vineyard starts over."
      },
      "apicultura": {
        "name": "Beekeeping at Casa Acosta",
        "description": "With a local beekeeper, you learn the role of bees, watch a live hive and taste honey straight from the source.",
        "tagline": "A live hive, and honey straight from the source",
        "intro": "An immersive experience that invites you into the fascinating world of bees. With a local beekeeper, you'll discover their role in nature, observe a live hive and taste honey straight from its source, in a natural and educational setting.",
        "duration": "3 hours + closing",
        "groupFrom": "Groups from 8 people",
        "reservationNote": "Spring only — we arrange the date with you",
        "program": [
          "Country breakfast",
          "Introductory talk",
          "Time in the apiary",
          "Closing"
        ],
        "closing": "You leave with the taste of honey straight from the hive, and the bees seen up close."
      },
```

- [ ] **Step 5: Copy en portugués**

En `messages/pt.json`, misma posición:

```json
      "alpacas": {
        "name": "Tosquia de alpacas",
        "description": "Você aprende o processo artesanal da lã de alpaca, da tosquia à fiação, e leva o seu próprio novelo.",
        "tagline": "Da tosquia ao novelo, com artesãs locais",
        "intro": "Uma experiência única em que você aprende o processo artesanal da lã de alpaca, da tosquia até a fiação final. Guiado por artesãs locais, você vive cada etapa com as próprias mãos e leva o seu próprio novelo como lembrança.",
        "duration": "3 horas + encerramento",
        "groupFrom": "Grupos a partir de 20 pessoas",
        "reservationNote": "Somente na primavera — combinamos a data com você",
        "program": [
          "Café da manhã caipira",
          "Introdução ao ofício",
          "Tosquia participativa",
          "Lavagem e preparação",
          "Fiação tradicional",
          "Encerramento"
        ],
        "closing": "Você leva o novelo que fiou e o processo completo visto do começo ao fim."
      },
      "lagrimas-de-invierno": {
        "name": "Lágrimas de inverno",
        "description": "Durante a poda tardia as videiras choram seiva cristalina: uma saída breve para ver de perto o início do ciclo.",
        "tagline": "O choro da videira que anuncia o novo ciclo",
        "intro": "Uma experiência natural e simbólica que celebra o despertar da vida. Durante a poda tardia, as videiras choram gotas de seiva cristalina, conhecidas como lágrimas de inverno, marcando o início de um novo ciclo na vinha.",
        "duration": "Atividade breve de temporada",
        "groupFrom": "Grupos a partir de 10 pessoas",
        "reservationNote": "Somente em pleno inverno — combinamos a data com você",
        "program": [
          "Palestra introdutória",
          "Demonstração no campo",
          "Curiosidade enológica",
          "Encerramento simbólico"
        ],
        "closing": "Você sai tendo visto o momento exato em que a vinha recomeça."
      },
      "apicultura": {
        "name": "Apicultura na Casa Acosta",
        "description": "Com um apicultor local, você conhece o papel das abelhas, observa uma colmeia ao vivo e prova mel direto da origem.",
        "tagline": "Uma colmeia ao vivo e mel direto da origem",
        "intro": "Uma experiência imersiva que convida você a conhecer o fascinante mundo das abelhas. Com um apicultor local, você descobre o papel delas na natureza, observa uma colmeia ao vivo e prova mel direto da origem, em um ambiente natural e educativo.",
        "duration": "3 horas + encerramento",
        "groupFrom": "Grupos a partir de 8 pessoas",
        "reservationNote": "Somente na primavera — combinamos a data com você",
        "program": [
          "Café da manhã caipira",
          "Palestra introdutória",
          "Experiência no apiário",
          "Encerramento"
        ],
        "closing": "Você sai com o sabor do mel recém-colhido e com as abelhas vistas de perto."
      },
```

- [ ] **Step 6: Correr los tests y el typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS. El catálogo queda en 14 actividades.

- [ ] **Step 7: Verificar la franja de estacionalidad**

Run: `npm run dev` y abrir `/es/actividades/experiencias/lagrimas-de-invierno`.
Expected: la franja marca **solo julio y agosto** y el resumen en texto los enumera (sale de `Intl.ListFormat`, ver `tests/season-strip-source.test.mjs`). La ficha rápida dice "Actividad breve de temporada" en Duración.

Abrir también `/en/actividades/experiencias/lagrimas-de-invierno` y la versión `/pt/`: los nombres de mes salen de `Intl` y tienen que aparecer traducidos sin que nadie los haya escrito.

- [ ] **Step 8: Commit**

```bash
git add data/activities.ts messages/es.json messages/en.json messages/pt.json
git commit -m "feat(activities): add the three seasonal experiences"
```

---

### Task 6: Las anclas de categoría que no muestran la categoría

La ficha de un taller enlaza —en la miga visible y en el `BreadcrumbList`— a `/actividades#talleres`, y `next.config.ts` redirige `/actividades/talleres` al mismo destino. **Ese ancla no existe**: el índice tiene `#tours`, `#experiencias` y `#eventos`. Los dos enlaces aterrizan en silencio arriba de la página.

`#experiencias` es el mismo problema, más difícil de ver: la sección existe y se llama Experiencias, pero son tres tarjetas-puerta —Vendimia 2026, Talleres, Tren EFE— y **ninguna de las 8 experiencias del catálogo está ahí**. Una miga desde `apicultura` promete llevar a su categoría y lleva a otra cosa. Marcarlo en `BreadcrumbList` lo convierte en una jerarquía declarada que la página no sostiene.

De las tres categorías, **solo `tours` tiene una sección que realmente la lista**. Se resuelve diciendo eso, no agregando secciones: las migas de talleres y experiencias van al índice sin fragmento hasta que el plan 3 estrene las suyas. El test empareja las dos puntas y avisa cuando llegue el momento.

**Files:**
- Modify: `data/activities.ts` (agregar `CATEGORIES_WITH_INDEX_ANCHOR` y `categoryIndexHref`)
- Modify: `app/[locale]/actividades/[categoria]/[slug]/page.tsx:229-232` (miga visible)
- Modify: `lib/activityJsonLd.ts:66-69` (miga marcada)
- Modify: `next.config.ts:184-193` (los dos redirects de URL padre sin landing)
- Test: `tests/actividades-anclas.test.mjs` (crear)

**Interfaces:**
- Consumes: `ActivityCategory` de `data/activities.ts`.
- Produces: `CATEGORIES_WITH_INDEX_ANCHOR: readonly ActivityCategory[]` y `categoryIndexHref(locale: string, category: ActivityCategory): string`, que devuelve `/{locale}/actividades#{categoria}` o `/{locale}/actividades` según corresponda.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/actividades-anclas.test.mjs` (ASCII puro):

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ACTIVITY_CATEGORIES,
  CATEGORIES_WITH_INDEX_ANCHOR,
  categoryIndexHref,
} from "../data/activities.ts";

/**
 * La miga de una ficha enlaza a la seccion de su categoria en el indice. Un
 * ancla que no existe no falla: el navegador deja al visitante arriba de la
 * pagina y el BreadcrumbList declara una URL que no lleva a lo que dice.
 *
 * Este test empareja las dos puntas: la lista de categorias con ancla y los
 * id= que el indice realmente renderiza. Cuando el plan 3 estrene la seccion
 * de Talleres, se pone rojo hasta que la lista lo reconozca.
 */

const indice = await readFile(
  new URL("../app/[locale]/actividades/page.tsx", import.meta.url),
  "utf8",
);

const idsDelIndice = new Set(
  [...indice.matchAll(/<section\s+id="([a-z-]+)"/g)].map((m) => m[1]),
);

test("toda categoria declarada con ancla tiene su seccion en el indice", () => {
  for (const categoria of CATEGORIES_WITH_INDEX_ANCHOR) {
    assert.ok(
      idsDelIndice.has(categoria),
      `${categoria} dice tener ancla y el indice no la renderiza`,
    );
  }
});

test("la seccion #experiencias existe y aun asi no se usa como ancla", () => {
  // No es un olvido. La seccion se llama Experiencias y muestra tres
  // tarjetas-puerta (Vendimia, Talleres, Tren EFE): ninguna de las ocho
  // experiencias del catalogo esta ahi. Enlazar la miga a esa ancla declararia
  // una jerarquia que la pagina no sostiene.
  //
  // Este test se pone rojo el dia que el indice liste de verdad la categoria y
  // alguien agregue "experiencias" a la lista: leer este comentario y borrarlo
  // es parte de ese cambio.
  assert.ok(idsDelIndice.has("experiencias"));
  assert.ok(!CATEGORIES_WITH_INDEX_ANCHOR.includes("experiencias"));
});

test("una categoria sin seccion enlaza al indice sin fragmento", () => {
  const sinAncla = ACTIVITY_CATEGORIES.find(
    (c) => !CATEGORIES_WITH_INDEX_ANCHOR.includes(c),
  );
  if (sinAncla === undefined) return; // todas tienen seccion: nada que probar
  assert.equal(categoryIndexHref("es", sinAncla), "/es/actividades");
});

test("una categoria con seccion enlaza a su ancla", () => {
  const [conAncla] = CATEGORIES_WITH_INDEX_ANCHOR;
  assert.equal(categoryIndexHref("pt", conAncla), `/pt/actividades#${conAncla}`);
});

/**
 * Tercera superficie con la misma regla. La miga visible y el BreadcrumbList ya
 * pasan por categoryIndexHref; el redirect de la URL padre vive en
 * next.config.ts y podria quedar diciendo otra cosa sin que nada avise:
 * tests/actividades-redirects.test.mjs verifica el destino con un ^ que no mira
 * el fragmento.
 */
const config = await (await import("../next.config.ts")).default;
const redirects = await config.redirects();

test("el redirect de una URL padre lleva fragmento solo si la categoria tiene ancla", () => {
  for (const categoria of ACTIVITY_CATEGORIES) {
    const regla = redirects.find(
      (r) => r.source === `/:locale(es|en|pt)/actividades/${categoria}`,
    );
    assert.ok(regla, `falta el redirect padre de ${categoria}`);
    assert.equal(
      regla.destination.includes("#"),
      CATEGORIES_WITH_INDEX_ANCHOR.includes(categoria),
      `${categoria}: el redirect y la miga no dicen lo mismo`,
    );
  }
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --test-name-pattern="ancla"`
Expected: FAIL — `CATEGORIES_WITH_INDEX_ANCHOR` no existe todavía.

- [ ] **Step 3: Declarar qué categorías tienen sección**

En `data/activities.ts`, después de `RESERVED_ACTIVITY_SEGMENTS` (línea 59):

```ts
/**
 * Categorías que HOY tienen en el índice `/actividades` una sección que las
 * LISTA. No es una preferencia de diseño: es el estado del índice. Solo `tours`
 * califica. Talleres no tiene sección, y la que se llama Experiencias son tres
 * tarjetas-puerta —Vendimia, Talleres, Tren EFE— donde no está ninguna de las
 * ocho experiencias del catálogo.
 *
 * La miga de una ficha y el redirect de la URL padre enlazan al ancla solo si
 * la categoría figura acá; el resto va al índice sin fragmento. Un ancla que no
 * existe no falla —el navegador deja al visitante arriba de la página— y una
 * que existe pero muestra otra cosa es peor: el `BreadcrumbList` declara una
 * jerarquía que la página no sostiene.
 *
 * `tests/actividades-anclas.test.mjs` empareja esta lista con los `id=` que el
 * índice renderiza, en las dos direcciones. Cuando el plan 3 estrene las
 * secciones que faltan, se pone rojo hasta que esta lista las reconozca.
 */
export const CATEGORIES_WITH_INDEX_ANCHOR: readonly ActivityCategory[] = [
  "tours",
];

/** Destino de la miga de categoría, con prefijo de idioma. */
export function categoryIndexHref(
  locale: string,
  category: ActivityCategory,
): string {
  return CATEGORIES_WITH_INDEX_ANCHOR.includes(category)
    ? `/${locale}/actividades#${category}`
    : `/${locale}/actividades`;
}
```

- [ ] **Step 4: Usarlo en la miga visible**

En `app/[locale]/actividades/[categoria]/[slug]/page.tsx`, agregar `categoryIndexHref` al import de `@/data/activities` y reemplazar el tercer ítem de la miga (líneas 229-232) por:

```tsx
                  {
                    href: categoryIndexHref(locale, tour.category),
                    label: crumbLabels.category,
                  },
```

- [ ] **Step 5: Usarlo en la miga marcada**

En `lib/activityJsonLd.ts`, agregar `categoryIndexHref` al import de `@/data/activities` y reemplazar el tercer crumb (líneas 66-69) por:

```ts
    {
      name: crumbLabels.category,
      item: `${SITE_URL}${categoryIndexHref(locale, activity.category)}`,
    },
```

El marcado tiene que decir lo mismo que la miga visible: es la regla que ya cuida `tests/actividades-jsonld.test.mjs`.

- [ ] **Step 6: Corregir los redirects de las URLs padre**

En `next.config.ts`, reemplazar los dos bloques de `/actividades/talleres` y `/actividades/experiencias` (líneas 184-193) por:

```ts
      // Estas dos van al índice SIN fragmento, a diferencia de la de tours: no
      // hay sección que liste su categoría (ver CATEGORIES_WITH_INDEX_ANCHOR en
      // data/activities.ts). La de experiencias existe de nombre y muestra otra
      // cosa, que para quien llega es lo mismo que no existir. Siguen siendo
      // temporales, así que el día que las secciones existan el destino cambia
      // sin pelear con ninguna caché.
      {
        source: `${actividades}/talleres`,
        destination: "/:locale/actividades",
        permanent: false,
      },
      {
        source: `${actividades}/experiencias`,
        destination: "/:locale/actividades",
        permanent: false,
      },
```

El bloque de `/actividades/tours` no se toca: sigue apuntando a `#tours`, que sí lista los tres tours.

- [ ] **Step 7: Correr todo y verificar en el navegador**

Run: `npm test && npm run typecheck`
Expected: PASS.

Run: `npm run dev` y probar las tres migas:
- `/es/actividades/talleres/pizzas` → clic en "Talleres": llega a `/es/actividades` sin fragmento.
- `/es/actividades/experiencias/mimbre` → clic en "Experiencias": lo mismo.
- `/es/actividades/tours/ombu` → clic en "Tours": sigue llevando a `/es/actividades#tours` y baja a la sección.

Probar también las URLs padre a mano: `/es/actividades/talleres` y `/es/actividades/experiencias` tienen que caer en el índice sin fragmento, y `/es/actividades/tours` en `#tours`.

- [ ] **Step 8: Commit**

```bash
git add data/activities.ts "app/[locale]/actividades" lib/activityJsonLd.ts next.config.ts tests/actividades-anclas.test.mjs
git commit -m "fix(activities): stop pointing category breadcrumbs at sections that do not list them"
```

---

### Task 7: Cierre — build medido y handoff

El sitemap no necesita tocarse: el plan 1 lo dejó derivando de `data/activities.ts` y `tests/actividades-sitemap.test.mjs` ya afirma que toda actividad del catálogo aparece. Esta tarea verifica ese contrato con números y deja anotado lo que la próxima sesión necesita saber.

**Files:**
- Modify: `docs/HANDOFF.md`

- [ ] **Step 1: Verificar que el sitemap creció solo**

Run: `npm test -- --test-name-pattern="sitemap"`
Expected: PASS sin haber tocado `app/sitemap.ts`. Si falla, el sitemap dejó de derivar y hay que arreglar eso antes de seguir.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 3: Build limpio y medido**

Bajar el dev server antes: `npm run build` borra `.next` y lo deja zombi.

Run: `npm run build`
Expected: verde. Anotar el tiempo y el número de páginas estáticas. Referencia del plan 1: **≈7,9 s, 79 páginas**. Con 10 actividades nuevas × 3 idiomas deberían ser **109 páginas**, y el sitemap pasa de 69 a **99 URLs** (33 rutas × 3 locales).

Si el número de páginas no da 109, sobra o falta una actividad: `activities.length` tiene que ser 14.

- [ ] **Step 4: Recorrer una ficha de cada forma sobre el build**

Run: `npm run start` y abrir:
- `/es/actividades/talleres/noquis` — lista de inclusiones sin numerar
- `/es/actividades/experiencias/apicultura` — programa numerado, franja de dos meses
- `/es/actividades/experiencias/cena-sensorial` — sin encabezado de lista
- `/en/actividades/experiencias/yoga` y `/pt/actividades/experiencias/yoga`

Expected: ningún texto tipo `activities.items.<slug>.<campo>` en pantalla, en ningún idioma. Ese es el modo de falla que este plan más cuida.

- [ ] **Step 5: Actualizar el handoff**

En `docs/HANDOFF.md`, sección "Actividades — arquitectura", reemplazar el párrafo que empieza con **"Medición tras esta rama"** y el que empieza con **"Pendiente (planes 2 y 3)"** por:

```markdown
**Medición tras el plan 2:** build limpio **<TIEMPO>** para <N> páginas estáticas.
El catálogo son 14 actividades: 3 tours, 3 talleres y 8 experiencias. Ninguna de
las 11 nuevas publica precio, así que sus fichas salen en modo cotización.

**Las 10 fichas nuevas no reciben enlaces del sitio.** El submenú del navbar
itera `tours` y el índice no tiene sección de Talleres ni lista las
experiencias: se llega a ellas por el sitemap y por el bloque "otras actividades
de la misma categoría" de cada ficha. **El mega-menú del plan 3 es prerequisito
para mergear a `main`** — publicar antes le entrega a Google 30 URLs huérfanas.

**Copy sin validar por el cliente.** De cada actividad, el `intro` es texto del
catálogo verbatim; `name`, `description`, `tagline` y `closing` los escribimos
nosotros porque el catálogo no los trae. EN y PT, además, sin validación humana
como el resto del sitio.

**Las actividades nuevas no llevan `highlights`.** Ese array lo lee un solo
lugar (`app/[locale]/actividades/page.tsx:213`, dentro de `tours.map`), así que
escribirlo para las otras once serían 90 strings en tres idiomas que nada
renderiza. Se escriben cuando las tarjetas del plan 3 los necesiten. Los de
`pizzas` quedaron de antes y hoy tampoco se muestran.

**Dos cosas que preguntarle al cliente:**
- *Cena Sensorial* es la única actividad sin lista de contenidos: el catálogo
  habla de "cinco tiempos" y no los enumera. Su ficha sale sin bloque de detalle
  a propósito. Si llegan los cinco tiempos, entran como `program`.
- Los tres talleres de cocina declaran "Cocción en horno tradicional", incluido
  el de ñoquis, donde el plato se hierve. Se transcribió tal cual.

**Fotos:** las 10 fichas nuevas comparten dos imágenes de categoría
(`talleres.jpg` y `pareja-columpio.webp`), que son hero, tarjeta de reserva y
`og:image` a la vez. En las experiencias esa foto aparece además tres veces en
la misma página, porque el bloque de reserva usa esa misma imagen fija.
**Aceptado por el cliente**, que va a entregar fotos por actividad más adelante:
cuando lleguen es una línea `image` por actividad, sin tocar componentes.

**Pendiente (plan 3):** hub de Vendimia, tarjetas selectoras y mega-menú. El hub
necesita contenido que el catálogo NO tiene (qué es la vendimia en Casa Acosta,
el ciclo de la vid a lo largo del año): es material a pedirle al cliente, no a
redactar por nuestra cuenta.
```

Reemplazar `<TIEMPO>` y `<N>` por lo medido en el Step 3.

- [ ] **Step 6: Commit**

```bash
git add docs/HANDOFF.md
git commit -m "docs(handoff): record what the catalog content costs and what it still owes"
```

---

## Criterio de cierre del plan

- `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` en verde.
- `activities.length === 14`: 3 tours, 3 talleres, 8 experiencias.
- 42 fichas generadas (14 × 3 idiomas) bajo `/actividades/{categoria}/{slug}`.
- Ninguna clave de `activities.items` existe en un idioma y falta en otro.
- El `ItemList` del índice y la ficha declaran la **misma** URL para la misma actividad, y esa URL responde 200.
- Ningún enlace del sitio —miga visible, `BreadcrumbList` ni redirect de URL padre— apunta a un ancla de categoría que el índice no liste.
- Ninguna actividad nueva escribe `highlights`.
- La ficha de *Cena Sensorial* no dibuja el encabezado "¿Qué incluye?".
- Tiempo de build y número de páginas medidos y anotados en `docs/HANDOFF.md`.
- **No se mergea a `main` sin el plan 3**: las 10 fichas nuevas no tienen enlaces entrantes desde el sitio.

---

## Lo que este plan NO hace

- **El hub de Vendimia (`Dv`).** Sale del plan 2 a propósito. *Vendimia corta, pisa y celebra* es la única actividad del catálogo que el spec resuelve como hub y no como ficha, y sus secciones `Dv2` (qué es la vendimia en Casa Acosta) y `Dv3` (el ciclo de la vid a lo largo del año) piden contenido que **el catálogo no tiene**. Escribirlo por cuenta propia sería inventar material sobre el trabajo real de la viña, que es distinto de redactar una bajada. Va con el plan 3, después de pedírselo al cliente.
- **Navegación.** Mega-menú, tarjetas selectoras y reestructuración del índice `D`: plan 3.
- **Fotos por actividad.** No existen en disco. Las 10 fichas usan la imagen de su categoría, que es exactamente el mecanismo que el plan 1 dejó para esto.
