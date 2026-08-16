# Actividades — Fundación (plan 1 de 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar la arquitectura de Actividades lista para recibir 12 páginas nuevas, probada de punta a punta sobre los 3 tours que ya existen.

**Architecture:** `data/activities.ts` pasa a guardar solo datos duros (precio, mínimo de personas, meses, duración ISO) y todo el texto se muda a un namespace `activities` único. La ficha deja de ser una ruta plana y pasa a `actividades/[categoria]/[slug]`, con las URLs viejas redirigidas. La plantilla de ficha se vuelve polimórfica según la categoría y estrena estacionalidad, breadcrumbs y una tarjeta de reserva que sabe funcionar sin precio.

**Tech Stack:** Next.js 16.2.6 · React 19.2.4 · TypeScript · Tailwind v4 · next-intl 4.11.2 · `node:test` + `node:assert/strict` (Node 24 importa `.ts` directo por type stripping).

**Spec:** [`docs/superpowers/specs/2026-08-15-actividades-subpaginas-design.md`](../specs/2026-08-15-actividades-subpaginas-design.md)

## Global Constraints

- **Repo:** `vina-casa-acosta/web/sitio-web`, rama `feat/actividades-subpaginas` (creada desde `origin/main` en `deba432`).
- **Comentarios y UI en español; código en inglés; commits en inglés (Conventional Commits).**
- **Archivos de test en ASCII puro** — sin tildes ni `ñ`. Es la convención vigente en `tests/*.test.mjs`.
- **Este plan NO agrega actividades nuevas.** Solo los 3 tours. Las 12 restantes son el plan 2.
- **Este plan NO toca el índice `D` salvo los enlaces**, que se derivan de los datos. Nada de reestructurar secciones: el cliente no lo aprobó.
- **`AGENTS.md`: este Next tiene breaking changes.** Antes de escribir `redirects()`, `generateStaticParams` o cualquier API de rutas, leer la guía correspondiente en `node_modules/next/dist/docs/`.
- **Toda clave de `messages/` se escribe en los 3 idiomas a la vez.** Verificado en `node_modules/use-intl/dist/esm/production/initializeConfig-*.js`: una clave faltante NO lanza — `getMessageFallback` devuelve la ruta de la clave como texto, y `t.raw()` devuelve ese mismo string donde el código espera un array. El síntoma es texto basura en pantalla o un `.map is not a function` en el build.
- **Traducciones EN/PT quedan marcadas como pendientes de validación humana** en `docs/HANDOFF.md`, igual que el resto del copy traducido del sitio.
- **Gate de cada tarea:** `npm test` y `npm run typecheck`. `npm run build` al cierre (Task 10).
- **Botones:** siempre `components/ui/Button.tsx`. **Iconos:** solo `lucide-react`. **Imágenes:** siempre `next/image`.

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `docs/NOMENCLATURA.md` | Contrato de IDs de sección. Se actualiza antes que el código. | Modificar |
| `data/activities.ts` | Datos duros del catálogo. Sin una sola línea de copy. | Reescribir |
| `messages/{es,en,pt}.json` | Namespace `activities` (labels + categories + items). Retira `tours` y `tourDetail`. | Modificar |
| `app/[locale]/actividades/[categoria]/[slug]/page.tsx` | Ficha `Dd`. Polimórfica por categoría. | Crear |
| `app/[locale]/actividades/[slug]/page.tsx` | Ruta plana anterior. | Borrar |
| `components/ActivityBreadcrumbs.tsx` | Miga visible. Server Component. | Crear |
| `components/SeasonStrip.tsx` | Franja de 12 meses (`Dd3`). Server Component. | Crear |
| `components/ActivityProgram.tsx` | Línea de tiempo numerada del programa. Server Component. | Crear |
| `components/ActivityReservationForm.tsx` | Formulario bimodal reserva/cotización. Client Component. | Renombrar desde `TourReservationForm.tsx` |
| `components/TourReservationForm.tsx` | — | Borrar (renombrado) |
| `lib/activityJsonLd.ts` | `Product` + `Offer` opcional + `BreadcrumbList` de la ficha. | Crear |
| `lib/netlifyForms.ts` | Nombres de formulario válidos. | Modificar |
| `public/__forms.html` | Declaración de campos para Netlify. | Modificar |
| `next.config.ts` | `redirects()` de las URLs viejas y de las URLs padre. | Modificar |
| `app/sitemap.ts` | Rutas derivadas de `data/activities.ts`. | Modificar |
| `components/Navbar.tsx` | Submenú de actividades — solo cambia la construcción de URL. | Modificar |
| `app/[locale]/page.tsx` | Home: lee el namespace nuevo y la URL nueva. | Modificar |
| `app/[locale]/actividades/page.tsx` | Índice: lee el namespace nuevo y la URL nueva. | Modificar |
| `tests/actividades-catalogo.test.mjs` | Invariantes del catálogo (slugs, meses, categorías). | Crear |
| `tests/actividades-i18n-parity.test.mjs` | Paridad es/en/pt del namespace `activities`. | Crear |
| `tests/actividades-redirects.test.mjs` | Las URLs viejas redirigen y con el código correcto. | Crear |
| `tests/actividades-sitemap.test.mjs` | Toda actividad está en el sitemap. | Crear |
| `tests/season-strip-source.test.mjs` | La franja no distingue solo por color. | Crear |
| `docs/HANDOFF.md` | Bitácora técnica. | Modificar |

---

### Task 1: Actualizar el contrato de nomenclatura

`docs/NOMENCLATURA.md` es el contrato del proyecto: dice explícitamente que cualquier cambio se refleja primero ahí y después en el código. Esta tarea no toca código.

**Files:**
- Modify: `docs/NOMENCLATURA.md:67-79` (bloque `Dd`), y agregar `Dv`, `Dc`, `De`

**Interfaces:**
- Produces: los IDs `Dd1`–`Dd8`, `Dv`, `Dc`, `De`, que el resto del plan usa en comentarios de código.

- [ ] **Step 1: Reemplazar el bloque `Dd`**

Reemplazar las líneas 67-79 de `docs/NOMENCLATURA.md` por:

```markdown
## Dd — Detalle de actividad (`app/[locale]/actividades/[categoria]/[slug]/page.tsx`)

Subpágina dinámica de D (una actividad por página). Mismo patrón que `Cd`.
La ruta lleva la categoría: `/actividades/tours/ombu`, `/actividades/talleres/pizzas`.

| ID | Sección |
|---|---|
| Dd1 | Hero + breadcrumbs + ficha rápida (Lugar · Duración · Participantes · Temporada) |
| Dd2 | Sub-nav ancla (Detalle · Galería · Reserva) |
| Dd3 | Estacionalidad (franja de 12 meses) |
| Dd4 | Detalle — tickets (tours) o programa de la jornada (talleres · experiencias) |
| Dd5 | Tarjeta de reserva: precio **o** "a consultar", más condiciones |
| Dd6 | Galería (marcos de diseño hasta que haya fotos) |
| Dd7 | Reserva o cotización (formulario Netlify Forms) |
| Dd8 | Otras actividades de la misma categoría |

## Dv — Hub de Vendimia (`app/[locale]/actividades/vendimia/page.tsx`)

| ID | Sección |
|---|---|
| Dv1 | Hero + breadcrumbs |
| Dv2 | Qué es la vendimia en Casa Acosta |
| Dv3 | El ciclo de la vid a lo largo del año |
| Dv4 | El programa: corta, pisa y celebra |
| Dv5 | Otras actividades de temporada |
| Dv6 | Galería |
| Dv7 | Reserva / cotización |

## Dc, De — Reservados (aún no existen)

| ID | Página | Estado |
|---|---|---|
| Dc | Landing de categoría (`/actividades/tours`, `/talleres`, `/experiencias`) | Reservado. Hoy esas URLs redirigen en 307 al ancla del índice. |
| De | Eventos privados (`/actividades/eventos-privados`) | Reservado. Hoy es la sección D4 del índice. |
```

- [ ] **Step 2: Corregir la nota de mantenimiento**

En la sección `## Notas de mantenimiento`, la línea que dice "la próxima sería **I**" queda obsoleta: las páginas nuevas son sub-páginas de D, no letras nuevas. Reemplazarla por:

```markdown
- Cuando se agrega una **nueva página**, se le asigna la siguiente letra disponible (la próxima sería **I**). Si la página nueva es hija de otra —una subpágina, una landing de categoría— usa el prefijo de su madre en minúscula (`Cd`, `Dd`, `Dv`), no una letra propia.
```

- [ ] **Step 3: Verificar que no queden referencias a la ruta vieja**

Run: `grep -n "actividades/\[slug\]" docs/NOMENCLATURA.md`
Expected: sin resultados.

- [ ] **Step 4: Commit**

```bash
git add docs/NOMENCLATURA.md
git commit -m "docs(nomenclatura): give the activity subpages their section ids"
```

---

### Task 2: Modelo de datos del catálogo

`data/activities.ts` hoy declara `name`, `description`, `highlights` y `duration` que **nadie lee** — verificado con grep sobre `app/`, `components/` y `lib/`: todas las lecturas pasan por `messages/*.json`. Copiar esa duplicación a 15 actividades es el problema que este trabajo existe para evitar.

Esta tarea solo cambia la forma de los datos. Los 3 tours conservan sus slugs viejos (`tour-ombu`, …); el renombre va en Task 4, junto con los redirects, para que no exista un estado intermedio con URLs que no queremos publicar.

**Files:**
- Rewrite: `data/activities.ts`
- Test: `tests/actividades-catalogo.test.mjs` (crear)

**Interfaces:**
- Produces:
  - `type ActivityCategory = "tours" | "talleres" | "experiencias"`
  - `type Activity = { slug, category, priceCLP?, minPeople, months, durationISO?, image, premium? }`
  - `const ACTIVITY_CATEGORIES: readonly ActivityCategory[]`
  - `const RESERVED_ACTIVITY_SEGMENTS: readonly string[]`
  - `const activities: Activity[]`
  - `const alliances: Alliance[]`
  - `function getActivity(category: string, slug: string): Activity | undefined`
  - `function activitiesByCategory(category: ActivityCategory): Activity[]`
  - `const tours: Activity[]` — vista derivada, para que los consumidores actuales no se rompan en esta tarea.

- [ ] **Step 1: Escribir el test de invariantes**

Crear `tests/actividades-catalogo.test.mjs`. Sin tildes ni `ñ` (convención del directorio):

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  activities,
  ACTIVITY_CATEGORIES,
  RESERVED_ACTIVITY_SEGMENTS,
  getActivity,
  activitiesByCategory,
} from "../data/activities.ts";

/**
 * El catalogo alimenta rutas, sitemap, menu y JSON-LD. Un slug repetido o que
 * choque con un segmento reservado no rompe el build: genera dos rutas que se
 * pisan, y el sintoma aparece en produccion como una pagina que muestra la
 * actividad equivocada. Por eso se afirma aca y no en un comentario.
 */

test("todo slug es unico en el catalogo completo", () => {
  const slugs = activities.map((a) => a.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("ningun slug choca con un segmento reservado de la ruta", () => {
  for (const activity of activities) {
    assert.ok(
      !RESERVED_ACTIVITY_SEGMENTS.includes(activity.slug),
      `el slug ${activity.slug} choca con un segmento reservado`,
    );
  }
});

test("ninguna categoria choca con un segmento reservado", () => {
  for (const category of ACTIVITY_CATEGORIES) {
    assert.ok(!RESERVED_ACTIVITY_SEGMENTS.includes(category));
  }
});

test("cada actividad declara una categoria conocida", () => {
  for (const activity of activities) {
    assert.ok(ACTIVITY_CATEGORIES.includes(activity.category), activity.slug);
  }
});

test("cada actividad declara un minimo de personas positivo", () => {
  for (const activity of activities) {
    assert.ok(Number.isInteger(activity.minPeople), activity.slug);
    assert.ok(activity.minPeople > 0, activity.slug);
  }
});

test("los meses son enteros 1-12, sin repetidos y en orden", () => {
  for (const activity of activities) {
    const { months, slug } = activity;
    assert.ok(months.length > 0, `${slug} no declara meses`);
    assert.ok(months.length <= 12, slug);
    assert.equal(new Set(months).size, months.length, `${slug} repite un mes`);
    for (const month of months) {
      assert.ok(Number.isInteger(month) && month >= 1 && month <= 12, slug);
    }
    assert.deepEqual(months, [...months].sort((a, b) => a - b), `${slug} desordenado`);
  }
});

test("el precio, si existe, es un entero positivo de pesos", () => {
  for (const activity of activities) {
    if (activity.priceCLP === undefined) continue;
    assert.ok(Number.isInteger(activity.priceCLP), activity.slug);
    assert.ok(activity.priceCLP > 0, activity.slug);
  }
});

test("la duracion ISO, si existe, tiene formato de duracion", () => {
  for (const activity of activities) {
    if (activity.durationISO === undefined) continue;
    assert.match(activity.durationISO, /^PT(\d+H)?(\d+M)?$/, activity.slug);
  }
});

test("getActivity encuentra por categoria y slug, y no cruza categorias", () => {
  const first = activities[0];
  assert.equal(getActivity(first.category, first.slug), first);
  assert.equal(getActivity("talleres", "no-existe"), undefined);

  const otherCategory = ACTIVITY_CATEGORIES.find((c) => c !== first.category);
  assert.equal(getActivity(otherCategory, first.slug), undefined);
});

test("activitiesByCategory devuelve solo esa categoria", () => {
  for (const category of ACTIVITY_CATEGORIES) {
    for (const activity of activitiesByCategory(category)) {
      assert.equal(activity.category, category);
    }
  }
});

test("los tours van de menor a mayor precio", () => {
  // El orden fijo lo consume la grilla del indice y el submenu del navbar.
  const prices = activitiesByCategory("tours").map((t) => t.priceCLP);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test tests/actividades-catalogo.test.mjs`
Expected: FAIL — `data/activities.ts` no exporta `activities`, `ACTIVITY_CATEGORIES`, `RESERVED_ACTIVITY_SEGMENTS`, `getActivity` ni `activitiesByCategory`.

- [ ] **Step 3: Reescribir `data/activities.ts`**

Reemplazar el archivo completo por:

```ts
/**
 * Catalogo de actividades — SOLO datos duros.
 *
 * Todo el texto visible (nombre, bajada, programa, duracion en palabras) vive en
 * `messages/{es,en,pt}.json`, namespace `activities.items.{slug}`. Aca no se
 * escribe copy: hasta la version anterior de este archivo los campos `name`,
 * `description`, `highlights` y `duration` estaban duplicados con los mensajes
 * y ninguna parte del sitio los leia. Con 15 actividades esa duplicacion son 15
 * lugares donde el nombre puede quedar distinto del que se muestra.
 *
 * `slug` es la clave en `messages` Y el segmento de la URL. Es unico en todo el
 * catalogo, no por categoria: `tests/actividades-catalogo.test.mjs` lo afirma.
 */

export type ActivityCategory = "tours" | "talleres" | "experiencias";

export type Activity = {
  /** Unico en todo el catalogo. Es la clave en messages y el segmento de URL. */
  slug: string;
  category: ActivityCategory;
  /**
   * CLP por persona. Ausente = la ficha muestra "precio a consultar" y el
   * formulario pasa a modo cotizacion. No se inventan cifras: el catalogo del
   * cliente solo trae precio para los tours.
   */
  priceCLP?: number;
  /** Piso de personas por reserva. */
  minPeople: number;
  /** Meses en que se realiza, 1-12. Los doce = todo el ano. */
  months: number[];
  /**
   * Duracion en ISO 8601 para schema.org. Ausente cuando el catalogo no da una
   * duracion medible ("jornada completa", "actividad breve de temporada").
   * La duracion que se LEE en pantalla vive en messages, no aca.
   */
  durationISO?: string;
  image: string;
  premium?: boolean;
};

/** Alianza vendida por un tercero: no es actividad nuestra ni tiene ficha. */
export type Alliance = {
  slug: string;
  image: string;
  purchaseUrl: string;
};

export const ACTIVITY_CATEGORIES = ["tours", "talleres", "experiencias"] as const;

/**
 * Segmentos que la ruta `[categoria]` NO puede recibir porque ya existen como
 * carpeta estatica bajo `/actividades`. Next resuelve el estatico antes que el
 * dinamico, asi que una colision no falla el build: silencia una de las dos
 * paginas.
 */
export const RESERVED_ACTIVITY_SEGMENTS = ["vendimia", "eventos-privados"] as const;

const TODO_EL_ANO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * Foto por categoria. Son fotos que ya existen y estan optimizadas en `public/`:
 * el cliente todavia no entrego material por actividad. Cuando llegue, se agrega
 * `image` en la actividad y pisa a la de su categoria — una linea por foto.
 */
const CATEGORY_IMAGE: Record<ActivityCategory, string> = {
  tours: "/images/actividades/tour-carmenere.webp",
  talleres: "/images/actividades/talleres.jpg",
  experiencias: "/images/actividades/pareja-columpio.webp",
};

/**
 * Orden fijo: tours de menor a mayor precio. Es el que se ve en el submenu del
 * navbar, en la grilla D2 y en "otras actividades" de la ficha.
 */
export const activities: Activity[] = [
  {
    slug: "tour-ombu",
    category: "tours",
    priceCLP: 30000,
    minPeople: 2,
    months: TODO_EL_ANO,
    durationISO: "PT2H",
    image:
      "https://images.unsplash.com/photo-1474722883778-792e7990302f?auto=format&fit=crop&w=1400&q=70",
  },
  {
    slug: "tour-bera",
    category: "tours",
    priceCLP: 35000,
    minPeople: 2,
    months: TODO_EL_ANO,
    durationISO: "PT2H30M",
    image:
      "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1400&q=70",
  },
  {
    slug: "tour-carmenere",
    category: "tours",
    priceCLP: 45000,
    minPeople: 4,
    months: TODO_EL_ANO,
    durationISO: "PT3H",
    image: CATEGORY_IMAGE.tours,
    premium: true,
  },
];

export const alliances: Alliance[] = [
  {
    slug: "tren-efe",
    image: "/images/actividades/tren-efe.jpg",
    purchaseUrl: "https://pasajes.efe.cl/turistico/casa-acosta",
  },
];

export function activitiesByCategory(category: ActivityCategory): Activity[] {
  return activities.filter((activity) => activity.category === category);
}

/**
 * Busca por categoria Y slug. Que exija las dos no es redundante aunque el slug
 * sea unico: la ruta recibe ambos de la URL, y sin el cruce
 * `/actividades/talleres/ombu` renderizaria el tour bajo una URL mentirosa.
 */
export function getActivity(category: string, slug: string): Activity | undefined {
  return activities.find(
    (activity) => activity.category === category && activity.slug === slug,
  );
}

/** Vista derivada. Los consumidores actuales siguen importando `tours`. */
export const tours: Activity[] = activitiesByCategory("tours");
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test tests/actividades-catalogo.test.mjs`
Expected: PASS, 11 tests.

- [ ] **Step 5: Arreglar los consumidores del tipo viejo**

`experiences` y `getTourBySlug` ya no existen. Ajustar mínimamente, sin cambiar comportamiento:

1. `app/[locale]/actividades/[slug]/page.tsx:30` — reemplazar
   `import { tours, getTourBySlug } from "@/data/activities";` por
   `import { tours, getActivity } from "@/data/activities";`
   y en las líneas 59 y 72, reemplazar `getTourBySlug(slug)` por `getActivity("tours", slug)`.
2. `app/[locale]/actividades/page.tsx:10` y `app/[locale]/page.tsx:12` — el array `experiences` desaparece del módulo de datos. Declararlo **temporalmente** en cada página, tal cual lo que había, con un comentario que diga que lo reemplaza el plan 3:

```ts
// Tarjetas de la seccion D3. Las reemplaza `CategoryChooserCard` en el plan 3
// (ver docs/superpowers/specs/2026-08-15-actividades-subpaginas-design.md).
const experiences = [
  { slug: "vendimia-2026", image: "/images/actividades/vendimia-2026.jpg" },
  { slug: "talleres", image: "/images/actividades/talleres.jpg" },
  {
    slug: "tren-efe",
    image: "/images/actividades/tren-efe.jpg",
    purchaseUrl: "https://pasajes.efe.cl/turistico/casa-acosta",
  },
];
```

- [ ] **Step 6: Verificar que compila y que la suite sigue verde**

Run: `npm run typecheck && npm test`
Expected: PASS. Si `typecheck` se queja de `PageProps`, correr `npx next typegen` primero — está incluido en el script.

- [ ] **Step 7: Commit**

```bash
git add data/activities.ts tests/actividades-catalogo.test.mjs "app/[locale]/actividades/[slug]/page.tsx" "app/[locale]/actividades/page.tsx" "app/[locale]/page.tsx"
git commit -m "refactor(activities): keep facts in the data file and copy in the messages"
```

---

### Task 3: Namespace `activities` en los tres idiomas

`tours` y `tourDetail` describen lo mismo con dos formas. Se unifican en `activities`, que es el que van a usar las 15 páginas.

**Files:**
- Modify: `messages/es.json`, `messages/en.json`, `messages/pt.json`
- Test: `tests/actividades-i18n-parity.test.mjs` (crear)

**Interfaces:**
- Produces: `activities.labels.*`, `activities.categories.{tours,talleres,experiencias}.*`, `activities.items.{slug}.*`.
- Consumes: los slugs de `data/activities.ts` (Task 2).

- [ ] **Step 1: Escribir el test de paridad**

Crear `tests/actividades-i18n-parity.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { activities } from "../data/activities.ts";

/**
 * next-intl NO falla cuando falta una clave. Verificado en
 * node_modules/use-intl/.../initializeConfig-*.js: el onError por defecto solo
 * hace console.error y getMessageFallback devuelve la ruta de la clave como
 * texto. O sea que una pagina sin traducir se publica mostrando
 * "activities.items.pizzas.name" en pantalla, y donde el codigo espera un array
 * (t.raw) recibe ese string y revienta con .map is not a function.
 *
 * Este test es lo que convierte ese error silencioso en un rojo.
 */

const LOCALES = ["es", "en", "pt"];

async function load(locale) {
  const url = new URL(`../messages/${locale}.json`, import.meta.url);
  return JSON.parse(await readFile(url, "utf8"));
}

/** Rutas de todas las hojas, para comparar estructura y no solo el primer nivel. */
function leafPaths(value, prefix = "") {
  if (Array.isArray(value)) return [prefix];
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

const bundles = Object.fromEntries(
  await Promise.all(LOCALES.map(async (l) => [l, await load(l)])),
);

test("el namespace activities tiene las mismas claves en los tres idiomas", () => {
  const reference = leafPaths(bundles.es.activities).sort();
  for (const locale of LOCALES.slice(1)) {
    const actual = leafPaths(bundles[locale].activities).sort();
    const missing = reference.filter((k) => !actual.includes(k));
    const extra = actual.filter((k) => !reference.includes(k));
    assert.deepEqual(missing, [], `faltan en ${locale}`);
    assert.deepEqual(extra, [], `sobran en ${locale}`);
  }
});

test("cada actividad del catalogo tiene su bloque de copy en los tres idiomas", () => {
  for (const locale of LOCALES) {
    for (const activity of activities) {
      const item = bundles[locale].activities.items[activity.slug];
      assert.ok(item, `${locale}: falta activities.items.${activity.slug}`);
      for (const field of ["name", "tagline", "intro", "duration", "groupFrom"]) {
        assert.equal(
          typeof item[field],
          "string",
          `${locale}.${activity.slug}.${field}`,
        );
        assert.ok(item[field].length > 0, `${locale}.${activity.slug}.${field}`);
      }
    }
  }
});

test("los campos de lista son arrays de strings no vacios", () => {
  for (const locale of LOCALES) {
    const items = bundles[locale].activities.items;
    for (const [slug, item] of Object.entries(items)) {
      for (const field of ["includes", "wines", "program"]) {
        if (item[field] === undefined) continue;
        assert.ok(Array.isArray(item[field]), `${locale}.${slug}.${field}`);
        assert.ok(item[field].length > 0, `${locale}.${slug}.${field}`);
        for (const entry of item[field]) {
          assert.equal(typeof entry, "string", `${locale}.${slug}.${field}`);
        }
      }
    }
  }
});

test("los namespaces viejos ya no existen en ningun idioma", () => {
  for (const locale of LOCALES) {
    assert.equal(bundles[locale].tours, undefined, locale);
    assert.equal(bundles[locale].tourDetail, undefined, locale);
  }
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test tests/actividades-i18n-parity.test.mjs`
Expected: FAIL — `bundles.es.activities` es `undefined`.

- [ ] **Step 3: Escribir el namespace `activities` en `messages/es.json`**

Insertar después de `"actividades"` y **borrar** los namespaces `tours` y `tourDetail`. El contenido de `items` es el que ya existe en `tourDetail`, sin cambios de redacción — esto es una mudanza, no una reescritura de copy.

```jsonc
"activities": {
  "labels": {
    "back": "Volver a actividades",
    "breadcrumbHome": "Inicio",
    "breadcrumbActivities": "Actividades",
    "breadcrumbAria": "Ruta de navegación",
    "premium": "Premium",
    "introImageAlt": "Cartel tallado de Viña Casa Acosta entre las parras del viñedo",
    "reserveImageAlt": "Pareja en un columpio entre las parras del viñedo",
    "placeLabel": "Lugar",
    "placeValue": "Viña Casa Acosta",
    "durationLabel": "Duración",
    "participantsLabel": "Participantes",
    "seasonLabel": "Temporada",
    "seasonTitle": "¿Cuándo se hace?",
    "seasonAllYear": "Todo el año",
    "seasonAvailableIn": "Disponible en {months}.",
    "seasonAria": "Meses en que se realiza la actividad",
    "reservationsLabel": "Reservas",
    "nav": {
      "detail": "Detalle",
      "gallery": "Galería",
      "reserve": "Reserva",
      "aria": "Secciones de la actividad"
    },
    "whatIncludes": "¿Qué incluye?",
    "programTitle": "Programa de la jornada",
    "duringExperience": "Durante la experiencia disfrutarás de:",
    "ticketsNote": "Cada punto es un ticket que canjeas el día de tu visita.",
    "tastingLabel": "Degustación",
    "pairingLabel": "Maridaje",
    "atCloseLabel": "Al cierre",
    "priceLabel": "Precio",
    "priceOnRequest": "Precio a consultar",
    "priceOnRequestNote": "El valor depende del tamaño del grupo y de la fecha. Te lo confirmamos al responder.",
    "perPerson": "por persona",
    "conditionsTitle": "Condiciones",
    "conditionMinors": "Degustación no apta para menores de 18 años · Ley N° 19.925",
    "galleryTitle": "Galería",
    "galleryComing": "Estamos preparando la galería de fotos de esta experiencia.",
    "otherInCategory": "Otras actividades que te pueden interesar",
    "form": {
      "title": "Reserva",
      "titleQuote": "Solicitar cotización",
      "subtitle": "Completa tus datos y coordinamos la fecha contigo, o escríbenos directo por WhatsApp.",
      "subtitleQuote": "Cuéntanos cuántos son y qué fecha tienes en mente, y te enviamos el valor.",
      "name": "Nombre",
      "namePlaceholder": "Tu nombre",
      "email": "Correo",
      "emailPlaceholder": "tucorreo@ejemplo.com",
      "phone": "Teléfono",
      "phonePlaceholder": "+56 9 ...",
      "people": "Personas",
      "peopleHint": "Mínimo {min} personas por reserva.",
      "date": "Fecha",
      "datePlaceholder": "--/--/26",
      "dateHint": "Elige el día de tu visita — puedes cambiarlo cuando quieras.",
      "dateOpen": "Abrir calendario y elegir fecha",
      "note": "Nota adicional",
      "notePlaceholder": "¿Algo que debamos saber? (opcional)",
      "submitIdle": "Solicitar reserva",
      "submitIdleQuote": "Solicitar cotización",
      "submitting": "Enviando…",
      "success": "¡Solicitud enviada!",
      "successMessage": "Gracias. Te contactaremos para confirmar tu reserva.",
      "error": "No se pudo enviar",
      "errorMessage": "No pudimos enviar tu solicitud. Reserva por WhatsApp con el botón de al lado.",
      "whatsapp": "Reservar por WhatsApp",
      "whatsappQuote": "Consultar por WhatsApp",
      "waIntro": "Hola 👋 Me gustaría reservar el {activity}.",
      "waIntroQuote": "Hola 👋 Me gustaría cotizar el {activity}."
    }
  },
  "categories": {
    "tours": { "name": "Tours", "singular": "Tour" },
    "talleres": { "name": "Talleres", "singular": "Taller" },
    "experiencias": { "name": "Experiencias", "singular": "Experiencia" }
  },
  "items": {
    "tour-ombu": {
      "name": "Tour Ombú",
      "description": "Introducción al mundo del vino: recorre nuestros viñedos de Carménère, la bodega y la sala de barricas, junto a una degustación guiada.",
      "highlights": [
        "3 vinos líneas Ombú y Lajau",
        "Recorrido por bodega y barricas",
        "Tabla de maridaje"
      ],
      "tagline": "Introducción al mundo del vino en Casa Acosta",
      "intro": "Una experiencia ideal para quienes desean conocer nuestra viña desde su origen, recorriendo nuestros viñedos de Carménère, bodega y sala de barricas, junto a una degustación guiada.",
      "duration": "2 horas",
      "groupFrom": "Grupos desde 2 personas",
      "reservationNote": "Ideal 1 día antes o según disponibilidad",
      "includes": [
        "Recepción en el Jardín de Variedades con copa de bienvenida, Berá Rosé Carménère.",
        "Caminata entre viñedos (opcional).",
        "Recorrido por la bodega, sala de vinificación y sala de barricas, con explicación completa del proceso productivo del vino, desde la vid hasta la copa.",
        "Cata de vinos."
      ],
      "includesHighlight": "Tabla de maridaje",
      "wines": ["Degustación de 3 vinos de las líneas Ombú y/o Lajau."],
      "pairing": "Tabla de maridaje incluida.",
      "closing": "Podrás adquirir nuestros vinos directamente en la bodega."
    }
  }
}
```

Repetir la estructura de `items` para `tour-bera` y `tour-carmenere`, copiando **textualmente** los valores que hoy están en `messages/es.json` → `tours.tour-bera` / `tours.tour-carmenere` (campos `name`, `description`, `highlights`) y `tourDetail.tour-bera` / `tourDetail.tour-carmenere` (campos `tagline`, `intro`, `duration`, `groupFrom`, `reservationNote`, `includes`, `includesHighlight`, `wines`, `pairing`, `closing`).

- [ ] **Step 4: Repetir en `messages/en.json` y `messages/pt.json`**

Misma estructura exacta. Los valores de `items` se copian de los `tours` / `tourDetail` de cada archivo — ya están traducidos. Las claves nuevas de `labels` que no existían (`breadcrumbHome`, `breadcrumbActivities`, `breadcrumbAria`, `seasonLabel`, `seasonTitle`, `seasonAllYear`, `seasonAvailableIn`, `seasonAria`, `programTitle`, `priceOnRequest`, `priceOnRequestNote`, `titleQuote`, `subtitleQuote`, `submitIdleQuote`, `whatsappQuote`, `waIntroQuote`, `otherInCategory`) y las de `categories` se traducen:

| Clave | EN | PT |
|---|---|---|
| `breadcrumbHome` | Home | Início |
| `breadcrumbActivities` | Activities | Atividades |
| `breadcrumbAria` | Breadcrumb | Trilha de navegação |
| `seasonLabel` | Season | Temporada |
| `seasonTitle` | When does it run? | Quando acontece? |
| `seasonAllYear` | All year round | O ano todo |
| `seasonAvailableIn` | Available in {months}. | Disponível em {months}. |
| `seasonAria` | Months when this activity runs | Meses em que a atividade acontece |
| `programTitle` | The day, step by step | O programa do dia |
| `priceOnRequest` | Price on request | Preço sob consulta |
| `priceOnRequestNote` | The price depends on group size and date. We confirm it when we reply. | O preço depende do tamanho do grupo e da data. Confirmamos ao responder. |
| `otherInCategory` | Other activities you may like | Outras atividades que podem te interessar |
| `form.titleQuote` | Request a quote | Solicitar orçamento |
| `form.subtitleQuote` | Tell us how many you are and the date you have in mind, and we will send you the price. | Conte quantos são e a data que têm em mente, e enviamos o valor. |
| `form.submitIdleQuote` | Request a quote | Solicitar orçamento |
| `form.whatsappQuote` | Ask on WhatsApp | Perguntar no WhatsApp |
| `form.waIntroQuote` | Hi 👋 I'd like a quote for {activity}. | Olá 👋 Gostaria de um orçamento para {activity}. |
| `categories.tours.name` / `.singular` | Tours / Tour | Tours / Tour |
| `categories.talleres.name` / `.singular` | Workshops / Workshop | Oficinas / Oficina |
| `categories.experiencias.name` / `.singular` | Experiences / Experience | Experiências / Experiência |

En `labels.form.waIntro` cambia el nombre del placeholder de `{tour}` a `{activity}` en los tres idiomas.

- [ ] **Step 5: Correr el test para verificar que pasa**

Run: `node --test tests/actividades-i18n-parity.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 6: Migrar los consumidores al namespace nuevo**

Reemplazar en estos archivos, sin cambiar nada más:

| Archivo | Antes | Después |
|---|---|---|
| `app/[locale]/actividades/[slug]/page.tsx` | `getTranslations("tourDetail")` | `getTranslations("activities.labels")` |
| ídem | `getTranslations("tours")` | `getTranslations("activities.items")` |
| ídem | `t(`${slug}.tagline`)` y demás de `tourDetail.{slug}` | `tItems(`${slug}.tagline`)` |
| `app/[locale]/actividades/page.tsx:72-73` | `getTranslations("tours")` | `getTranslations("activities.items")` |
| `app/[locale]/page.tsx:42,60` | `tTours` / `tTourDetail` | un solo `getTranslations("activities.items")` |
| `components/Navbar.tsx:17` | `useTranslations("tours")` | `useTranslations("activities.items")` |

Ojo con `tourDetail.form.*`: pasa a `activities.labels.form.*`. `TourReservationForm.tsx:24` usa `useTranslations("tourDetail.form")` → `useTranslations("activities.labels.form")`.

- [ ] **Step 7: Verificar**

Run: `npm run typecheck && npm test`
Expected: PASS. Además `grep -rn "tourDetail\|\"tours\"" app components | grep -v node_modules` no debe devolver nada.

- [ ] **Step 8: Commit**

```bash
git add messages tests/actividades-i18n-parity.test.mjs app components
git commit -m "refactor(i18n): describe every activity through one namespace"
```

---

### Task 4: Migrar las URLs a la jerarquía por categoría

Tarea atómica a propósito: mover la ruta, renombrar los slugs y publicar los redirects tienen que pasar en el mismo commit, o queda un estado intermedio con URLs que no queremos que existan.

**Files:**
- Create: `app/[locale]/actividades/[categoria]/[slug]/page.tsx` (movido desde `[slug]/page.tsx`)
- Delete: `app/[locale]/actividades/[slug]/page.tsx`
- Modify: `data/activities.ts` (3 slugs), `messages/{es,en,pt}.json` (3 claves de `items`)
- Modify: `next.config.ts` (agregar `redirects()`)
- Modify: `components/Navbar.tsx`, `app/[locale]/page.tsx`, `app/[locale]/actividades/page.tsx`, `app/sitemap.ts` (construcción de URL)
- Test: `tests/actividades-redirects.test.mjs` (crear)

**Interfaces:**
- Consumes: `activities`, `getActivity`, `ACTIVITY_CATEGORIES` (Task 2); `activities.items.*` (Task 3).
- Produces: `activityPath(activity)` exportado de `data/activities.ts`, la única función que arma la ruta de una ficha. La usan navbar, home, índice, sitemap y JSON-LD.

- [ ] **Step 1: Leer la guía de redirects de esta versión de Next**

Run: `ls node_modules/next/dist/docs/ && grep -rl "redirects" node_modules/next/dist/docs/ | head`

Leer la guía de `redirects` antes de escribir el paso 3. `AGENTS.md` advierte que esta versión tiene breaking changes; en particular hay que confirmar si el `destination` acepta fragmento (`#tours`). **Si no lo acepta**, el destino de las tres URLs padre pasa a `/:locale/actividades` sin ancla y se anota en el comentario del código.

- [ ] **Step 2: Escribir el test de redirects**

Crear `tests/actividades-redirects.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";

/**
 * Las tres URLs de tour estan publicadas y pueden estar compartidas por
 * WhatsApp o indexadas. Mover la ficha sin redirigir las convierte en 404.
 *
 * La distincion 301/307 no es cosmetica: un 301 lo cachea el navegador de forma
 * agresiva. Las URLs padre van a dejar de redirigir cuando exista su landing,
 * asi que tienen que ser temporales; las de tour no vuelven nunca.
 */

const config = await (await import("../next.config.ts")).default;
const redirects = await config.redirects();

function find(source) {
  return redirects.find((r) => r.source === source);
}

const TOUR_MOVES = [
  ["/:locale(es|en|pt)/actividades/tour-ombu", "/:locale/actividades/tours/ombu"],
  ["/:locale(es|en|pt)/actividades/tour-bera", "/:locale/actividades/tours/bera"],
  [
    "/:locale(es|en|pt)/actividades/tour-carmenere",
    "/:locale/actividades/tours/carmenere",
  ],
];

for (const [source, destination] of TOUR_MOVES) {
  test(`la URL vieja ${source} redirige permanente`, () => {
    const rule = find(source);
    assert.ok(rule, `falta el redirect de ${source}`);
    assert.equal(rule.destination, destination);
    assert.equal(rule.permanent, true);
  });
}

const CATEGORY_PARENTS = ["tours", "talleres", "experiencias"];

for (const category of CATEGORY_PARENTS) {
  test(`la URL padre /actividades/${category} redirige temporal`, () => {
    const rule = find(`/:locale(es|en|pt)/actividades/${category}`);
    assert.ok(rule, `falta el redirect padre de ${category}`);
    assert.equal(
      rule.permanent,
      false,
      "tiene que ser temporal: la landing esta planificada",
    );
    assert.match(rule.destination, /^\/:locale\/actividades/);
  });
}

test("ninguna regla captura locales que no existen", () => {
  for (const rule of redirects) {
    if (!rule.source.includes(":locale")) continue;
    assert.match(rule.source, /:locale\(es\|en\|pt\)/, rule.source);
  }
});
```

- [ ] **Step 3: Correr el test para verificar que falla**

Run: `node --test tests/actividades-redirects.test.mjs`
Expected: FAIL — `config.redirects is not a function`.

- [ ] **Step 4: Agregar `redirects()` a `next.config.ts`**

Dentro de `const nextConfig: NextConfig = { … }`, junto a `async headers()`, agregar:

```ts
  /**
   * Redirects de la migracion de Actividades.
   *
   * Van aca y no en `netlify.toml` por el mismo motivo que los headers de
   * seguridad: las reglas del toml las aplica el CDN sobre archivos estaticos,
   * pero estas paginas las contesta el handler de Next y se las saltan.
   *
   * El locale se restringe a (es|en|pt) para no capturar rutas ajenas.
   */
  async redirects() {
    const locale = "/:locale(es|en|pt)/actividades";

    return [
      // Las fichas de tour se mudaron bajo su categoria. Definitivo: la URL
      // plana no vuelve.
      { source: `${locale}/tour-ombu`, destination: "/:locale/actividades/tours/ombu", permanent: true },
      { source: `${locale}/tour-bera`, destination: "/:locale/actividades/tours/bera", permanent: true },
      { source: `${locale}/tour-carmenere`, destination: "/:locale/actividades/tours/carmenere", permanent: true },

      // URLs padre: hoy no tienen landing propia y truncar la ruta es algo que
      // hacen tanto las personas como los crawlers. TEMPORAL a proposito — la
      // landing esta planificada (ver `Dc` en docs/NOMENCLATURA.md), y un 301
      // cacheado impediria estrenarla.
      { source: `${locale}/tours`, destination: "/:locale/actividades#tours", permanent: false },
      { source: `${locale}/talleres`, destination: "/:locale/actividades#talleres", permanent: false },
      { source: `${locale}/experiencias`, destination: "/:locale/actividades#experiencias", permanent: false },
    ];
  },
```

- [ ] **Step 5: Correr el test para verificar que pasa**

Run: `node --test tests/actividades-redirects.test.mjs`
Expected: PASS, 7 tests.

- [ ] **Step 6: Renombrar los slugs y agregar `activityPath`**

En `data/activities.ts`: `tour-ombu` → `ombu`, `tour-bera` → `bera`, `tour-carmenere` → `carmenere`. Y agregar al final:

```ts
/**
 * Ruta de la ficha, SIN prefijo de idioma. Es la unica funcion que arma esta
 * URL: navbar, home, indice, sitemap y JSON-LD la consumen. Que exista una sola
 * es lo que hace que la proxima mudanza sea un cambio de una linea.
 */
export function activityPath(activity: Activity): string {
  return `/actividades/${activity.category}/${activity.slug}`;
}
```

En los tres `messages/*.json`, renombrar las claves `activities.items.tour-ombu` → `ombu`, `tour-bera` → `bera`, `tour-carmenere` → `carmenere`.

- [ ] **Step 7: Mover la ruta**

```bash
mkdir -p "app/[locale]/actividades/[categoria]"
git mv "app/[locale]/actividades/[slug]" "app/[locale]/actividades/[categoria]/[slug]"
```

En el archivo movido:

1. El tipo de `PageProps` pasa a `PageProps<"/[locale]/actividades/[categoria]/[slug]">` y `params` ahora trae `categoria`.
2. `generateStaticParams` pasa a recorrer el catálogo entero:

```tsx
export async function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    activities.map((activity) => ({
      locale,
      categoria: activity.category,
      slug: activity.slug,
    })),
  );
}
```

3. La búsqueda pasa a `getActivity(categoria, slug)`; si no existe, `notFound()`.
4. `alternatesFor(locale, activityPath(activity))` reemplaza el `path` armado a mano.
5. En "otras actividades" (la sección final), `tours.filter(...)` pasa a
   `activitiesByCategory(activity.category).filter((o) => o.slug !== slug)` y los
   `href` pasan por `activityPath(o)`.
6. La tabla `includeIcons` cambia sus claves de `tour-ombu`/`tour-bera`/`tour-carmenere` a `ombu`/`bera`/`carmenere`.

- [ ] **Step 8: Actualizar los que arman la URL a mano**

Reemplazar cada `` `/${locale}/actividades/${slug}` `` por `` `/${locale}${activityPath(activity)}` ``:

- `components/Navbar.tsx:217` y `:409`
- `app/[locale]/actividades/page.tsx:197` y `:241`
- `app/[locale]/page.tsx:79-80` (dentro del map que arma `showcaseTours`)
- `app/sitemap.ts:39`

- [ ] **Step 9: Verificar**

Run: `npm run typecheck && npm test && npm run build`
Expected: PASS. En la salida del build tienen que aparecer `/[locale]/actividades/[categoria]/[slug]` con 9 rutas estáticas (3 tours × 3 locales) y **no** debe quedar rastro de `/actividades/[slug]`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(activities): move each activity under the category it belongs to"
```

---

### Task 5: Franja de estacionalidad (`SeasonStrip`, Dd3)

El dato de meses ya está en el catálogo y hoy no se usa en ninguna parte. Responde la duda real del visitante, da contenido único por página y alimenta el structured data.

**Files:**
- Create: `components/SeasonStrip.tsx`
- Test: `tests/season-strip-source.test.mjs` (crear)

**Interfaces:**
- Consumes: `Activity["months"]` (Task 2).
- Produces: `<SeasonStrip months={number[]} locale={string} labels={{ allYear, availableIn, aria }} />`, Server Component.

- [ ] **Step 1: Escribir el test**

Crear `tests/season-strip-source.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Dos reglas que se rompen sin sintoma visible:
 *
 * 1. Los nombres de mes se piden a Intl con el locale. Escribirlos a mano son 36
 *    strings nuevos por mantener y una fuente mas de desincronizacion.
 * 2. El mes disponible se distingue por color Y por peso tipografico. Solo color
 *    incumple WCAG 1.4.1 y la pagina se ve igual de bien para quien lo escribio.
 */

const source = await readFile(
  new URL("../components/SeasonStrip.tsx", import.meta.url),
  "utf8",
);

test("los nombres de mes salen de Intl, no escritos a mano", () => {
  assert.match(source, /Intl\.DateTimeFormat/);
  assert.doesNotMatch(source, /enero|febrero|January|janeiro/i);
});

test("la enumeracion del resumen usa Intl.ListFormat", () => {
  assert.match(source, /Intl\.ListFormat/);
});

test("el mes disponible no se distingue solo por color", () => {
  assert.match(source, /font-semibold|font-bold/);
});

test("la franja es una lista, no una fila de divs", () => {
  assert.match(source, /<ul/);
  assert.match(source, /<li/);
});

test("la grilla se oculta a la accesibilidad y el resumen queda en texto", () => {
  // La grilla de 12 casillas leida en voz alta son doce abreviaturas sueltas.
  // El dato lo lleva el parrafo de resumen, que es visible ademas de accesible:
  // un sr-only aparte seria la misma frase dicha dos veces.
  assert.match(source, /<ul[\s\S]{0,120}aria-hidden/);
  assert.doesNotMatch(source, /sr-only/);
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test tests/season-strip-source.test.mjs`
Expected: FAIL — `ENOENT: components/SeasonStrip.tsx`.

- [ ] **Step 3: Escribir el componente**

Crear `components/SeasonStrip.tsx`:

```tsx
import { CalendarDays } from "lucide-react";

type Props = {
  /** Meses en que se realiza, 1-12. */
  months: number[];
  locale: string;
  labels: {
    title: string;
    allYear: string;
    /** Lleva `{months}` — la enumeracion la arma este componente. */
    availableIn: string;
    aria: string;
  };
};

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * Dd3 — Estacionalidad.
 *
 * Los nombres de mes salen de `Intl` y no de `messages`: son 12 strings por
 * idioma que el navegador ya sabe, y escribirlos a mano agrega 36 traducciones
 * que mantener. El año de referencia (2026) da igual — solo se usa para pedirle
 * a Intl el nombre del mes.
 *
 * Cuando son los doce meses la franja se colapsa a "Todo el año": pintar doce
 * casillas idénticas no comunica nada.
 */
export default function SeasonStrip({ months, locale, labels }: Props) {
  const allYear = months.length === ALL_MONTHS.length;

  // `short` y no `narrow`: narrow da una sola letra y en español deja cuatro
  // meses llamados "M", "J", "J" y "A" sin forma de distinguirlos.
  const short = new Intl.DateTimeFormat(locale, { month: "short" });
  const long = new Intl.DateTimeFormat(locale, { month: "long" });
  const nameOf = (month: number, fmt: Intl.DateTimeFormat) =>
    fmt.format(new Date(2026, month - 1, 1));

  // El dato lo lleva esta frase, no la grilla: doce abreviaturas leídas en voz
  // alta no dicen nada. Por eso la grilla va `aria-hidden` y esto va visible.
  const summary = allYear
    ? labels.allYear
    : labels.availableIn.replace(
        "{months}",
        new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(
          months.map((m) => nameOf(m, long)),
        ),
      );

  return (
    <section
      aria-label={labels.aria}
      className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest/70 p-6 ambient-shadow md:p-7"
    >
      <h3 className="mb-4 flex items-center gap-2.5 font-body text-label-sm font-semibold uppercase tracking-wider text-primary">
        <CalendarDays className="h-4 w-4 text-wine-accent" aria-hidden="true" />
        {labels.title}
      </h3>

      {!allYear && (
        <ul aria-hidden="true" className="mb-4 grid grid-cols-6 gap-1.5 md:grid-cols-12">
          {ALL_MONTHS.map((month) => {
            const active = months.includes(month);
            return (
              <li
                key={month}
                title={nameOf(month, long)}
                className={`flex h-10 items-center justify-center rounded-md font-body text-label-sm uppercase transition-colors ${
                  active
                    ? "bg-wine-accent/12 font-bold text-wine-accent ring-1 ring-wine-accent/35"
                    : "bg-surface-container/60 font-light text-on-surface-variant/45"
                }`}
              >
                {nameOf(month, short)}
              </li>
            );
          })}
        </ul>
      )}

      <p
        className={
          allYear
            ? "font-body text-body-lg text-on-surface"
            : "font-body text-body-md text-on-surface-variant"
        }
      >
        {summary}
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test tests/season-strip-source.test.mjs`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add components/SeasonStrip.tsx tests/season-strip-source.test.mjs
git commit -m "feat(activities): show when in the year each activity actually runs"
```

---

### Task 6: Breadcrumbs visibles

El marcado `BreadcrumbList` de la Task 9 solo es honesto si la miga existe en pantalla. Este componente va primero.

**Files:**
- Create: `components/ActivityBreadcrumbs.tsx`
- Modify: `app/[locale]/actividades/[categoria]/[slug]/page.tsx`

**Interfaces:**
- Produces: `<ActivityBreadcrumbs items={{ href: string; label: string }[]} aria={string} />`. El último ítem se renderiza sin enlace y con `aria-current="page"`.

- [ ] **Step 1: Escribir el componente**

Crear `components/ActivityBreadcrumbs.tsx`:

```tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Crumb = { href: string; label: string };

type Props = {
  /** En orden: Inicio → Actividades → Categoría → Actividad. */
  items: Crumb[];
  aria: string;
};

/**
 * Miga visible. Existe por dos motivos a la vez: orienta a quien llega desde
 * Google a una ficha suelta, y es lo que hace honesto el `BreadcrumbList` del
 * JSON-LD — marcar una jerarquía que la página no muestra es marcado inventado.
 *
 * Va sobre foto, así que el color es claro con sombra de texto.
 */
export default function ActivityBreadcrumbs({ items, aria }: Props) {
  return (
    <nav aria-label={aria}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-body text-label-sm text-white/70 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/40" aria-hidden="true" />
              )}
              {isLast ? (
                <span aria-current="page" className="text-white/90">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="transition-colors hover:text-white">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 2: Montarlo en la ficha**

En `app/[locale]/actividades/[categoria]/[slug]/page.tsx`, dentro del hero, reemplazar el bloque del enlace "Volver a actividades" (hoy en las líneas 131-141) por el breadcrumb:

```tsx
<div className="absolute top-24 left-0 right-0 px-margin-mobile md:px-margin-desktop">
  <div className="max-w-(--container-max) mx-auto">
    <ActivityBreadcrumbs
      aria={t("breadcrumbAria")}
      items={[
        { href: `/${locale}`, label: t("breadcrumbHome") },
        { href: `/${locale}/actividades`, label: t("breadcrumbActivities") },
        {
          href: `/${locale}/actividades#${activity.category}`,
          label: tCategories(`${activity.category}.name`),
        },
        { href: `/${locale}${activityPath(activity)}`, label: name },
      ]}
    />
  </div>
</div>
```

Agregar `const tCategories = await getTranslations("activities.categories");` junto a los demás `getTranslations`.

- [ ] **Step 3: Verificar**

Run: `npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 4: Revisar en el navegador**

Run: `npm run dev` y abrir `http://localhost:3000/es/actividades/tours/ombu`
Expected: la miga se lee sobre la foto en los cuatro niveles, el último sin enlace. Probar también en 320 px de ancho: la miga hace wrap y no desborda.

- [ ] **Step 5: Commit**

```bash
git add components/ActivityBreadcrumbs.tsx "app/[locale]/actividades/[categoria]/[slug]/page.tsx"
git commit -m "feat(activities): show where each activity sits in the site"
```

---

### Task 7: Programa de la jornada y ficha polimórfica

Los tours listan tickets canjeables. Los talleres y experiencias traen una **secuencia ordenada** (Desayuno campesino → Introducción al oficio → Tejido guiado → Cierre): mostrarla como bullets sueltos perdería la información del orden, que es justamente lo que el visitante quiere saber.

Esta tarea deja la plantilla lista aunque todavía no exista ninguna actividad que no sea tour: el componente se prueba solo.

**Files:**
- Create: `components/ActivityProgram.tsx`
- Modify: `app/[locale]/actividades/[categoria]/[slug]/page.tsx`

**Interfaces:**
- Produces: `<ActivityProgram steps={string[]} title={string} />`, Server Component.

- [ ] **Step 1: Escribir el componente**

Crear `components/ActivityProgram.tsx`:

```tsx
type Props = {
  /** Pasos en el orden del catálogo. El orden ES la información. */
  steps: string[];
  title: string;
};

/**
 * Dd4, variante de talleres y experiencias.
 *
 * `<ol>` y no `<ul>`: el catálogo entrega una jornada en orden, y esa secuencia
 * es lo que el visitante quiere saber. La numeración la pinta CSS a partir del
 * índice, no se escribe en el texto.
 */
export default function ActivityProgram({ steps, title }: Props) {
  return (
    <>
      <h3 className="mb-6 font-body text-label-sm font-semibold uppercase tracking-widest text-wine-accent">
        {title}
      </h3>
      <ol className="relative mb-10 space-y-0">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li key={step} className="relative flex gap-5 pb-7 last:pb-0">
              {/* Hilo vertical que une los pasos. No en el último. */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="absolute left-[15px] top-9 bottom-1 w-px bg-wine-accent/25"
                />
              )}
              <span
                aria-hidden="true"
                className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wine-accent/10 font-body text-label-sm font-bold tabular-nums text-wine-accent ring-1 ring-wine-accent/25"
              >
                {index + 1}
              </span>
              <p className="pt-1 font-body text-body-md leading-relaxed text-on-surface">
                {step}
              </p>
            </li>
          );
        })}
      </ol>
    </>
  );
}
```

- [ ] **Step 2: Hacer polimórfica la sección Dd4**

En `app/[locale]/actividades/[categoria]/[slug]/page.tsx`, la sección `#detalle` hoy asume tour. Envolver el bloque de tickets + vinos + maridaje (hoy líneas 249-322) en una condición por categoría:

```tsx
{activity.category === "tours" ? (
  <>
    {/* bloque existente: whatIncludes + ticketsNote + lista includes +
        includesHighlight + wines + pairing + closing */}
  </>
) : (
  <>
    <span className="block h-px w-12 bg-wine-accent/60 mb-5" />
    <h2 className="font-display text-headline-h2 text-primary mb-6">
      {t("whatIncludes")}
    </h2>
    <p className="font-body text-body-md text-on-surface-variant mb-8">
      {t("duringExperience")}
    </p>
    <ActivityProgram steps={program} title={t("programTitle")} />
    {closing && (
      <div className="rounded-xl bg-primary/5 border border-primary/12 p-6">
        <p className="font-body text-body-md text-on-surface">{closing}</p>
      </div>
    )}
  </>
)}
```

Y arriba, donde se leen los mensajes, cambiar la lectura de los campos que solo existen en una de las dos formas:

```tsx
const isTour = activity.category === "tours";
// `t.raw` de una clave ausente devuelve un string, no undefined: se compara con
// `Array.isArray` antes de mapear. Ver la nota de use-intl en el spec.
const rawProgram = tItems.raw(`${slug}.program`);
const program = Array.isArray(rawProgram) ? (rawProgram as string[]) : [];
const rawIncludes = tItems.raw(`${slug}.includes`);
const includes = Array.isArray(rawIncludes) ? (rawIncludes as string[]) : [];
const rawWines = tItems.raw(`${slug}.wines`);
const wines = Array.isArray(rawWines) ? (rawWines as string[]) : [];
```

- [ ] **Step 3: Montar `SeasonStrip` como Dd3**

Entre el sub-nav (Dd2) y la sección `#detalle`, agregar:

```tsx
<section className="bg-surface px-margin-mobile pb-4 md:px-margin-desktop">
  <div className="max-w-(--container-max) mx-auto">
    <SeasonStrip
      months={activity.months}
      locale={locale}
      labels={{
        title: t("seasonTitle"),
        allYear: t("seasonAllYear"),
        availableIn: t("seasonAvailableIn"),
        aria: t("seasonAria"),
      }}
    />
  </div>
</section>
```

Y en la ficha rápida (Dd1), reemplazar la fila "Reservas" por "Temporada" cuando la actividad no es de todo el año — no: **dejar las cuatro filas como están** y agregar la estacionalidad solo en Dd3. Duplicar el dato en dos lugares de la misma página es exactamente lo que este trabajo evita.

- [ ] **Step 4: Verificar**

Run: `npm run typecheck && npm test && npm run build`
Expected: PASS. Los 3 tours siguen mostrando tickets, vinos y maridaje como antes.

- [ ] **Step 5: Revisar en el navegador**

Run: `npm run dev` y abrir `http://localhost:3000/es/actividades/tours/ombu`
Expected: aparece la franja de estacionalidad diciendo "Todo el año" (los tours tienen los 12 meses), y el resto de la ficha se ve igual que antes.

- [ ] **Step 6: Commit**

```bash
git add components/ActivityProgram.tsx "app/[locale]/actividades/[categoria]/[slug]/page.tsx"
git commit -m "feat(activities): tell a workshop day as the sequence it is"
```

---

### Task 8: Formulario bimodal (reserva o cotización)

Las 12 actividades que vienen no tienen precio publicado. La ficha tiene que poder pedir una cotización sin que eso signifique un segundo formulario en paralelo.

**Files:**
- Rename: `components/TourReservationForm.tsx` → `components/ActivityReservationForm.tsx`
- Modify: `lib/netlifyForms.ts`, `public/__forms.html`
- Modify: `app/[locale]/actividades/[categoria]/[slug]/page.tsx`

**Interfaces:**
- Produces: `<ActivityReservationForm activityName={string} minPeople={number} mode={"reserva" | "cotizacion"} />`
- Produces: `NetlifyFormName` incluye `"reserva-actividad"` y ya no `"reserva-tour"`.

- [ ] **Step 1: Declarar el formulario en Netlify**

En `public/__forms.html`, reemplazar el bloque `reserva-tour` por:

```html
    <form name="reserva-actividad" data-netlify="true" data-netlify-honeypot="bot-field" hidden>
      <input type="hidden" name="form-name" value="reserva-actividad" />
      <input type="text" name="bot-field" />
      <input type="text" name="actividad" />
      <input type="text" name="tipo" />
      <input type="text" name="nombre" />
      <input type="email" name="email" />
      <input type="tel" name="telefono" />
      <input type="number" name="personas" />
      <input type="date" name="fecha" />
      <textarea name="nota"></textarea>
      <input type="text" name="idioma" />
    </form>
```

En `lib/netlifyForms.ts`, cambiar el tipo:

```ts
export type NetlifyFormName = "contacto" | "reserva-actividad";
```

- [ ] **Step 2: Renombrar el componente y hacerlo bimodal**

```bash
git mv components/TourReservationForm.tsx components/ActivityReservationForm.tsx
```

Cambios dentro del archivo:

```tsx
type Props = {
  /** Nombre de la actividad, para el prefill del mensaje de WhatsApp. */
  activityName: string;
  /** Piso de personas por reserva (`minPeople` en data/activities.ts). */
  minPeople: number;
  /**
   * `cotizacion` cuando la actividad no tiene precio publicado. Cambia los
   * textos y el campo `tipo` del envío, no el formulario: son los mismos datos
   * los que la viña necesita para responder cualquiera de las dos.
   */
  mode: "reserva" | "cotizacion";
};
```

- `useTranslations("tourDetail.form")` → `useTranslations("activities.labels.form")`.
- `const isQuote = mode === "cotizacion";`
- Título: `{isQuote ? t("titleQuote") : t("title")}`; bajada: `subtitleQuote`/`subtitle`; botón: `submitIdleQuote`/`submitIdle`; botón WhatsApp: `whatsappQuote`/`whatsapp`; intro de WhatsApp: `waIntroQuote`/`waIntro`, con el placeholder `{activity}`.
- El envío pasa a:

```ts
await submitToNetlifyForms("reserva-actividad", {
  actividad: activityName,
  tipo: mode,
  nombre: name,
  email,
  telefono: phone,
  personas: people,
  fecha: date,
  nota: note,
  idioma: locale,
  "bot-field": botField,
});
```

- [ ] **Step 3: Montarlo en la ficha con el modo derivado del precio**

En la ficha, reemplazar el uso del formulario por:

```tsx
<ActivityReservationForm
  activityName={name}
  minPeople={activity.minPeople}
  mode={activity.priceCLP === undefined ? "cotizacion" : "reserva"}
/>
```

Y en la tarjeta de precio (Dd5), reemplazar el bloque de precio por:

```tsx
{activity.priceCLP === undefined ? (
  <>
    <p className="font-body text-label-sm uppercase tracking-[0.2em] text-wine-accent mb-2">
      {t("priceLabel")}
    </p>
    <p className="font-display text-3xl leading-tight text-primary md:text-4xl">
      {t("priceOnRequest")}
    </p>
    <p className="font-body text-body-md text-on-surface-variant mt-2">
      {t("priceOnRequestNote")}
    </p>
  </>
) : (
  <>
    {/* bloque de precio existente: priceLabel + priceFormatted + perPerson */}
  </>
)}
```

El cálculo de `priceFormatted` pasa a hacerse solo cuando hay precio.

- [ ] **Step 4: Verificar**

Run: `npm run typecheck && npm test && npm run build`
Expected: PASS. `grep -rn "reserva-tour\|TourReservationForm" app components lib public` no debe devolver nada.

- [ ] **Step 5: Anotar el cambio de formulario en el handoff**

En `docs/HANDOFF.md`, en la sección de formularios, agregar:

```markdown
- El formulario de reserva pasó de llamarse `reserva-tour` a `reserva-actividad`
  (campos `actividad` y `tipo` nuevos). Los envíos anteriores NO se pierden:
  quedan en el panel de Netlify bajo el nombre viejo, en otra lista.
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(activities): let an activity without a published price ask for a quote"
```

---

### Task 9: Structured data de la ficha

**Files:**
- Create: `lib/activityJsonLd.ts`
- Modify: `app/[locale]/actividades/[categoria]/[slug]/page.tsx`
- Test: `tests/actividades-jsonld.test.mjs` (crear)

**Interfaces:**
- Consumes: `Activity`, `activityPath` (Tasks 2 y 4).
- Produces: `buildActivityJsonLd(locale, activity, copy, crumbs)` donde
  `copy = { name: string; description: string; image: string }` y
  `crumbs = { home: string; activities: string; category: string }`.
  Los tres textos de `crumbs` llegan traducidos desde la página: tienen que ser
  **los mismos** que muestra `ActivityBreadcrumbs`, o el marcado describiría una
  miga que la página no tiene.

- [ ] **Step 1: Escribir el test**

Crear `tests/actividades-jsonld.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildActivityJsonLd } from "../lib/activityJsonLd.ts";

/**
 * La regla que este test cuida: no se declara lo que la pagina no dice.
 * Un Offer sin price no produce rich result y afirma una oferta que no existe;
 * un availability "InStock" afirma disponibilidad que nadie confirmo.
 */

const CON_PRECIO = {
  slug: "ombu",
  category: "tours",
  priceCLP: 30000,
  minPeople: 2,
  months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  durationISO: "PT2H",
  image: "/images/actividades/tour-carmenere.webp",
};

const SIN_PRECIO = { ...CON_PRECIO, slug: "pizzas", category: "talleres", priceCLP: undefined };

const COPY = { name: "Tour Ombu", description: "Bajada", image: "/x.webp" };
const CRUMBS = { home: "Inicio", activities: "Actividades", category: "Tours" };

function nodes(graph, type) {
  return graph["@graph"].filter((n) =>
    Array.isArray(n["@type"]) ? n["@type"].includes(type) : n["@type"] === type,
  );
}

test("con precio se emite un Offer con moneda", () => {
  const graph = buildActivityJsonLd("es", CON_PRECIO, COPY, CRUMBS);
  const [product] = nodes(graph, "Product");
  assert.equal(product.offers.price, 30000);
  assert.equal(product.offers.priceCurrency, "CLP");
});

test("sin precio NO se emite offers", () => {
  const graph = buildActivityJsonLd("es", SIN_PRECIO, COPY, {
    ...CRUMBS,
    category: "Talleres",
  });
  const [product] = nodes(graph, "Product");
  assert.equal(product.offers, undefined);
});

test("nunca se declara availability", () => {
  const graph = buildActivityJsonLd("es", CON_PRECIO, COPY, CRUMBS);
  assert.doesNotMatch(JSON.stringify(graph), /availability/);
});

test("el BreadcrumbList tiene los cuatro niveles en orden", () => {
  const graph = buildActivityJsonLd("es", CON_PRECIO, COPY, CRUMBS);
  const [crumbs] = nodes(graph, "BreadcrumbList");
  assert.equal(crumbs.itemListElement.length, 4);
  assert.deepEqual(
    crumbs.itemListElement.map((i) => i.position),
    [1, 2, 3, 4],
  );
  assert.deepEqual(
    crumbs.itemListElement.map((i) => i.name),
    ["Inicio", "Actividades", "Tours", "Tour Ombu"],
  );
  assert.match(crumbs.itemListElement[3].item, /\/es\/actividades\/tours\/ombu$/);
});

test("las imagenes se emiten absolutas", () => {
  const graph = buildActivityJsonLd("es", CON_PRECIO, COPY, CRUMBS);
  const [product] = nodes(graph, "Product");
  assert.match(product.image, /^https?:\/\//);
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test tests/actividades-jsonld.test.mjs`
Expected: FAIL — no existe `lib/activityJsonLd.ts`.

- [ ] **Step 3: Escribir el módulo**

Crear `lib/activityJsonLd.ts`:

```ts
import { SITE_URL } from "@/lib/siteUrl";
import { type Activity, activityPath } from "@/data/activities";

/**
 * Structured data de una ficha de actividad.
 *
 * Se modela como `Product` y no como `Event` ni `Course`: los dos exigen fechas
 * (`startDate`, `hasCourseInstance`) que el catálogo no publica, y declararlas
 * inventadas es peor que no tener rich result. `Product` además es lo que
 * `lib/siteJsonLd.ts` ya emite para los tours en el índice, así que la misma
 * actividad no se describe de dos formas distintas según la página.
 *
 * `offers` solo aparece cuando el precio SE VE en la página. `availability`
 * nunca: las actividades se reservan con mínimo de personas y afirmar "InStock"
 * sería decir algo que el sitio no dice.
 */

const WINERY_ID = `${SITE_URL}/#winery`;

const absolute = (url: string) => (url.startsWith("http") ? url : `${SITE_URL}${url}`);

type Copy = { name: string; description: string; image: string };

/**
 * Los textos de la miga llegan traducidos desde la página y no se escriben acá:
 * tienen que ser los MISMOS que muestra `ActivityBreadcrumbs`. Un breadcrumb
 * marcado que no coincide con el visible es marcado inventado.
 */
type Crumbs = { home: string; activities: string; category: string };

export function buildActivityJsonLd(
  locale: string,
  activity: Activity,
  copy: Copy,
  crumbLabels: Crumbs,
) {
  const path = activityPath(activity);
  const url = `${SITE_URL}/${locale}${path}`;

  const product: Record<string, unknown> = {
    "@type": "Product",
    "@id": `${url}#activity`,
    name: copy.name,
    description: copy.description,
    image: absolute(copy.image),
    url,
    brand: { "@type": "Brand", name: "Viña Casa Acosta" },
  };

  if (activity.priceCLP !== undefined) {
    product.offers = {
      "@type": "Offer",
      price: activity.priceCLP,
      priceCurrency: "CLP",
      url,
      seller: { "@id": WINERY_ID },
    };
  }

  const crumbs = [
    { name: crumbLabels.home, item: `${SITE_URL}/${locale}` },
    { name: crumbLabels.activities, item: `${SITE_URL}/${locale}/actividades` },
    {
      name: crumbLabels.category,
      item: `${SITE_URL}/${locale}/actividades#${activity.category}`,
    },
    { name: copy.name, item: url },
  ];

  return {
    "@context": "https://schema.org",
    "@graph": [
      product,
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: crumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: crumb.item,
        })),
      },
    ],
  };
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test tests/actividades-jsonld.test.mjs`
Expected: PASS, 5 tests.

- [ ] **Step 5: Emitirlo en la ficha**

En la ficha, junto al resto de los imports:

```tsx
import JsonLd from "@/components/JsonLd";
import { buildActivityJsonLd } from "@/lib/activityJsonLd";
```

Y como primer hijo del fragmento que devuelve la página:

```tsx
<JsonLd
  data={buildActivityJsonLd(
    locale,
    activity,
    { name, description: tagline, image: activity.image },
    {
      home: t("breadcrumbHome"),
      activities: t("breadcrumbActivities"),
      category: tCategories(`${activity.category}.name`),
    },
  )}
/>
```

Son las mismas tres traducciones que recibe `ActivityBreadcrumbs` en la Task 6: se leen una vez y se pasan a los dos.

- [ ] **Step 6: Verificar**

Run: `npm run typecheck && npm test && npm run build`
Expected: PASS.

- [ ] **Step 7: Validar el marcado**

Run: `npm run dev`, abrir `http://localhost:3000/es/actividades/tours/ombu`, copiar el contenido del `<script type="application/ld+json">` y pegarlo en `https://validator.schema.org/`.
Expected: sin errores. Advertencias sobre campos recomendados de `Product` (`aggregateRating`, `review`) son esperables y **no se corrigen**: no hay reseñas propias publicadas e inventarlas es marcado falso.

- [ ] **Step 8: Commit**

```bash
git add lib/activityJsonLd.ts tests/actividades-jsonld.test.mjs "app/[locale]/actividades/[categoria]/[slug]/page.tsx"
git commit -m "feat(seo): describe each activity to search engines without overclaiming"
```

---

### Task 10: Sitemap derivado y cierre

**Files:**
- Modify: `app/sitemap.ts`
- Test: `tests/actividades-sitemap.test.mjs` (crear)
- Modify: `docs/HANDOFF.md`

**Interfaces:**
- Consumes: `activities`, `activityPath` (Tasks 2 y 4).

- [ ] **Step 1: Escribir el test**

Crear `tests/actividades-sitemap.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import sitemap from "../app/sitemap.ts";
import { activities, activityPath } from "../data/activities.ts";
import { routing } from "../i18n/routing.ts";

/**
 * El sitemap se deriva de los datos justamente para que nadie tenga que
 * acordarse de agregar la actividad numero 15. Este test es el que hace que ese
 * "se deriva" sea verdad y no una intencion.
 */

const entries = sitemap();
const urls = new Set(entries.map((e) => e.url));

test("cada actividad esta en el sitemap en los tres idiomas", () => {
  for (const activity of activities) {
    for (const locale of routing.locales) {
      const expected = entries.find((e) =>
        e.url.endsWith(`/${locale}${activityPath(activity)}`),
      );
      assert.ok(expected, `falta ${locale} ${activity.slug}`);
    }
  }
});

test("no quedo ninguna URL plana de actividad", () => {
  for (const url of urls) {
    assert.doesNotMatch(url, /\/actividades\/tour-/, url);
  }
});

test("cada entrada declara los tres hreflang mas x-default", () => {
  for (const entry of entries) {
    const langs = Object.keys(entry.alternates.languages);
    for (const locale of routing.locales) assert.ok(langs.includes(locale));
    assert.ok(langs.includes("x-default"));
  }
});

test("no hay URLs repetidas", () => {
  assert.equal(urls.size, entries.length);
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test tests/actividades-sitemap.test.mjs`
Expected: FAIL — el sitemap todavía arma `/actividades/${tour.slug}`.

- [ ] **Step 3: Derivar el sitemap de los datos**

En `app/sitemap.ts`, reemplazar el import y la línea de tours:

```ts
import { activities, activityPath } from "@/data/activities";
```

```ts
  const paths: string[] = [
    ...STATIC_PATHS,
    ...wines.map((wine) => `/vinos/${wine.slug}`),
    ...activities.map(activityPath),
  ];
```

Y actualizar el comentario de cabecera del archivo, que hoy afirma "26 rutas × 3 locales = 78 URLs": el número cambia y un comentario con un número falso es peor que ninguno. Reemplazarlo por una descripción sin cifra fija.

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test tests/actividades-sitemap.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Verificación completa y medición del build**

```bash
npm run lint
npm run typecheck
npm test
time npm run build
```

Expected: los tres primeros PASS. Del build, anotar el tiempo total y el número de rutas estáticas generadas — el spec compromete medirlo.

- [ ] **Step 6: Verificar los redirects en un servidor real**

```bash
npm run build && npm start
```

Y en otra terminal:

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/es/actividades/tour-ombu
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/es/actividades/talleres
```

Expected: `308` (Next emite 308 para `permanent: true`, que es el 301 que preserva el método) hacia `/es/actividades/tours/ombu`, y `307` hacia `/es/actividades#talleres`. Si el segundo no conserva el fragmento, dejarlo apuntando a `/es/actividades` y anotarlo en el comentario del `next.config.ts`.

- [ ] **Step 7: Actualizar el handoff**

En `docs/HANDOFF.md`, agregar bajo el estado del proyecto:

```markdown
### Actividades — fundación (rama `feat/actividades-subpaginas`)

Las fichas viven en `/actividades/{categoria}/{slug}`. Las tres URLs planas de
tour redirigen permanente. El catálogo (`data/activities.ts`) guarda solo datos
duros; todo el texto está en `messages/*.json` → `activities`.

Agregar una actividad = un objeto en `data/activities.ts` + un bloque en
`activities.items` de **los tres** archivos de mensajes. Las traducciones no son
opcionales: next-intl no falla cuando falta una clave, la muestra en pantalla.

Build medido tras esta rama: <TIEMPO> con <N> rutas estáticas.

Pendiente (planes 2 y 3): las 11 actividades del catálogo, el hub de Vendimia,
las tarjetas selectoras y el mega-menú.
```

Reemplazar `<TIEMPO>` y `<N>` por lo medido en el Step 5.

- [ ] **Step 8: Commit**

```bash
git add app/sitemap.ts tests/actividades-sitemap.test.mjs docs/HANDOFF.md
git commit -m "feat(seo): let the sitemap follow the catalog instead of a hand-kept list"
```

---

## Criterio de cierre del plan

- `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` en verde.
- 9 fichas de tour generadas (3 × 3 idiomas) bajo la ruta nueva.
- Las 3 URLs viejas redirigen permanente, sin cadenas.
- Las 3 URLs padre redirigen temporal.
- Sin rastro de `tourDetail`, `"tours"` como namespace, `getTourBySlug`,
  `TourReservationForm` ni `reserva-tour` en el árbol.
- Tiempo de build medido y anotado en `docs/HANDOFF.md`.
