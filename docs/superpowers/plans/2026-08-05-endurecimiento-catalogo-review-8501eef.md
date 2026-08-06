# Endurecimiento del catálogo — remediación del review de `8501eef`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir en mecanismos verificables las cinco reglas que hoy solo viven en comentarios y documentación: la equivalencia guard↔`next.config`, el ancho de la rama de rutas locales, la validación del enlace de ficha técnica, la integridad del snapshot y la utilidad del gate de lint.

**Architecture:** Ninguna regla nueva. Cada tarea toma una regla que el código ya afirma en prosa y la sujeta con (a) una constante exportada como única fuente de verdad y/o (b) un test que falla cuando la regla se rompe. El criterio de aceptación de cada tarea no es "el código quedó lindo" sino "existe un test que se pone rojo si alguien deshace esto".

**Tech Stack:** Next.js 16.2.6 · React 19.2.4 · TypeScript · `node:test` + `node:assert/strict` (los tests importan `.ts` directo vía type stripping de Node 24).

## Global Constraints

- **Repo:** `vina-casa-acosta/web/sitio-web`, rama `m3/catalogo-afeleia`. No se toca el repo Afeleia.
- **Comentarios y UI en español; código en inglés; commits en inglés (Conventional Commits).**
- **Archivos de test en ASCII puro** — sin tildes ni `ñ` (convención vigente en `tests/*.test.mjs`).
- **`lib/afeleia/contract.ts` NO importa nada.** Lo consumen servidor y browser; un import arrastraría el snapshot al bundle del cliente. Puede *ser* importado (incluso desde `next.config.ts` — verificado: compila).
- **`data/catalogo-fallback.json` es salida de script, no se edita a mano.** Ninguna tarea edita su contenido.
- **No se regenera el snapshot** (requiere la API de producción). Se sella el que ya está committeado, cuya paridad quedó medida en el review: 13/13 slugs con `precio` idéntico a `data/wines.ts`.
- **Gate de cada tarea:** `npm run typecheck` y `node --test "tests/**/*.test.mjs"`. Los 6 rojos de `collection-band-source.test.mjs` son preexistentes e idénticos en `main` (verificado) — no cuentan como regresión. `npm run build` al cierre.

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `lib/afeleia/contract.ts` | Contrato v1 + guards de valores escritos por el cliente. Única fuente de verdad de los prefijos. | Modificar |
| `next.config.ts` | Consume los prefijos del contrato para `remotePatterns` y `localPatterns`. | Modificar |
| `lib/afeleia/catalog.ts` | Adaptador. Pasa `ficha_tecnica_pdf` por el guard nuevo. | Modificar |
| `scripts/catalogo-snapshot.mjs` | Genera el snapshot. Corrige encabezado contradictorio, detecta colisión de basename, sella al final. | Modificar |
| `scripts/catalogo-integridad.mjs` | Sella y verifica el snapshot. Reusable standalone. | Crear |
| `data/catalogo-fallback.integrity.json` | Sidecar de procedencia (hash + fechas + conteo). | Crear (generado) |
| `tests/afeleia-image-config-parity.test.mjs` | El guard nunca acepta un `src` que la config rechaza. | Crear |
| `tests/afeleia-local-assets.test.mjs` | `localPatterns` cubre toda carpeta de `public/` con imágenes. | Crear |
| `tests/afeleia-document-guard.test.mjs` | Guard de esquema del enlace de ficha técnica. | Crear |
| `tests/catalogo-snapshot-integridad.test.mjs` | El snapshot committeado coincide con su sello. | Crear |
| `tests/afeleia-image-guard.test.mjs` | Casos nuevos de la rama local acotada. | Modificar |
| `eslint.config.mjs` | Ignorar `.claude/`. | Modificar |
| `package.json` | Script `catalogo:sellar`. | Modificar |

---

### Task 1: Sellar la equivalencia guard ↔ `remotePatterns`

Hoy el prefijo de Storage está escrito dos veces como literal (`contract.ts:43` y `next.config.ts:25`) y nada asserta que el conjunto que acepta `renderableImage` esté contenido en el que acepta `images.remotePatterns`. Medido en el review: hoy se cumple. Si deja de cumplirse, el síntoma es un 500 **solo en `next dev`** — el build de Netlify pasa igual. Es la peor combinación posible: se rompe donde nadie mira.

**Files:**
- Modify: `lib/afeleia/contract.ts:43` (exportar la constante)
- Modify: `next.config.ts:2,25` (consumirla)
- Test: `tests/afeleia-image-config-parity.test.mjs` (crear)

**Interfaces:**
- Produces: `export const STORAGE_PUBLIC_PREFIX = "/storage/v1/object/public/"` desde `lib/afeleia/contract.ts`. La consumen `next.config.ts` (Task 1) y los tests de Task 1.

- [ ] **Step 1: Escribir el test de paridad**

Crear `tests/afeleia-image-config-parity.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { hasRemoteMatch } from "next/dist/shared/lib/match-remote-pattern.js";

/**
 * `renderableImage` y `images.remotePatterns` son dos implementaciones de UNA
 * regla. Si el guard acepta un `src` que la config rechaza, `next/image` tira una
 * excepcion en desarrollo y la pagina SSG entera responde 500 — el bug H-49.
 *
 * El invariante es de contencion, no de igualdad: el guard puede ser MAS estricto
 * (hoy lo es: no acepta images.unsplash.com, que la config si permite). Lo que no
 * puede es ser mas permisivo en ningun caso.
 *
 * Se corre el matcher real de Next, no una reimplementacion: una copia del
 * algoritmo se desincronizaria igual que las dos constantes que este test cuida.
 */

const API = "https://syvwfadxohizvytanjnx.supabase.co/functions/v1";
const HOST = "https://syvwfadxohizvytanjnx.supabase.co";

const { renderableImage } = await import("../lib/afeleia/contract.ts");
const config = await (await import("../next.config.ts")).default;

/** URLs absolutas plausibles: lo que el panel puede llegar a guardar. */
const CANDIDATAS = [
  `${HOST}/storage/v1/object/public/assets/c/s/productos/bera.png`,
  `${HOST}/storage/v1/object/public/`,
  `${HOST}/storage/v1/object/public`,
  `${HOST}/storage/v1/object/publico/x.png`,
  `${HOST}/storage/v1/object/public/x.png?download=1`,
  `${HOST}/storage/v1/object/public/x.png#frag`,
  `${HOST}/rest/v1/productos`,
  `${HOST}:443/storage/v1/object/public/x.png`,
  `https://SYVWFADXOHIZVYTANJNX.supabase.co/storage/v1/object/public/x.png`,
  `http://syvwfadxohizvytanjnx.supabase.co/storage/v1/object/public/x.png`,
  `https://evil.example/storage/v1/object/public/x.png`,
  `https://images.unsplash.com/photo-123`,
  `${HOST}/storage/v1/object/public/../../rest/v1/productos`,
  `${HOST}/storage/v1/object/public/a%2Fb.png`,
  `${HOST}/storage/v1/object/public/carpeta con espacio/x.png`,
];

test("todo src absoluto que el guard acepta, remotePatterns tambien lo acepta", () => {
  for (const url of CANDIDATAS) {
    if (renderableImage([url], API) === undefined) continue;
    assert.ok(
      hasRemoteMatch([], config.images.remotePatterns, new URL(url)),
      `el guard acepta un src que next/image rechazaria (500 en dev): ${url}`,
    );
  }
});

test("el guard efectivamente acepta la URL de Storage: el test de arriba no es vacuo", () => {
  const buena = `${HOST}/storage/v1/object/public/assets/x.png`;
  assert.equal(renderableImage([buena], API), buena);
  assert.ok(hasRemoteMatch([], config.images.remotePatterns, new URL(buena)));
});

test("la config deriva su patron del mismo prefijo que el guard", async () => {
  const { STORAGE_PUBLIC_PREFIX } = await import("../lib/afeleia/contract.ts");
  const afeleia = config.images.remotePatterns.find(
    (p) => p.hostname !== "images.unsplash.com",
  );
  assert.ok(afeleia, "falta el patron del Storage de Afeleia en remotePatterns");
  assert.equal(afeleia.pathname, `${STORAGE_PUBLIC_PREFIX}**`);
});
```

- [ ] **Step 2: Correr el test — tiene que fallar en el tercer caso**

Run: `node --test tests/afeleia-image-config-parity.test.mjs`
Expected: FAIL en `la config deriva su patron del mismo prefijo que el guard` con `SyntaxError` o `undefined`, porque `STORAGE_PUBLIC_PREFIX` todavía no se exporta. Los dos primeros pasan (el invariante ya se cumple hoy).

- [ ] **Step 3: Exportar la constante y consumirla desde la config**

En `lib/afeleia/contract.ts:43`, cambiar `const` por `export const`:

```ts
export const STORAGE_PUBLIC_PREFIX = "/storage/v1/object/public/";
```

En `next.config.ts`, agregar el import después de la línea 2 y usar la constante en la línea 25:

```ts
import createNextIntlPlugin from "next-intl/plugin";
import { STORAGE_PUBLIC_PREFIX } from "./lib/afeleia/contract";
```

```ts
        pathname: `${STORAGE_PUBLIC_PREFIX}**`,
```

Actualizar el docblock de `STORAGE_PUBLIC_PREFIX` para que diga dónde más se usa:

```ts
/**
 * Prefijo de toda URL pública de Supabase Storage.
 *
 * Lo exige `renderableImage` y de acá lo deriva `images.remotePatterns` en
 * `next.config.ts`: son una sola regla y tienen que salir de un solo lugar. Que
 * se cumpla la contención (lo que el guard acepta, la config también) lo asserta
 * `tests/afeleia-image-config-parity.test.mjs`.
 */
```

- [ ] **Step 4: Correr el test — tiene que pasar**

Run: `node --test tests/afeleia-image-config-parity.test.mjs`
Expected: PASS 3/3.

- [ ] **Step 5: Probar que el test tiene dientes (mutación deliberada)**

Cambiar temporalmente en `next.config.ts` el pathname a `` `${STORAGE_PUBLIC_PREFIX}assets/**` `` y correr:

Run: `node --test tests/afeleia-image-config-parity.test.mjs`
Expected: FAIL en `todo src absoluto que el guard acepta…` nombrando la URL concreta. **Revertir la mutación** y volver a correr: PASS 3/3.

- [ ] **Step 6: Verificar que Next sigue cargando la config**

Run: `npm run typecheck && npx next build`
Expected: `✓ Compiled successfully`. (Verificado durante el review: el config loader resuelve el import de `.ts` sin problema.)

- [ ] **Step 7: Commit**

```bash
git add lib/afeleia/contract.ts next.config.ts tests/afeleia-image-config-parity.test.mjs
git commit -m "test(catalog): pin the guard to the image config it has to mirror

renderableImage and images.remotePatterns were two literals of one rule with
nothing asserting they agree. They agree today — measured — but the drift
symptom is a 500 only under next dev: the Netlify build passes either way.

The prefix now has one home and a test runs Next's own matcher to assert
containment: anything the guard accepts, remotePatterns accepts."
```

---

### Task 2: Acotar la rama de rutas locales del guard

`renderableImage` acepta **cualquier** valor que empiece con `/`. El snapshot solo emite un prefijo — `${LOCAL_IMAGE_DIR}/<basename>` = `/vinos/…` (`scripts/catalogo-snapshot.mjs:25,90`) — así que la amplitud no compra nada y sí acepta `/api/…`, `/_next/…` y `/vinos/../../algo`. No es SSRF (el optimizador de Next resuelve contra el propio origen y exige `image/*` sobre los bytes: no hay exfiltración, no hay host arbitrario), pero es superficie sin uso, y acotarla es cambio cero de comportamiento.

**Files:**
- Modify: `lib/afeleia/contract.ts:70-72`
- Modify: `tests/afeleia-image-guard.test.mjs` (casos nuevos)
- Test: `tests/afeleia-image-guard.test.mjs`

**Interfaces:**
- Consumes: nada de Task 1 salvo el archivo.
- Produces: `export const SNAPSHOT_IMAGE_PREFIX = "/vinos/"` desde `lib/afeleia/contract.ts`. La consumen Task 3 (`localPatterns`) y Task 6 (chequeo cruzado contra el script).

- [ ] **Step 1: Escribir los tests que fallan**

Agregar al final de `tests/afeleia-image-guard.test.mjs`:

```js
test("descarta una ruta del sitio fuera de la carpeta del snapshot", () => {
  // El snapshot solo emite /vinos/<archivo>. Todo lo demas es superficie sin uso:
  // el optimizador de Next haria un fetch de esa ruta contra el propio origen.
  assert.equal(renderableImage(["/api/interno/secreto"], API), undefined);
  assert.equal(renderableImage(["/_next/static/chunk.js"], API), undefined);
  assert.equal(renderableImage(["/es/vinos"], API), undefined);
  assert.equal(renderableImage(["/"], API), undefined);
});

test("descarta el escape con .. aunque empiece en la carpeta correcta", () => {
  assert.equal(renderableImage(["/vinos/../../api/interno"], API), undefined);
  assert.equal(renderableImage(["/vinos/..%2F..%2Fx"], API), "/vinos/..%2F..%2Fx");
});

test("sigue aceptando lo que el snapshot realmente produce", () => {
  assert.equal(renderableImage(["/vinos/bera.png"], API), "/vinos/bera.png");
  assert.equal(renderableImage(["/vinos/sub/bera.webp"], API), "/vinos/sub/bera.webp");
});
```

Nota sobre el segundo caso: `..%2F..` queda **aceptado** a propósito. No es un escape — el optimizador no decodifica `%2F` como separador y `hasLocalMatch` lo trata como un nombre de archivo raro dentro de `/vinos/`. El test lo fija para que nadie "arregle" de más y rompa nombres de archivo legítimos con `%`.

- [ ] **Step 2: Correr y verificar que falla**

Run: `node --test tests/afeleia-image-guard.test.mjs`
Expected: FAIL — `descarta una ruta del sitio fuera de la carpeta del snapshot` (hoy devuelve `/api/interno/secreto`) y `descarta el escape con ..`.

- [ ] **Step 3: Acotar el guard**

En `lib/afeleia/contract.ts`, agregar la constante junto a `STORAGE_PUBLIC_PREFIX`:

```ts
/**
 * Carpeta de `public/` donde el snapshot deja las fotos de botella.
 *
 * El generador la escribe como `LOCAL_IMAGE_DIR` (`scripts/catalogo-snapshot.mjs`)
 * y es el ÚNICO prefijo local que el snapshot emite. El guard no acepta otro: una
 * ruta arbitraria del sitio termina siendo un fetch del optimizador de Next contra
 * el propio origen, y nada del catálogo necesita eso.
 */
export const SNAPSHOT_IMAGE_PREFIX = "/vinos/";
```

Reemplazar el bloque de las líneas 70-72 por:

```ts
    // Ruta del propio sitio: solo la carpeta que produce el snapshot de fallback.
    // `..` queda afuera porque el optimizador resolvería el escape antes de pedirla.
    if (value.startsWith(SNAPSHOT_IMAGE_PREFIX)) {
      return value.split("/").includes("..") ? undefined : value;
    }
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `node --test tests/afeleia-image-guard.test.mjs`
Expected: PASS 13/13.

- [ ] **Step 5: Verificar que el snapshot real sigue dibujándose**

Run:
```bash
node -e "const c=require('./data/catalogo-fallback.json');const{renderableImage}=await import('./lib/afeleia/contract.ts');const sin=c.productos.filter(p=>renderableImage(p.imagenes,undefined)===undefined).map(p=>p.slug);console.log('productos sin imagen renderizable:',sin)" --input-type=module
```
Expected: `productos sin imagen renderizable: []` — los 13 siguen resolviendo.

- [ ] **Step 6: Commit**

```bash
git add lib/afeleia/contract.ts tests/afeleia-image-guard.test.mjs
git commit -m "fix(catalog): narrow the local image branch to what the snapshot emits

The guard accepted any value starting with '/', so a panel-authored entry like
/api/interno reached next/image and the optimizer fetched that path against the
site's own origin. Not SSRF — same-origin only, and Next sniffs the bytes and
demands image/* — but it is surface nothing uses.

The snapshot only ever writes /vinos/<file>. The guard now says so, and rejects
.. segments. Measured: the 13 committed products still resolve."
```

---

### Task 3: `images.localPatterns` — que Next también acote las rutas locales

Verificado en el review: `localPatterns` está sin configurar, y con `undefined` Next acepta **toda** ruta local en el optimizador. Task 2 acota lo que el catálogo puede pedir; esto acota lo que el optimizador sirve, venga de donde venga.

⚠️ `localPatterns` gobierna **todas** las imágenes locales del sitio, no solo las del catálogo. Una lista incompleta rompe imágenes en producción **sin fallar el build** (el optimizador valida por request). Por eso la lista sale de un test que escanea `public/`, no de una lectura a ojo.

Carpetas de `public/` con imágenes hoy: `images/` (70), `vinos/` (13), `brand/` (5), `ilustraciones/` (3). Ningún `src` local del sitio usa query string (verificado), así que `search: ""` es seguro y descarta `?` de entrada.

**Files:**
- Modify: `next.config.ts:104-117`
- Test: `tests/afeleia-local-assets.test.mjs` (crear)

**Interfaces:**
- Consumes: `SNAPSHOT_IMAGE_PREFIX` de Task 2.

- [ ] **Step 1: Escribir el test de cobertura**

Crear `tests/afeleia-local-assets.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasLocalMatch } from "next/dist/shared/lib/match-local-pattern.js";

/**
 * `images.localPatterns` decide que rutas del propio sitio puede servir el
 * optimizador. Sin la clave, Next acepta TODAS — incluida cualquier ruta que un
 * dato del panel logre meter en un <Image src>.
 *
 * El riesgo del recorte es el inverso: una lista incompleta rompe fotos del sitio
 * y NO falla el build, porque el optimizador valida por request. Por eso la lista
 * no se lee a ojo: este test escanea public/ y exige que toda carpeta con
 * imagenes este cubierta. Agregar public/nueva/ pone esto en rojo.
 */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSIONES = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"]);

const config = await (await import("../next.config.ts")).default;
const patrones = config.images.localPatterns;

async function tieneImagenes(dir) {
  const entradas = await readdir(dir, { withFileTypes: true });
  for (const entrada of entradas) {
    if (entrada.isDirectory()) {
      if (await tieneImagenes(path.join(dir, entrada.name))) return true;
      continue;
    }
    if (EXTENSIONES.has(path.extname(entrada.name).toLowerCase())) return true;
  }
  return false;
}

test("localPatterns esta configurado: sin la clave Next acepta cualquier ruta", () => {
  assert.ok(Array.isArray(patrones) && patrones.length > 0);
});

test("toda carpeta de public/ con imagenes esta cubierta por localPatterns", async () => {
  const entradas = await readdir(path.join(ROOT, "public"), { withFileTypes: true });
  for (const entrada of entradas) {
    if (!entrada.isDirectory()) continue;
    if (!(await tieneImagenes(path.join(ROOT, "public", entrada.name)))) continue;
    const ejemplo = `/${entrada.name}/x.webp`;
    assert.ok(
      hasLocalMatch(patrones, ejemplo),
      `public/${entrada.name}/ tiene imagenes y localPatterns no la cubre: ` +
        `sus fotos responderian 400 en produccion. Agregar { pathname: "/${entrada.name}/**", search: "" }.`,
    );
  }
});

test("no cubre rutas que no son de assets", () => {
  assert.equal(hasLocalMatch(patrones, "/api/interno"), false);
  assert.equal(hasLocalMatch(patrones, "/_next/static/chunk.js"), false);
  assert.equal(hasLocalMatch(patrones, "/es/vinos"), false);
});

test("la carpeta del snapshot esta cubierta", async () => {
  const { SNAPSHOT_IMAGE_PREFIX } = await import("../lib/afeleia/contract.ts");
  assert.ok(hasLocalMatch(patrones, `${SNAPSHOT_IMAGE_PREFIX}bera.png`));
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `node --test tests/afeleia-local-assets.test.mjs`
Expected: FAIL en el primer test — `localPatterns` es `undefined`.

- [ ] **Step 3: Configurar `localPatterns`**

En `next.config.ts`, dentro de `images`, agregar antes de `remotePatterns`:

```ts
    // Rutas del propio sitio que el optimizador puede servir. Sin esta clave Next
    // acepta cualquiera, incluida la que un dato del panel logre meter en un
    // <Image src>. Cubre las carpetas de assets de `public/` y nada más;
    // `tests/afeleia-local-assets.test.mjs` falla si aparece una carpeta nueva.
    // `search: ""` descarta query strings: ningún asset del sitio usa una.
    localPatterns: [
      { pathname: "/images/**", search: "" },
      { pathname: "/vinos/**", search: "" },
      { pathname: "/brand/**", search: "" },
      { pathname: "/ilustraciones/**", search: "" },
    ],
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `node --test tests/afeleia-local-assets.test.mjs`
Expected: PASS 4/4.

- [ ] **Step 5: Verificar que ninguna imagen del sitio quedó afuera**

Run:
```bash
npx next build && node -e "
const { hasLocalMatch } = await import('next/dist/shared/lib/match-local-pattern.js');
const config = await (await import('./next.config.ts')).default;
const { execSync } = await import('node:child_process');
const srcs = execSync('git grep -hoE \"[\\\"\\'\\`]/(images|vinos|brand|ilustraciones)/[^\\\"\\'\\`]*\" -- \"*.ts\" \"*.tsx\"', {encoding:'utf8'})
  .split('\n').map(s=>s.replace(/^[\"'\`]/,'')).filter(Boolean);
const fuera = [...new Set(srcs)].filter(s => !hasLocalMatch(config.images.localPatterns, s));
console.log('srcs locales NO cubiertos:', fuera);
" --input-type=module
```
Expected: `✓ Compiled successfully` y `srcs locales NO cubiertos: []`.

- [ ] **Step 6: Commit**

```bash
git add next.config.ts tests/afeleia-local-assets.test.mjs
git commit -m "fix(images): tell Next which local paths the optimizer may serve

localPatterns was unset, and with no value Next accepts every local path — the
optimizer would fetch whatever ends up in an <Image src> against the site's own
origin.

The list is the asset folders of public/ and nothing else. It is not eyeballed:
a test scans public/ and goes red when a folder with images is not covered,
because an incomplete list breaks photos in production without failing the
build."
```

---

### Task 4: Guard de esquema para el enlace de ficha técnica

`technicalSheet` sale de `readText(attrs, "ficha_tecnica_pdf")` — texto escrito por el cliente en su panel, sin validación — y entra directo a `href` (`app/[locale]/vinos/[slug]/page.tsx:156`). Hoy **no es explotable**: React 19.2.4 reemplaza los `href` `javascript:` por una expresión que lanza (medido, en minúscula y en mayúscula alternada) y los navegadores bloquean la navegación top-level a `data:`. Pero la protección es de React, no del código, y la CSP no ayudaría (su `script-src` lleva `'unsafe-inline'`, que habilita los URI `javascript:`).

El commit `8501eef` endureció un campo-URL del cliente y dejó el hermano sin tocar. Esto cierra la asimetría.

**Files:**
- Modify: `lib/afeleia/contract.ts` (agregar `renderableDocument`)
- Modify: `lib/afeleia/catalog.ts:173`
- Test: `tests/afeleia-document-guard.test.mjs` (crear)

**Interfaces:**
- Produces: `export function renderableDocument(value: unknown): string | undefined` desde `lib/afeleia/contract.ts`. La consume `apiProductToWine` en `lib/afeleia/catalog.ts`.
- Produces: `export const LOCAL_DOCUMENT_PREFIX = "/documentos/"`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/afeleia-document-guard.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { renderableDocument } from "../lib/afeleia/contract.ts";

/**
 * `ficha_tecnica_pdf` es un atributo de texto libre que el cliente escribe en su
 * panel, y el valor entra directo a un href. Hoy no es explotable —React 19
 * neutraliza los href javascript: y el navegador bloquea la navegacion a data:—
 * pero eso es una garantia del framework, no del codigo, y la CSP del sitio no
 * ayudaria: su script-src lleva 'unsafe-inline', que habilita los URI javascript:.
 *
 * El commit 8501eef endurecio el campo de imagenes y dejo este igual. Mismo
 * origen, misma confianza, mismo guard.
 */

test("acepta la ruta local de las fichas committeadas", () => {
  assert.equal(
    renderableDocument("/documentos/fichas-tecnicas/bera-rose.pdf"),
    "/documentos/fichas-tecnicas/bera-rose.pdf",
  );
});

test("acepta una URL http(s) absoluta: el PDF puede vivir en cualquier lado", () => {
  const remoto = "https://syvwfadxohizvytanjnx.supabase.co/storage/v1/object/public/a/f.pdf";
  assert.equal(renderableDocument(remoto), remoto);
  assert.equal(renderableDocument("http://ejemplo.cl/f.pdf"), "http://ejemplo.cl/f.pdf");
});

test("descarta los esquemas que ejecutan o embeben", () => {
  assert.equal(renderableDocument("javascript:alert(1)"), undefined);
  assert.equal(renderableDocument("JaVaScRiPt:alert(1)"), undefined);
  assert.equal(renderableDocument("data:text/html;base64,PHNjcmlwdD4="), undefined);
  assert.equal(renderableDocument("vbscript:msgbox(1)"), undefined);
  assert.equal(renderableDocument("file:///etc/passwd"), undefined);
});

test("descarta protocol-relative y rutas del sitio fuera de /documentos/", () => {
  assert.equal(renderableDocument("//evil.example/f.pdf"), undefined);
  assert.equal(renderableDocument("/api/interno"), undefined);
  assert.equal(renderableDocument("/documentos/../api/interno"), undefined);
});

test("descarta lo que no es texto util", () => {
  assert.equal(renderableDocument(undefined), undefined);
  assert.equal(renderableDocument(null), undefined);
  assert.equal(renderableDocument(42), undefined);
  assert.equal(renderableDocument("   "), undefined);
  assert.equal(renderableDocument("no soy una url"), undefined);
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `node --test tests/afeleia-document-guard.test.mjs`
Expected: FAIL — `renderableDocument` no existe (`SyntaxError: The requested module does not provide an export named 'renderableDocument'`).

- [ ] **Step 3: Implementar el guard**

Agregar a `lib/afeleia/contract.ts`, después de `storageOrigin`:

```ts
/** Carpeta de `public/` donde viven las fichas técnicas committeadas. */
export const LOCAL_DOCUMENT_PREFIX = "/documentos/";

/**
 * Enlace de ficha técnica que esta web puede publicar, o `undefined`.
 *
 * `ficha_tecnica_pdf` es texto libre del panel del cliente y va directo a un
 * `href`. Que hoy no se pueda ejecutar nada por ahí es mérito de React —que
 * neutraliza los `href` `javascript:`— y del navegador, que bloquea la navegación
 * top-level a `data:`. Ninguna de las dos es una garantía de este código, y la CSP
 * del sitio no cubre el hueco: su `script-src` lleva `'unsafe-inline'`.
 *
 * A diferencia de las imágenes, acá NO se restringe el host: la viña puede alojar
 * su PDF donde quiera y bloquearlo sería romperle una función. Lo que se exige es
 * el esquema: `http(s)` o una ruta de `public/documentos/`.
 */
export function renderableDocument(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const url = value.trim();
  if (url === "") return undefined;

  if (url.startsWith(LOCAL_DOCUMENT_PREFIX)) {
    return url.split("/").includes("..") ? undefined : url;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  return parsed.protocol === "https:" || parsed.protocol === "http:" ? url : undefined;
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `node --test tests/afeleia-document-guard.test.mjs`
Expected: PASS 5/5.

- [ ] **Step 5: Conectarlo al adaptador**

En `lib/afeleia/catalog.ts`, agregar `renderableDocument` al import de `@/lib/afeleia/contract` (alfabéticamente va antes de `renderableImage`) y cambiar la línea 173:

```ts
    technicalSheet: renderableDocument(readText(attrs, "ficha_tecnica_pdf")),
```

- [ ] **Step 6: Verificar el catálogo real y los gates**

Run:
```bash
npm run typecheck && node -e "
const c = require('./data/catalogo-fallback.json');
const { renderableDocument } = await import('./lib/afeleia/contract.ts');
const perdidas = c.productos.filter(p => {
  const v = p.atributos?.ficha_tecnica_pdf;
  return typeof v === 'string' && v !== '' && renderableDocument(v) === undefined;
}).map(p => p.slug);
console.log('fichas que el guard descartaria:', perdidas);
" --input-type=module
```
Expected: `fichas que el guard descartaria: []` — ninguna ficha legítima se pierde.

- [ ] **Step 7: Commit**

```bash
git add lib/afeleia/contract.ts lib/afeleia/catalog.ts tests/afeleia-document-guard.test.mjs
git commit -m "fix(catalog): validate the technical-sheet link like the image beside it

ficha_tecnica_pdf is free text a client writes in its panel and it went straight
into an href. It is not exploitable today, but only because React 19 neutralizes
javascript: hrefs and browsers block data: navigation — neither is this code's
guarantee, and the site's CSP carries 'unsafe-inline' in script-src, so it would
not stop a javascript: URI either.

The host stays unrestricted on purpose: the winery may host its PDF anywhere.
What is required is the scheme. Measured: no committed sheet is dropped."
```

---

### Task 5: Sello de integridad del snapshot

`data/catalogo-fallback.json` es la única fuente de precios cuando la API no responde, y nada detecta que alguien lo edite a mano: sin CI (Netlify corre solo `npm run build`), sin checksum, sin test que lo lea. Ya pasó una vez — `7691b44` se llama literalmente *"regenerate the snapshot so it stops being a hand edit"*. La regla existe en `CLAUDE.md` y en el docblock del script: los dos invisibles para quien abre el JSON.

El sello no impide la edición —quien la haga puede recalcular el hash— pero convierte una edición silenciosa en un acto deliberado, que es lo que se busca.

El hash se calcula sobre el JSON **reparseado y reserializado**, no sobre los bytes: el repo no tiene `.gitattributes` y una conversión CRLF cambiaría los bytes sin cambiar un solo dato.

**Files:**
- Create: `scripts/catalogo-integridad.mjs`
- Create: `data/catalogo-fallback.integrity.json` (generado)
- Modify: `scripts/catalogo-snapshot.mjs` (sellar al final)
- Modify: `package.json` (script `catalogo:sellar`)
- Test: `tests/catalogo-snapshot-integridad.test.mjs` (crear)

**Interfaces:**
- Produces: `export function hashCatalogo(payload: object): string` (sha256 hex) y `export function sellar(): Promise<object>` desde `scripts/catalogo-integridad.mjs`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/catalogo-snapshot-integridad.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashCatalogo } from "../scripts/catalogo-integridad.mjs";

/**
 * El snapshot es la unica fuente de precios cuando la API no responde, y hasta
 * este sello nada detectaba una edicion a mano: sin CI, sin checksum, sin test.
 * Ya paso una vez (commit 7691b44).
 *
 * Esto no impide la edicion —quien la haga puede recalcular el hash— pero la
 * vuelve deliberada en vez de silenciosa, que es el objetivo real.
 *
 * El hash va sobre el JSON reparseado, no sobre los bytes: sin .gitattributes en
 * el repo, una conversion CRLF cambiaria los bytes sin cambiar un dato.
 */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const snapshot = JSON.parse(
  await readFile(path.join(ROOT, "data", "catalogo-fallback.json"), "utf8"),
);
const sello = JSON.parse(
  await readFile(path.join(ROOT, "data", "catalogo-fallback.integrity.json"), "utf8"),
);

test("el snapshot committeado coincide con su sello", () => {
  assert.equal(
    hashCatalogo(snapshot),
    sello.hash,
    "data/catalogo-fallback.json no coincide con su sello: o se edito a mano " +
      "(no se hace: es salida de `npm run catalogo:snapshot`) o se regenero sin " +
      "sellar (correr `npm run catalogo:sellar`).",
  );
});

test("el sello describe el mismo snapshot", () => {
  assert.equal(sello.generado_en, snapshot.generado_en);
  assert.equal(sello.productos, snapshot.productos.length);
  assert.equal(sello.algoritmo, "sha256");
});

test("el hash cambia si cambia un precio", () => {
  const alterado = JSON.parse(JSON.stringify(snapshot));
  alterado.productos[0].precio += 1;
  assert.notEqual(hashCatalogo(alterado), sello.hash);
});

test("el hash NO cambia por espacios ni por fin de linea", () => {
  const reformateado = JSON.parse(JSON.stringify(snapshot, null, 8));
  assert.equal(hashCatalogo(reformateado), sello.hash);
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `node --test tests/catalogo-snapshot-integridad.test.mjs`
Expected: FAIL — no existen ni `scripts/catalogo-integridad.mjs` ni el sidecar.

- [ ] **Step 3: Escribir el sellador**

Crear `scripts/catalogo-integridad.mjs`:

```js
#!/usr/bin/env node
/**
 * Sello de procedencia de `data/catalogo-fallback.json`.
 *
 * El snapshot es salida de `npm run catalogo:snapshot`, nunca un archivo que se
 * edita a mano — pero eso era una regla escrita en la documentación, y una regla
 * que nadie puede ver desde el editor no es un control. Este sello la vuelve
 * verificable: `tests/catalogo-snapshot-integridad.test.mjs` se pone rojo cuando el
 * JSON y su hash dejan de coincidir.
 *
 * No es a prueba de manipulación: quien edite el snapshot puede recalcular el
 * sello. Lo que evita es la edición SILENCIOSA, que es la que costó un incidente.
 *
 * Uso:
 *   npm run catalogo:sellar     (lo llama también `catalogo:snapshot` al terminar)
 */

import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT = path.join(ROOT, "data", "catalogo-fallback.json");
const SELLO = path.join(ROOT, "data", "catalogo-fallback.integrity.json");

/**
 * Hash del CONTENIDO, no del archivo.
 *
 * Se reserializa lo parseado a propósito: el repo no tiene `.gitattributes`, así
 * que un checkout con conversión CRLF cambiaría los bytes sin cambiar un solo
 * dato — y un sello que se rompe solo por eso se desactiva a los dos días.
 */
export function hashCatalogo(payload) {
  return createHash("sha256").update(JSON.stringify(payload), "utf8").digest("hex");
}

export async function sellar() {
  const snapshot = JSON.parse(await readFile(SNAPSHOT, "utf8"));
  const sello = {
    algoritmo: "sha256",
    hash: hashCatalogo(snapshot),
    generado_en: snapshot.generado_en,
    sellado_en: new Date().toISOString(),
    productos: snapshot.productos.length,
  };
  await writeFile(SELLO, `${JSON.stringify(sello, null, 2)}\n`, "utf8");
  return sello;
}

// Solo cuando se ejecuta directo: importarlo desde un test no debe escribir nada.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sello = await sellar();
  console.info(
    `Sello escrito: ${sello.productos} productos, generado_en ${sello.generado_en}\n  sha256 ${sello.hash}`,
  );
}
```

- [ ] **Step 4: Sellar el snapshot que ya está committeado**

Agregar a `package.json`, después de `"catalogo:snapshot"`:

```json
    "catalogo:sellar": "node scripts/catalogo-integridad.mjs",
```

Run: `npm run catalogo:sellar`
Expected: `Sello escrito: 13 productos, generado_en 2026-08-06T00:09:57.905Z` más el sha256.

Se sella el snapshot vigente sin regenerarlo: se generó desde producción en `3242c27` y su paridad de precios quedó medida en el review (13/13 slugs idénticos a `data/wines.ts`).

- [ ] **Step 5: Correr y verificar que pasa**

Run: `node --test tests/catalogo-snapshot-integridad.test.mjs`
Expected: PASS 4/4.

- [ ] **Step 6: Probar que el sello tiene dientes**

Run:
```bash
node -e "const fs=require('fs');const f='data/catalogo-fallback.json';const c=JSON.parse(fs.readFileSync(f));c.productos[0].precio=1;fs.writeFileSync(f,JSON.stringify(c,null,2)+'\n')"
node --test tests/catalogo-snapshot-integridad.test.mjs
git checkout -- data/catalogo-fallback.json
node --test tests/catalogo-snapshot-integridad.test.mjs
```
Expected: la primera corrida FALLA nombrando la desincronización; después del `checkout`, PASS 4/4.

- [ ] **Step 7: Que el generador selle solo**

En `scripts/catalogo-snapshot.mjs`, agregar el import junto a los demás:

```js
import { sellar } from "./catalogo-integridad.mjs";
```

Y reemplazar el bloque final (líneas 106-109) por:

```js
await writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
const sello = await sellar();
console.info(
  `Snapshot escrito: ${payload.productos.length} productos, ${payload.categorias?.length ?? 0} categorías → data/catalogo-fallback.json\n` +
    `Sello: sha256 ${sello.hash}`,
);
```

- [ ] **Step 8: Verificar que no se rompió el generador**

Run: `node scripts/catalogo-snapshot.mjs --url http://127.0.0.1:1/nope --sitio x; echo "exit=$?"`
Expected: falla con el mensaje de conexión y `exit=1`, **sin tocar** el snapshot ni el sello (`git status --porcelain` vacío). Es la garantía de "nunca pisar un snapshot bueno con uno inservible".

- [ ] **Step 9: Commit**

```bash
git add scripts/catalogo-integridad.mjs scripts/catalogo-snapshot.mjs package.json data/catalogo-fallback.integrity.json tests/catalogo-snapshot-integridad.test.mjs
git commit -m "feat(catalog): make a hand-edited snapshot detectable

The snapshot is the only price source when the API is down and nothing noticed
an edit: no CI, no checksum, no test reads it. It already happened once —
7691b44 is literally 'regenerate the snapshot so it stops being a hand edit'.
The rule lived in CLAUDE.md and a docblock, both invisible from the editor.

The seal does not prevent an edit — whoever makes one can recompute the hash. It
turns a silent edit into a deliberate one. The hash covers reparsed content, not
bytes: with no .gitattributes, a CRLF checkout would break a byte hash without
changing a single price."
```

---

### Task 6: Corregir el generador — encabezado que se contradice y colisión de basename

Dos defectos del mismo archivo, ambos de escalabilidad:

1. El encabezado dice que el snapshot es *"la respuesta literal del contrato v1"* (línea 6), pero `localizarImagenes` reescribe **toda** ruta de imagen (85-97). El docblock de abajo lo explica; el de arriba lo niega. Es el archivo cuyos comentarios definen la regla.
2. `localizarImagenes` mapea por **basename**: dos productos con el mismo nombre de archivo colapsan en la misma foto local, en silencio. Con 13 productos no ocurre; con un catálogo que crece, es cuestión de tiempo.

**Files:**
- Modify: `scripts/catalogo-snapshot.mjs:1-14,85-97`

- [ ] **Step 1: Corregir el encabezado**

Reemplazar las líneas 5-8 del docblock de cabecera por:

```js
 * El snapshot es la respuesta del contrato v1 con UNA transformación: las rutas de
 * imagen se reapuntan a `public/vinos/` (ver `localizarImagenes`). Salvo eso,
 * `lib/afeleia/catalog.ts` lo pasa por el mismo adaptador que la respuesta viva —
 * si divergieran, el modo degradado se vería distinto del normal justo el día que
 * importa.
```

- [ ] **Step 2: Detectar la colisión de basename**

Reemplazar `localizarImagenes` (líneas 85-97) por:

```js
function localizarImagenes(productos) {
  const sinFotoLocal = [];
  const duenoDe = new Map();
  const colisiones = [];
  for (const producto of productos) {
    producto.imagenes = producto.imagenes.map((url) => {
      const archivo = path.posix.basename(new URL(url, "http://local").pathname);
      const rutaPublica = `${LOCAL_IMAGE_DIR}/${archivo}`;
      if (!existsSync(path.join(ROOT, "public", LOCAL_IMAGE_DIR, archivo))) {
        sinFotoLocal.push(`${producto.slug} → ${url}`);
        return url;
      }
      // El mapeo es por nombre de archivo: dos productos con la misma foto
      // committeada quedan apuntando a la misma imagen y nadie lo nota.
      const previo = duenoDe.get(rutaPublica);
      if (previo && previo !== producto.slug) {
        colisiones.push(`${rutaPublica} ← ${previo} y ${producto.slug}`);
      } else {
        duenoDe.set(rutaPublica, producto.slug);
      }
      return rutaPublica;
    });
  }
  return { sinFotoLocal, colisiones };
}
```

Y reemplazar su uso (líneas 99-104) por:

```js
const { sinFotoLocal, colisiones } = localizarImagenes(payload.productos);
if (sinFotoLocal.length > 0) {
  console.warn(
    `Aviso: ${sinFotoLocal.length} imagen(es) sin copia en public${LOCAL_IMAGE_DIR}/ — el fallback las pedirá al Storage:\n  ${sinFotoLocal.join("\n  ")}`,
  );
}
if (colisiones.length > 0) {
  console.warn(
    `Aviso: ${colisiones.length} foto(s) local(es) compartida(s) por más de un producto — en modo degradado se verán iguales:\n  ${colisiones.join("\n  ")}`,
  );
}
```

- [ ] **Step 3: Verificar contra el catálogo real**

Run:
```bash
node -e "
const c = require('./data/catalogo-fallback.json');
const vistos = new Map(); const col = [];
for (const p of c.productos) for (const i of p.imagenes) {
  if (vistos.has(i) && vistos.get(i) !== p.slug) col.push(i + ' <- ' + vistos.get(i) + ', ' + p.slug);
  else vistos.set(i, p.slug);
}
console.log('colisiones en el snapshot actual:', col);
"
```
Expected: `colisiones en el snapshot actual: []` — la advertencia nueva no dispararía hoy, que es lo correcto.

- [ ] **Step 4: Verificar que el script sigue sano**

Run: `node --check scripts/catalogo-snapshot.mjs && node scripts/catalogo-snapshot.mjs --url http://127.0.0.1:1/nope --sitio x; echo "exit=$?"`
Expected: sin errores de sintaxis; falla la conexión con `exit=1`; `git status --porcelain` no muestra cambios en `data/`.

- [ ] **Step 5: Commit**

```bash
git add scripts/catalogo-snapshot.mjs
git commit -m "fix(catalog): stop the snapshot header from denying what the script does

The header called the snapshot 'the literal contract v1 response' while
localizarImagenes rewrites every image path twenty lines below. This is the file
whose comments define the rule.

Image localization also maps by basename, so two products sharing a filename
collapse onto the same local photo silently. With 13 products it does not
happen; it is a growth bug. It now warns."
```

---

### Task 7: Devolverle sentido al gate de lint

`npm run lint` reporta 227 errores y 4688 warnings. Los **227 salen de `.claude/worktrees/`**, un worktree de otra rama que vive dentro del working dir. Los archivos del proyecto linten limpio. Un gate que grita siempre no lo mira nadie: es exactamente cómo pasan desapercibidos los errores reales.

**Files:**
- Modify: `eslint.config.mjs`

- [ ] **Step 1: Medir el estado de partida**

Run: `npx eslint 2>&1 | tail -3`
Expected: `✖ 4915 problems (227 errors, 4688 warnings)`.

- [ ] **Step 2: Ignorar los directorios que no son fuente**

En `eslint.config.mjs`, agregar al arreglo de configuración (antes de las reglas del proyecto):

```js
  {
    // `.claude/worktrees/` son checkouts de otras ramas dentro del working dir:
    // no son fuente de este proyecto y aportaban los 227 errores que volvían
    // inútil `npm run lint`.
    ignores: [".claude/**", ".next/**", "out/**"],
  },
```

- [ ] **Step 3: Verificar que el gate quedó utilizable**

Run: `npx eslint 2>&1 | tail -3`
Expected: **0 errores**. Si quedan warnings del proyecto, dejarlos: son deuda visible, no ruido de terceros.

- [ ] **Step 4: Verificar que sigue linteando lo que importa**

Run: `npx eslint lib/afeleia/contract.ts lib/afeleia/catalog.ts next.config.ts scripts/ tests/; echo "exit=$?"`
Expected: `exit=0` y sin salida.

- [ ] **Step 5: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore(lint): stop linting other branches' worktrees

All 227 errors came from .claude/worktrees/, checkouts of other branches living
inside the working dir. The project's own files were already clean. A gate that
always screams is a gate nobody reads."
```

---

## Cierre

- [ ] **Step 1: Suite completa**

Run: `node --test "tests/**/*.test.mjs" 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `fail 6` — exactamente los 6 preexistentes de `collection-band-source.test.mjs`, idénticos a `main`. Cualquier otro número es una regresión de este plan.

- [ ] **Step 2: Gates del proyecto**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: los tres verdes.

- [ ] **Step 3: Revisión del diff completo**

Run: `git diff main...HEAD --stat`
Verificar que no se tocó `data/catalogo-fallback.json` (solo se agregó su sidecar).

---

## Self-Review

**Cobertura de hallazgos del review:**

| Hallazgo | Tarea |
|---|---|
| F1 — guard y `remotePatterns` sin fuente de verdad común ni test | 1 |
| F2a — rama de rutas locales acepta cualquier `/…` | 2 |
| F2b — `localPatterns` sin configurar | 3 |
| F3 — `ficha_tecnica_pdf` sin validación de esquema | 4 |
| F4a — edición a mano del snapshot indetectable | 5 |
| F4b — encabezado contradictorio + colisión de basename | 6 |
| F5 — gate de lint inutilizable | 7 |

**Fuera de alcance, declarado:** la tercera pata de H-39 (`productos.precio` en producción) no se verifica acá — requiere la API de producción y es acción de ops. El snapshot vigente se sella tal como está, con su paridad ya medida contra `data/wines.ts` (13/13).

**Consistencia de tipos:** `STORAGE_PUBLIC_PREFIX` (Task 1) y `SNAPSHOT_IMAGE_PREFIX` (Task 2) se consumen en Tasks 3 y 6 con esos mismos nombres. `renderableDocument` y `LOCAL_DOCUMENT_PREFIX` (Task 4) solo se usan dentro de su tarea y en `catalog.ts`. `hashCatalogo` y `sellar` (Task 5) se consumen en el test de Task 5 y en `catalogo-snapshot.mjs`.
