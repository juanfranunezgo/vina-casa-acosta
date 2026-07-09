# Diseño — Timeline B4 "Rama columna viva" (página Historia)

Fecha: 2026-07-05
Sección: **B4** (Timeline) de `app/[locale]/historia/page.tsx` (ver `NOMENCLATURA.md`).
Estado: aprobado por el usuario, listo para implementar.

## Objetivo

Reemplazar la espina recta actual del timeline por una **rama de vid ilustrada** que
serpentea como hilo conductor entre los hitos, en el color vino de marca, revelándose
con un barrido al hacer scroll. Estética editorial de viña boutique, 100% dentro de la
paleta e identidad existentes.

## Decisiones cerradas

| Tema | Decisión |
|---|---|
| Layout desktop | **B — "Rama columna viva"**: hitos alternados izq/der; una guirnalda de vid por hueco (4 huecos entre 5 hitos), alternando espejo → serpentina. Robusto ante descripciones de largo variable. |
| Asset | **Un solo** `rama-derecha.webp` (112 KB, 1897×1207, transparente) copiado a `public/ilustraciones/rama-vid.webp`. Los dos `rama-*.webp` originales son idénticos (mismo md5) → se espejan con CSS. |
| Color rama | `var(--color-primary)` #2a0002, aplicado vía `mask-image` + `background-color`. Sin colores nuevos. |
| Fondo sección | `bg-surface-container-low` (#f6f3f2), el que ya usa B4. **Nada de "crema" ni colores ajenos a la paleta.** |
| Año | `text-primary` con tratamiento tipográfico editorial (Caslon / Crimson Pro itálica, sistema de antetítulos existente). Se distingue por tipografía, no por color nuevo. |
| Animación | **Barrido** (`clip-path: inset()`) que revela la rama al entrar al viewport; contenido con fade-in del `Reveal` existente. Todo detrás de `prefers-reduced-motion`. |
| Mobile (<768px) | Columna única: foto arriba, año/título/descripción abajo; guirnalda como divisor decorativo entre hitos. (A afinar cuando el usuario mande la foto de referencia mobile.) |
| Fotos | Provisionales, reusando las existentes con borde rasgado (máscara orgánica reutilizable). Marcadas "fotos de muestra". |

## Arquitectura de componentes

Hoy el timeline está inline en `historia/page.tsx` (la página mezcla responsabilidades).
Se extrae a su propio componente (regla 4/5 del doc de frontend).

```
components/
  HistoriaTimeline.tsx     (Server Component) estructura semántica + datos tipados
  VineConnector.tsx        (Client) guirnalda decorativa con barrido vía IntersectionObserver
```

- **`HistoriaTimeline`** (server): recibe `locale`/usa `getTranslations`; define el array
  tipado de hitos (`key`, `image`, `side`, `alt key`); renderiza `<section>`→`<ol>`→`<li>`.
  Sin estado ni JS de cliente.
- **`VineConnector`** (client): envuelve el `<span>` de la rama enmascarada; reutiliza el
  mecanismo `IntersectionObserver` de `Reveal` para togglear la clase de barrido. Es
  `aria-hidden` (decorativo). Props: `direction: "ltr" | "rtl"` (orientación/flip + sentido
  del barrido), `delay?`.

### Datos (patrón `familyMembers` ya existente)

```ts
const milestones = [
  { key: "m1998", image: "/images/home/casa/origins.jpg" },
  { key: "m2000", image: "/images/home/casa/teaching.jpg" },
  { key: "m2003", image: "/images/home/casa/tractor.jpg" },
  { key: "m2012", image: "/images/home/cta-parras.jpg" },
  { key: "today", image: "/images/home/casa/family.jpg" },
] as const;
```
Imagen = asset (no va en messages). `title/year/description/imageAlt` = i18n.

## Marca semántica (reglas 1-3)

```html
<section aria-labelledby="timeline-title">
  <h2 id="timeline-title">Hitos del legado</h2>
  <ol>                                   <!-- lista ordenada = cronología -->
    <li>                                 <!-- orden DOM SIEMPRE cronológico -->
      <article>
        <figure><Image ... alt="desc real"/></figure>
        <time datetime="1998">1998</time>  <!-- "Hoy"/"Today" sin datetime -->
        <h3>La raíz de un sueño</h3>
        <p>Fundación de la viña…</p>
      </article>
      <!-- VineConnector decorativo (aria-hidden), excepto tras el último hito -->
    </li>
    …
  </ol>
</section>
```

El **lado izquierda/derecha se resuelve solo con CSS** (grid); el DOM queda cronológico →
lectores de pantalla y teclado recorren 1998→Hoy sin importar el zigzag visual.

## Estilos (globals.css)

Utilidades nuevas, con nombres claros:

- `.vine` — recolor: `background-color: var(--color-primary)` + `mask: url(/ilustraciones/rama-vid.webp) no-repeat center/contain` (+ `-webkit-mask`), `aspect-ratio: 1897/1207`.
- `.vine--flip` — `transform: scaleX(-1)` para alternar la serpentina.
- `.vine-wipe` / `.vine-wipe.is-grown` — barrido con `@keyframes vine-grow` (`clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)`), variante `--rtl` para el sentido inverso.
- `.torn-edge` — máscara orgánica reutilizable (SVG feTurbulence/borde irregular en data-URI) aplicada al wrapper de cada foto.
- Todo lo anterior anulado bajo `@media (prefers-reduced-motion: reduce)` (rama visible completa, sin barrido).

## Responsive (regla 10, mobile-first)

- **<768px**: 1 columna; `figure` arriba, texto debajo; guirnalda como divisor entre hitos.
- **≥768px**: grid de 2 mitades por hito, alternando lado; guirnaldas en la banda central
  con espejo alternado. Container `max-w-(--container-max)`.
- Sin scroll horizontal en ningún ancho (320px → 4K).

## Rendimiento (regla 8)

- Un solo asset de 112 KB, reutilizado/espejado (no 224 KB).
- `next/image` con `sizes` y `aspect-ratio` fijo en las fotos → sin CLS; below-the-fold → lazy.
- Barrido y fade sobre `clip-path`/`opacity`/`transform` (no width/height).

## Accesibilidad (WCAG AA)

- `alt` descriptivo real por foto (es/en/pt).
- Rama y conectores `aria-hidden="true"`.
- Contraste: vino/`text-primary` sobre `surface-container-low` = alto. Verificar el año.
- Navegación por teclado: sin controles interactivos nuevos; orden de foco = orden DOM.
- `prefers-reduced-motion` respetado.

## i18n

Agregar `imageAlt` por hito en `messages/{es,en,pt}.json` bajo `historia.timeline.milestones.*`
y una nota `historia.timeline.photoNote` ("fotos de muestra…", como `family.portraitDisclaimer`).

## Cambios de archivos

- `public/ilustraciones/rama-vid.webp` (nuevo, copiado del asset liviano).
- `app/globals.css` (utilidades nuevas).
- `components/HistoriaTimeline.tsx` (nuevo).
- `components/VineConnector.tsx` (nuevo).
- `app/[locale]/historia/page.tsx` (quitar B4 inline, usar `<HistoriaTimeline/>`).
- `messages/{es,en,pt}.json` (imageAlt + photoNote).

## Flags (regla 14 — avisar, no auto-borrar)

- `public/ilustraciones/rama-vertical.svg` (445 KB) y `uvas.svg` (694 KB): verificar uso;
  si están huérfanos, proponer borrado (no en este cambio).
- `temporero-corte-uva.jpg` (21 MB): no se usa hasta optimizar.

## Verificación

- `npm run build` (TS + SSG de las 60 rutas) sin errores.
- `npm run dev` + chequeo visual: desktop serpentina + barrido; mobile apilado; 320px sin overflow.
- Toggle `prefers-reduced-motion`: rama completa, sin animación.
- Revisar contraste del año.
