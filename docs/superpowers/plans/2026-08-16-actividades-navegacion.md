# Actividades — Navegación (plan 3 de 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que las 14 fichas de actividad queden a un salto desde cualquier página del sitio, con enlaces que **existan en el HTML que sirve el servidor** — no solo en el navegador de quien pasa el mouse.

**Architecture:** El mega-menú del navbar y las tarjetas selectoras renderizan sus enlaces **siempre** y solo los **ocultan** hasta que el panel abre. El estado de React controla la visibilidad, nunca la existencia. Todo el contenido se deriva de `data/activities.ts`, así que agregar una actividad la agrega al menú.

**Tech Stack:** Next.js 16.2.6 · React 19.2.4 · TypeScript · Tailwind v4 · next-intl 4.11.2 · `node:test`.

**Spec:** [`docs/superpowers/specs/2026-08-15-actividades-subpaginas-design.md`](../specs/2026-08-15-actividades-subpaginas-design.md) — fase 5 de su tabla de entregas.

**Planes anteriores:** [plan 1 — fundación](2026-08-15-actividades-fundacion.md) · [plan 2 — contenido](2026-08-16-actividades-contenido.md). Los dos completos.

---

## El problema, medido

Medido sobre el HTML del build de producción, no deducido:

```
Enlaces entrantes por ficha, sin contar las fichas entre sí:

  tours/ombu · bera · carmenere            2 páginas cada uno
  talleres/pizzas · pastas · noquis        0
  experiencias/ (las ocho)                 0
```

Los tres tours los enlazan el mosaico de la home (`A4`) y la grilla del índice (`D2`). Las once fichas del plan 2 no las enlaza **nada**: se llega por el sitemap o desde otra ficha de la misma categoría, que es una isla cerrada.

**El desplegable de Actividades que ya existe en el navbar no cuenta**, y esto es lo que decide el diseño de este plan. Se renderiza condicionalmente:

```tsx
{isActividades && activitiesMenuOpen && (   // components/Navbar.tsx:211
```

`activitiesMenuOpen` arranca en `false`, así que el panel **no está en el HTML del servidor**. Comprobado: en `/es/contacto`, `/es/historia` y `/es/staff` —páginas con navbar y sin mosaico— el navbar aporta un solo enlace, `/es/actividades`, y **cero** enlaces a fichas. Un menú que parece navegación y no enlaza nada.

Construir el mega-menú con ese mismo patrón lo dejaría igual de vacío: se vería perfecto en el navegador y no movería una sola de las 33 URLs huérfanas.

## Global Constraints

- **Repo:** `vina-casa-acosta/web/sitio-web`, rama `feat/actividades-subpaginas` (continúa el plan 2, en `8381029`).
- **Comentarios y UI en español; código en inglés; commits en inglés (Conventional Commits).**
- **Archivos de test en ASCII puro.**
- **La regla que sostiene todo este plan:** los enlaces de un panel se renderizan siempre y se ocultan con el atributo `hidden`. **Nunca** `{estado && <panel/>}`. Es la única regla acá que se rompe sin síntoma visible: la interfaz sigue funcionando en pantalla mientras el crawler deja de ver los enlaces.
- **Trampa de `hidden` con Tailwind:** el atributo `hidden` aplica `display:none` desde la hoja del navegador, y **cualquier clase de display lo pisa** (`flex`, `grid`, `block`). El elemento que lleva `hidden` no puede llevar clase de display: la grilla va en un hijo.
- **Toda clave de `messages/` se escribe en los 3 idiomas a la vez.** Este plan agrega pocas: los encabezados de columna salen de `activities.categories.{cat}.name`, que ya existe en los tres.
- **No se reestructura el índice `D`.** El cliente no lo aprobó. Ver el spec, *Índice D — ajuste mínimo*.
- **`AGENTS.md`: este Next tiene breaking changes.** Leer la guía en `node_modules/next/dist/docs/` antes de tocar APIs de rutas.
- **Gate de cada tarea:** `npm test` y `npm run typecheck`. `npm run lint` y `npm run build` al cierre.
- **`npm run build` borra `.next`** y deja zombi al dev server.

## Vendimia: la entrada que el spec pide y no existe

El spec da a Vendimia una entrada directa en el mega-menú y el primer lugar en el menú de la tarjeta selectora. **El hub `/actividades/vendimia` no existe**: quedó fuera del plan 2 porque sus dos secciones centrales —qué es la vendimia en Casa Acosta, el ciclo de la vid a lo largo del año— piden contenido que el catálogo del cliente no trae.

Este plan **no inventa ese contenido ni enlaza a una URL que da 404**. La navegación se construye sobre las tres categorías que sí existen. El lugar donde entraría Vendimia queda declarado en `VENDIMIA_HUB` (`data/activities.ts`), en `null`, con el comentario que explica qué falta: cuando el hub exista, es cambiar esa constante.

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `docs/NOMENCLATURA.md` | Contrato de IDs. Se actualiza antes que el código. | Modificar |
| `data/activities.ts` | `VENDIMIA_HUB` y `activityMenu()`: el árbol que consumen las dos superficies. | Modificar |
| `components/ActivitiesMenu.tsx` | Contenido del menú (columnas + pie). Server-renderizable, sin estado. | Crear |
| `components/Navbar.tsx` | Mega-menú escritorio y acordeón móvil, sobre `ActivitiesMenu`. | Modificar |
| `components/CategoryChooserCard.tsx` | Tarjeta con panel desplegable. Client. | Crear |
| `app/[locale]/actividades/page.tsx` | Las 3 tarjetas de `D3` pasan a selectoras. | Modificar |
| `components/HomeActivitiesShowcase.tsx` | Las 3 tarjetas de experiencia de `A4` pasan a selectoras. | Modificar |
| `tests/navegacion-enlaces-source.test.mjs` | Ningún panel se renderiza condicionalmente. | Crear |
| `tests/navegacion-menu.test.mjs` | El árbol del menú cubre el catálogo completo. | Crear |
| `docs/HANDOFF.md` | Bitácora. | Modificar |

---

### Task 1: El árbol del menú, derivado del catálogo

Las dos superficies —mega-menú y tarjetas— muestran lo mismo con distinta forma. El árbol se arma una vez, en los datos, y no se escribe dos veces.

**Files:**
- Modify: `data/activities.ts`
- Test: `tests/navegacion-menu.test.mjs` (crear)

**Interfaces:**
- Produces: `VENDIMIA_HUB: string | null`, y `activityMenu(): MenuColumn[]` donde
  `type MenuColumn = { category: ActivityCategory; items: Activity[] }`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/navegacion-menu.test.mjs` (ASCII puro):

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  activities,
  ACTIVITY_CATEGORIES,
  activityMenu,
  VENDIMIA_HUB,
} from "../data/activities.ts";

/**
 * El menu es la unica via por la que se llega a once de las catorce fichas.
 * Si deja de cubrir el catalogo, esas paginas vuelven a quedar huerfanas y no
 * hay sintoma visible: el menu sigue abriendo y mostrando lo que le quedo.
 */

test("el menu tiene una columna por categoria, en el orden del catalogo", () => {
  assert.deepEqual(
    activityMenu().map((c) => c.category),
    [...ACTIVITY_CATEGORIES],
  );
});

test("toda actividad del catalogo aparece exactamente una vez en el menu", () => {
  const enMenu = activityMenu().flatMap((c) => c.items.map((a) => a.slug));
  assert.equal(enMenu.length, activities.length);
  assert.deepEqual([...enMenu].sort(), activities.map((a) => a.slug).sort());
});

test("cada columna trae sus actividades en el orden del catalogo", () => {
  for (const columna of activityMenu()) {
    const esperado = activities
      .filter((a) => a.category === columna.category)
      .map((a) => a.slug);
    assert.deepEqual(columna.items.map((a) => a.slug), esperado);
  }
});

test("ninguna columna queda vacia", () => {
  for (const columna of activityMenu()) {
    assert.ok(columna.items.length > 0, columna.category);
  }
});

test("el hub de vendimia esta declarado, aunque todavia no exista", () => {
  // null a proposito: la pagina no existe y enlazar a un 404 desde el navbar
  // seria peor que no ofrecerla. Cuando exista, esta constante es el unico
  // lugar que cambia.
  assert.ok(VENDIMIA_HUB === null || typeof VENDIMIA_HUB === "string");
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test -- --test-name-pattern="menu"`
Expected: FAIL — `activityMenu` no existe.

- [ ] **Step 3: Implementar**

En `data/activities.ts`, después de `activityPath()`:

```ts
/**
 * Ruta del hub de Vendimia, sin prefijo de idioma. `null` mientras no exista.
 *
 * El spec le da entrada propia en el mega-menú y el primer lugar en el menú de
 * la tarjeta selectora. La página quedó fuera del plan 2 porque sus dos
 * secciones centrales —qué es la vendimia en Casa Acosta y el ciclo de la vid a
 * lo largo del año— piden contenido que el catálogo del cliente no trae, y eso
 * se le pide a la viña, no se redacta.
 *
 * Enlazar igual sería mandar al visitante y al crawler a un 404 desde el
 * navbar de todo el sitio. Cuando el hub exista, esta constante es el único
 * lugar que cambia: las dos superficies ya preguntan por ella.
 */
export const VENDIMIA_HUB: string | null = null;

export type MenuColumn = { category: ActivityCategory; items: Activity[] };

/**
 * El árbol que consumen el mega-menú del navbar y las tarjetas selectoras. Una
 * sola fuente: que las dos superficies muestren lo mismo no puede depender de
 * que alguien acuerde de actualizar las dos.
 */
export function activityMenu(): MenuColumn[] {
  return ACTIVITY_CATEGORIES.map((category) => ({
    category,
    items: activitiesByCategory(category),
  }));
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data/activities.ts tests/navegacion-menu.test.mjs
git commit -m "feat(activities): derive the navigation menu tree from the catalog"
```

---

### Task 2: El guard que hace falsable la regla

Antes de escribir un solo panel, la regla que los sostiene tiene que poder fallar. Sin este test, la próxima persona que agregue un menú lo va a escribir con `{estado && ...}` porque es lo natural en React, y nadie se va a enterar.

**Files:**
- Test: `tests/navegacion-enlaces-source.test.mjs` (crear)

- [ ] **Step 1: Escribir el guard**

Crear `tests/navegacion-enlaces-source.test.mjs` (ASCII puro):

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Once de las catorce fichas no reciben enlaces de ninguna otra parte del
 * sitio: estos paneles son su unica via de entrada.
 *
 * Un panel escrito como {abierto && <panel/>} funciona perfecto en pantalla y
 * no existe en el HTML que sirve el servidor, porque el estado arranca cerrado.
 * Asi estaba el desplegable de Actividades del navbar: comprobado sobre el
 * build, /es/contacto no traia un solo enlace a una ficha.
 *
 * Por eso los paneles se renderizan siempre y se ocultan con el atributo
 * `hidden`. Este test es lo unico que separa las dos formas, porque a la vista
 * son identicas.
 */

const FUENTES = [
  "../components/Navbar.tsx",
  "../components/CategoryChooserCard.tsx",
];

const ESTADOS = [
  "activitiesMenuOpen",
  "mobileActivitiesOpen",
  "open",
];

for (const ruta of FUENTES) {
  const nombre = ruta.split("/").pop();
  const fuente = await readFile(new URL(ruta, import.meta.url), "utf8");

  test(`${nombre}: ningun panel se renderiza condicionalmente por estado`, () => {
    for (const estado of ESTADOS) {
      assert.doesNotMatch(
        fuente,
        new RegExp(`\\{\\s*${estado}\\s*&&`),
        `${nombre} monta un panel solo cuando ${estado} es true: sus enlaces no existen en el HTML`,
      );
      assert.doesNotMatch(
        fuente,
        new RegExp(`&&\\s*${estado}\\s*&&`),
        `${nombre} monta un panel solo cuando ${estado} es true`,
      );
    }
  });

  test(`${nombre}: los paneles se ocultan con el atributo hidden`, () => {
    assert.match(fuente, /hidden=\{!/);
  });
}

test("Navbar: el elemento que lleva hidden no trae clase de display", () => {
  // `hidden` aplica display:none desde la hoja del navegador y CUALQUIER clase
  // de display lo pisa. Un `flex` o un `grid` en el mismo elemento deja el
  // panel visible siempre.
  const fuente = await readFile(
    new URL("../components/Navbar.tsx", import.meta.url),
    "utf8",
  );
  for (const match of fuente.matchAll(/hidden=\{![^}]*\}[\s\S]{0,400}?>/g)) {
    const etiqueta = match[0];
    const clase = etiqueta.match(/className="([^"]*)"/)?.[1] ?? "";
    for (const display of ["flex", "grid", "block", "inline-flex"]) {
      assert.ok(
        !new RegExp(`(^|\\s)${display}(\\s|$)`).test(clase),
        `el elemento con hidden trae la clase ${display}, que pisa display:none`,
      );
    }
  }
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test -- --test-name-pattern="panel"`
Expected: FAIL en las dos fuentes — `CategoryChooserCard.tsx` no existe todavía y `Navbar.tsx` sí monta el panel con `activitiesMenuOpen &&`. Ese segundo rojo es el defecto real: se apaga en la Task 3.

Si `node:test` no puede leer `CategoryChooserCard.tsx`, el archivo aún no existe — esperado hasta la Task 5. Crear el archivo vacío no: el guard tiene que seguir rojo hasta que exista de verdad.

- [ ] **Step 3: Commit del guard en rojo**

No se commitea un test en rojo. Este guard viaja con la Task 3, que es la que lo pone en verde. Continuar sin commitear.

---

### Task 3: Mega-menú de escritorio

El desplegable de 248 px con 3 tours pasa a un panel ancho con una columna por categoría, más un pie con Eventos privados y Ver todo. Y deja de existir solo cuando está abierto.

Los encabezados de columna enlazan con `categoryIndexHref()`, que el plan 2 dejó resuelto: solo Tours tiene sección propia en el índice, así que solo esa columna lleva fragmento.

**Files:**
- Create: `components/ActivitiesMenu.tsx`
- Modify: `components/Navbar.tsx:211-248`

**Interfaces:**
- Consumes: `activityMenu()`, `activityPath()`, `categoryIndexHref()`, `VENDIMIA_HUB`.
- Produces: `<ActivitiesMenu locale variant="desktop" | "mobile" onNavigate? />`.

- [ ] **Step 1: Crear el contenido del menú**

`components/ActivitiesMenu.tsx` — sin estado y sin `"use client"` propio: lo importa un componente cliente, pero nada acá necesita el navegador.

```tsx
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import {
  activityMenu,
  activityPath,
  categoryIndexHref,
} from "@/data/activities";

type Props = {
  locale: string;
  variant: "desktop" | "mobile";
  /** El móvil cierra el drawer al elegir; el escritorio no necesita nada. */
  onNavigate?: () => void;
};

/**
 * Contenido del menú de Actividades, en sus dos formas. Vive aparte del Navbar
 * porque son las mismas 14 entradas dibujadas distinto, y tenerlo dos veces es
 * tenerlo desincronizado.
 *
 * No monta nada condicionalmente: quien lo usa decide si se VE, nunca si
 * EXISTE. Ver tests/navegacion-enlaces-source.test.mjs.
 */
export default function ActivitiesMenu({ locale, variant, onNavigate }: Props) {
  const t = useTranslations("nav");
  const tCategories = useTranslations("activities.categories");
  const tItems = useTranslations("activities.items");
  const columns = activityMenu();
  const esMovil = variant === "mobile";

  const itemClass = esMovil
    ? "flex min-h-11 items-center justify-between gap-3 rounded-md px-3 py-2 font-body text-body-md text-on-primary/75 transition-colors hover:bg-on-primary/10 hover:text-on-primary"
    : "group/item flex items-center justify-between gap-3 rounded-lg px-3 py-2 font-body text-body-md text-on-surface-variant transition-colors hover:bg-primary/5 hover:text-primary";

  const headingClass = esMovil
    ? "px-3 pt-3 pb-1 font-body text-label-sm font-semibold uppercase tracking-wider text-on-primary/55"
    : "mb-1 block px-3 font-body text-label-sm font-semibold uppercase tracking-wider text-primary hover:underline";

  return (
    <>
      <div
        className={
          esMovil ? "" : "grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4"
        }
      >
        {columns.map((column) => (
          <div
            key={column.category}
            className={
              !esMovil && column.category === "experiencias"
                ? "lg:col-span-2"
                : ""
            }
          >
            <Link
              href={categoryIndexHref(locale, column.category)}
              onClick={onNavigate}
              className={headingClass}
            >
              {tCategories(`${column.category}.name`)}
            </Link>
            <ul
              className={
                !esMovil && column.category === "experiencias"
                  ? "sm:columns-2"
                  : ""
              }
            >
              {column.items.map((activity) => (
                <li key={activity.slug} className="break-inside-avoid">
                  <Link
                    href={`/${locale}${activityPath(activity)}`}
                    onClick={onNavigate}
                    className={itemClass}
                  >
                    {tItems(`${activity.slug}.name`)}
                    <ArrowRight
                      className={
                        esMovil
                          ? "h-4 w-4 shrink-0"
                          : "h-4 w-4 shrink-0 -translate-x-1 opacity-0 transition-all duration-200 group-hover/item:translate-x-0 group-hover/item:opacity-100"
                      }
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div
        className={
          esMovil
            ? "mx-3 my-2 border-t border-on-primary/15 pt-1"
            : "mt-3 flex items-center justify-between gap-4 border-t border-outline-variant/40 pt-3"
        }
      >
        <Link href={`/${locale}/actividades#eventos`} onClick={onNavigate} className={itemClass}>
          {t("activitiesEvents")}
        </Link>
        <Link href={`/${locale}/actividades`} onClick={onNavigate} className={itemClass}>
          {t("activitiesAll")}
        </Link>
      </div>
    </>
  );
}
```

Nota: **Vendimia no aparece.** `VENDIMIA_HUB` es `null` y enlazar a un 404 desde el navbar de todo el sitio sería peor que no ofrecerlo. Cuando exista, entra acá arriba de las columnas.

- [ ] **Step 2: Reemplazar el desplegable del navbar**

En `components/Navbar.tsx`, importar el componente y `useLocale` ya está. Reemplazar el bloque de las líneas 211-248 por:

```tsx
                  {isActividades && (
                    <div
                      id="nav-actividades-menu"
                      hidden={!activitiesMenuOpen}
                      className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3"
                    >
                      <div className="w-[min(92vw,52rem)] rounded-xl border border-outline-variant/40 bg-surface p-4 ambient-shadow">
                        <ActivitiesMenu locale={locale} variant="desktop" />
                      </div>
                    </div>
                  )}
```

`{isActividades && ...}` se queda: eso decide en qué ítem del navbar va el panel, no si sus enlaces existen. `hidden` es lo que lo abre y lo cierra, y el elemento que lo lleva no trae clase de display — la grilla está en el hijo.

- [ ] **Step 3: Anunciar el panel en el disparador**

En el `<Link>` de Actividades, agregar los atributos que un menú necesita:

```tsx
                    aria-expanded={isActividades ? activitiesMenuOpen : undefined}
                    aria-controls={isActividades ? "nav-actividades-menu" : undefined}
```

- [ ] **Step 4: Borrar lo que quedó sin uso**

`activitiesSections` y su clave `nav.activitiesExperiences` ya no los usa el escritorio; el móvil se migra en la Task 4. Dejar `activitiesSections` hasta entonces y borrarlo ahí.

- [ ] **Step 5: Correr todo**

Run: `npm test && npm run typecheck`
Expected: PASS, incluido el guard de la Task 2 para `Navbar.tsx`. El de `CategoryChooserCard.tsx` sigue rojo hasta la Task 5.

- [ ] **Step 6: Verificar en el HTML, que es donde importa**

Run: `npm run build` y después:

```bash
grep -oE '/es/actividades/(tours|talleres|experiencias)/[a-z-]+' .next/server/app/es/contacto.html | sort -u | wc -l
```

Expected: **14**. Antes de este cambio era 0. Si da 0, el panel se está montando condicionalmente y el guard no lo detectó.

- [ ] **Step 7: Commit**

```bash
git add components/ActivitiesMenu.tsx components/Navbar.tsx tests/navegacion-enlaces-source.test.mjs
git commit -m "feat(nav): put every activity one hop from every page, in the served HTML"
```

---

### Task 4: Mega-menú móvil

El acordeón del drawer tiene el mismo defecto y la misma cura. Además pasa de listar 3 tours a listar las 14, agrupadas por categoría.

**Files:**
- Modify: `components/Navbar.tsx` (bloque móvil, ~líneas 404-440)

- [ ] **Step 1: Reemplazar la lista del acordeón**

Reemplazar el bloque `{mobileActivitiesOpen && (<ul …>…</ul>)}` por:

```tsx
                      <div id="mobile-activities-menu" hidden={!mobileActivitiesOpen} className="py-2">
                        <ActivitiesMenu
                          locale={locale}
                          variant="mobile"
                          onNavigate={closeMobileMenu}
                        />
                      </div>
```

El `id` pasa de `mobile-activities-tours` a `mobile-activities-menu`: ya no son solo tours. Actualizar el `aria-controls` del botón que lo abre.

- [ ] **Step 2: Borrar lo que quedó sin uso**

Borrar la constante `activitiesSections` de `Navbar.tsx` y los imports que dejó sin uso (`tours`, `activityPath`, `tTours` si ya no se usan). `npm run lint` los marca.

- [ ] **Step 3: Correr todo**

Run: `npm test && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Verificar el drawer en el navegador**

Run: `npm run dev`, ancho de 375 px, abrir el menú y desplegar Actividades.
Expected: tres grupos con encabezado (Tours 3 · Talleres 3 · Experiencias 8), área táctil de 44 px, y al elegir una se cierra el drawer entero.

- [ ] **Step 5: Commit**

```bash
git add components/Navbar.tsx
git commit -m "feat(nav): give the mobile drawer the whole catalog, not just the tours"
```

---

### Task 5: Tarjetas selectoras

Las tres tarjetas de `D3` (índice) y `A4` (home) dejan de ser decorativas. Hoy la de Vendimia 2026 y la de Talleres son `<article>` sin enlace: prometen algo y no llevan a ninguna parte.

**Files:**
- Create: `components/CategoryChooserCard.tsx`
- Modify: `app/[locale]/actividades/page.tsx` (sección `#experiencias`)
- Modify: `components/HomeActivitiesShowcase.tsx` (tarjetas de experiencia)

**Interfaces:**
- Consumes: `activityMenu()`, `activityPath()`.
- Produces: `<CategoryChooserCard name image items panelId externalUrl? externalLabel? />`
  con `items: { href: string; label: string }[]`.

- [ ] **Step 1: Crear el componente**

`components/CategoryChooserCard.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";

type Item = { href: string; label: string };

type Props = {
  name: string;
  image: string;
  panelId: string;
  /** Vacío cuando la tarjeta es un enlace externo y no un selector. */
  items?: Item[];
  externalUrl?: string;
  externalLabel?: string;
  openLabel: string;
};

/**
 * Tarjeta que pregunta cuál querés ver en vez de decorar.
 *
 * Los enlaces del panel se renderizan SIEMPRE y se ocultan con `hidden`. Es lo
 * que hace que estas tarjetas cuenten como enlazado interno y no solo como
 * interfaz — ver tests/navegacion-enlaces-source.test.mjs.
 *
 * Es un menú, no un diálogo: cierra con Escape, con clic fuera y al elegir,
 * pero no atrapa el foco.
 */
export default function CategoryChooserCard({
  name,
  image,
  panelId,
  items,
  externalUrl,
  externalLabel,
  openLabel,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    const alClickear = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    window.addEventListener("mousedown", alClickear);
    return () => {
      window.removeEventListener("keydown", alTeclear);
      window.removeEventListener("mousedown", alClickear);
    };
  }, [abierto]);

  const marco = (
    <>
      <Image
        src={image}
        alt={name}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, 33vw"
      />
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-primary/85 via-primary/35 to-transparent p-6">
        <h3 className="font-display text-2xl text-on-primary">{name}</h3>
      </div>
    </>
  );

  if (externalUrl) {
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block h-80 overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
      >
        {marco}
        <span className="absolute bottom-6 left-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-on-primary/45 bg-on-primary/10 px-4 font-body text-label-sm font-semibold uppercase tracking-wider text-on-primary backdrop-blur-sm transition-colors group-hover:bg-on-primary group-hover:text-primary">
          {externalLabel}
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </a>
    );
  }

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls={panelId}
        className="group relative block h-80 w-full overflow-hidden rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
      >
        {marco}
        <span className="absolute bottom-6 left-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-on-primary/45 bg-on-primary/10 px-4 font-body text-label-sm font-semibold uppercase tracking-wider text-on-primary backdrop-blur-sm transition-colors group-hover:bg-on-primary group-hover:text-primary">
          {openLabel}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </span>
      </button>

      <div
        id={panelId}
        hidden={!abierto}
        className="absolute inset-x-0 bottom-0 z-30 max-h-72 overflow-y-auto rounded-xl border border-outline-variant/40 bg-surface p-2 ambient-shadow-lg md:top-full md:bottom-auto md:mt-2"
      >
        <ul>
          {items?.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setAbierto(false)}
                className="group/item flex min-h-11 items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 font-body text-body-md text-on-surface-variant transition-colors hover:bg-primary/5 hover:text-primary"
              >
                {item.label}
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Etiqueta nueva en los tres idiomas**

La tarjeta necesita decir qué hace el clic. En `messages/{es,en,pt}.json`, dentro de `actividades.experiences`:

```json
        "chooseCta": "Ver cuáles"
```
```json
        "chooseCta": "See which ones"
```
```json
        "chooseCta": "Ver quais"
```

- [ ] **Step 3: Conectar `D3` en el índice**

En `app/[locale]/actividades/page.tsx`, la constante `experiences` deja de ser tres slugs sueltos y pasa a declarar qué categoría abre cada tarjeta:

```tsx
// Tarjetas de la sección D3. Siguen siendo puertas de entrada y no actividades
// del catálogo, pero ahora abren la lista de su categoría en vez de decorar.
// La de Vendimia muestra las experiencias: su hub todavía no existe (ver
// VENDIMIA_HUB en data/activities.ts).
const chooserCards = [
  {
    slug: "vendimia-2026",
    image: "/images/actividades/vendimia-2026.jpg",
    category: "experiencias" as const,
  },
  {
    slug: "talleres",
    image: "/images/actividades/talleres.jpg",
    category: "talleres" as const,
  },
  {
    slug: "tren-efe",
    image: "/images/actividades/tren-efe.jpg",
    purchaseUrl: "https://pasajes.efe.cl/turistico/casa-acosta",
  },
];
```

Y el `.map` de la grilla renderiza `<CategoryChooserCard>` con `items` armados desde `activitiesByCategory(card.category)`.

- [ ] **Step 4: Conectar `A4` en la home**

`HomeActivitiesShowcase` recibe las tarjetas de experiencia por props desde `app/[locale]/page.tsx`. Cambiar ahí el mismo mapeo, pasando `items` ya traducidos (es un componente cliente: no se le pueden pasar funciones).

- [ ] **Step 5: Correr todo**

Run: `npm test && npm run typecheck && npm run lint`
Expected: PASS, incluido el guard de la Task 2 para `CategoryChooserCard.tsx`, que recién ahora existe.

- [ ] **Step 6: Verificar el panel en el navegador**

Run: `npm run dev` y abrir `/es/actividades`.
Expected: la tarjeta de Talleres abre con los 3 talleres, la de Vendimia con las 8 experiencias, la de Tren EFE sigue siendo un enlace externo sin desplegable. Escape cierra, clic fuera cierra, elegir navega.

- [ ] **Step 7: Commit**

```bash
git add components/CategoryChooserCard.tsx "app/[locale]/actividades/page.tsx" components/HomeActivitiesShowcase.tsx "app/[locale]/page.tsx" messages/es.json messages/en.json messages/pt.json
git commit -m "feat(activities): make the three gateway cards actually lead somewhere"
```

---

### Task 6: Cierre — enlaces contados y handoff

**Files:**
- Modify: `docs/NOMENCLATURA.md`, `docs/HANDOFF.md`

- [ ] **Step 1: Contar los enlaces reales**

Run: `npm run build` y después:

```bash
for p in contacto historia staff; do
  echo -n "/es/$p: "
  grep -oE '/es/actividades/(tours|talleres|experiencias)/[a-z-]+' ".next/server/app/es/$p.html" | sort -u | wc -l
done
```

Expected: **14** en las tres. Era 0 antes de este plan.

- [ ] **Step 2: Verificar que ninguna ficha quedó huérfana**

```bash
for slug in $(node --experimental-strip-types -e "import('./data/activities.ts').then(m=>console.log(m.activities.map(a=>a.category+'/'+a.slug).join(' ')))"); do
  n=$(grep -rl "\"/es/actividades/$slug\"" .next/server/app/es.html .next/server/app/es/*.html 2>/dev/null | wc -l)
  [ "$n" -eq 0 ] && echo "HUERFANA: $slug"
done
echo "listo"
```

Expected: ninguna línea `HUERFANA`.

- [ ] **Step 3: Actualizar `NOMENCLATURA.md`**

Agregar bajo `NV`: el mega-menú de Actividades es un panel ancho con una columna por categoría más un pie (Eventos privados · Ver todo). Y anotar que las tarjetas de `A4` y `D3` son selectoras.

- [ ] **Step 4: Actualizar `HANDOFF.md`**

Reemplazar el párrafo "Las 11 fichas nuevas no reciben enlaces del sitio" por el estado real, con el número medido, y mover el bloqueo de merge a resuelto. Agregar la deuda que queda: el hub de Vendimia y su entrada en las dos superficies.

- [ ] **Step 5: Commit**

```bash
git add docs/NOMENCLATURA.md docs/HANDOFF.md
git commit -m "docs: record that the catalog is now reachable, and what vendimia still owes"
```

---

## Criterio de cierre del plan

- `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` en verde.
- **Las 14 fichas aparecen en el HTML servido de cualquier página del sitio**, verificado sobre `.next/server/app/es/contacto.html` y no sobre el navegador.
- Ninguna ficha con cero enlaces entrantes.
- Ningún panel montado con `{estado && …}`, afirmado por test.
- Ningún enlace a `/actividades/vendimia`, que no existe.
- El menú se deriva del catálogo: agregar la actividad 15 la agrega al navbar y a la tarjeta sin tocar componentes.

## Lo que este plan NO hace

- **El hub de Vendimia.** Sigue pendiente de contenido del cliente. `VENDIMIA_HUB` es el único lugar que cambia cuando llegue.
- **Reestructurar el índice `D`.** No aprobado. `ActivitiesTabs` sigue con sus tres pestañas escritas a mano, sin Talleres.
- **Refactorizar `HomeActivitiesShowcase`**, que sigue en 328 líneas mezclando filtros, mosaico y banner. Se le cambian las tarjetas y nada más.
