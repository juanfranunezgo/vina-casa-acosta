# A3 "Destacados" — Coverflow interactivo de vinos (home)

**Fecha:** 2026-07-03
**Sección:** A3 (home / `app/[locale]/page.tsx`)
**Referencia visual:** carrusel coverflow provisto por el cliente (card central agrandada, flechas prev/next, sello CA + ramas de vid de fondo, ornamento de racimo bajo el subtítulo).

## Objetivo

Reemplazar el grid estático de 3 columnas de vinos destacados por un **coverflow interactivo**: la card del centro se muestra agrandada y elevada, las laterales más chicas y atenuadas, con flechas prev/next (y swipe en móvil) que rotan cuál vino queda al centro, en loop.

## Alcance

- Solo la sección A3 del home. No toca `/vinos`, `/tienda` ni el detalle.
- Se mantienen los **3 vinos `featured`** actuales (Ombú Carmenere, Lajau Sam, Estación Francia Carmenere). No se cambia `data/wines.ts`.
- Copy i18n existente se reutiliza tal cual. Solo se agregan labels de accesibilidad para las flechas.

## Decisiones (confirmadas con el usuario)

1. **Carrusel:** coverflow interactivo de los 3 destacados; flechas + swipe rotan el centro, con loop.
2. **Ilustraciones:** se usan las **provistas por el cliente** en `public/ilustraciones/` (`rama-vertical.svg` a los costados, `uvas.svg` en el ornamento del encabezado). Son siluetas raster-en-SVG con alpha; se tiñen al vino de marca vía **máscara CSS** (`mask-image` + `background-color: primary-container`), controlando color y opacidad. El sello CA usa `public/brand/logo-negro.png` como marca de agua tenue. (El line-art SVG que había generado el agente quedó descartado.)
3. **Fondo:** **neutro** (`surface-container-low`), NO crema/beige. La calidez viene de las ilustraciones de vid y el sello en tono vino, no del fondo. (Coherente con la decisión de la sesión 2026-07-03: profundidad con vino de marca sobre neutros.)
4. **Acento de detalles finos:** `primary-container` (#4a0e0e), el rojo del botón Tienda.

## Arquitectura

- **Nuevo componente cliente** `components/FeaturedWinesCarousel.tsx`:
  - Props: `wines` (array de `{ slug, name, line, shortDescription, vintage, image, href }` ya resueltos por la page), `labels` (`{ vintageLabel, lineLabel, cardCta, prevLabel, nextLabel }`).
  - Estado: `active` = índice del vino centrado. Handlers `next()` / `prev()` con módulo (loop).
  - Deriva las 3 posiciones visibles (izquierda / centro / derecha) a partir de `active`.
  - Swipe táctil en móvil (touchstart/touchend con umbral) → `next`/`prev`.
  - Respeta `prefers-reduced-motion` (transición reducida).
  - A11y: flechas `<button>` con `aria-label`; cards son `<Link>` (navegación real al detalle).
- **La page (`app/[locale]/page.tsx`)** conserva `<section>`, encabezado, ornamento y CTA final; resuelve los datos de los 3 vinos y los pasa al carrusel. El encabezado se envuelve en `Reveal` como hoy.

## Layout e interacción

- **Desktop (md+):** 3 cards en fila. Central escalada ~1.12× + `ambient-shadow-lg`; laterales ~0.9× y opacidad ~0.6, asomando parcialmente. Flechas circulares a izquierda/derecha (estilo de la referencia: círculo con borde, hover sutil). Transición ~500ms ease.
- **Móvil:** una card grande centrada; flechas visibles + swipe. Las laterales se ocultan o quedan como sombra mínima.
- **Card:** stage de botella (aspect ~4/5, spotlight radial, reflejo en podio) + bloque de contenido (línea, nombre, descripción corta, "Ver detalles →"). Reutiliza el tratamiento visual de la card actual (serifs decorativos, drop-shadow vino).
- **Sello de cosecha** ("Cosecha / 20XX") arriba a la derecha de la card, como hoy.

## Ilustraciones de fondo (SVG)

- Racimo/hojas de vid como SVG inline, posicionadas detrás de la card central, asomando a los lados. `fill`/`stroke` en `primary-container` a baja opacidad (~6-10%). `aria-hidden`.
- Sello CA (`logo-negro.png`) centrado detrás de la card central, opacidad ~4-6%, `aria-hidden`.
- Ornamento del encabezado: filete — [racimo SVG] — centrado bajo el subtítulo, tintado a marca.

## i18n

Agregar en `home.featured` (es/en/pt):

- `prevLabel`: es "Vino anterior" · en "Previous wine" · pt "Vinho anterior"
- `nextLabel`: es "Vino siguiente" · en "Next wine" · pt "Próximo vinho"

## No-objetivos (YAGNI)

- No autoplay.
- No dots/paginación (las 3 posiciones ya comunican dónde estás).
- No ampliar el set de destacados ni tocar `data/wines.ts`.
- No cambiar el fondo a crema.

## Criterio de éxito

- Las flechas y el swipe rotan el centro en loop, sin saltos bruscos.
- Coverflow correcto en desktop; una card + swipe en móvil.
- Fondo neutro con vid/sello en tono vino; nada beige.
- Cards siguen linkeando a `/vinos/<slug>`.
- `npm run build` pasa (TS + SSG). Sin nuevas deps.
- Accesible por teclado y con reduced-motion.
