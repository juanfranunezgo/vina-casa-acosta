# Pipeline de fotos

Los `.webp` optimizados están versionados en `public/images/`, así que **el sitio
funciona sin ninguna foto original en el disco**. Los originales solo hacen falta
para *regenerar*: cambiar un encuadre, subir la calidad o agregar un ancho nuevo.

Los originales viven fuera del repo (pesan decenas de MB) en
`vina-casa-acosta/web/_fuentes-fotos/`, una carpeta que **se crea a demanda**:
se baja el material del respaldo del cliente, se corre el script, y se puede
borrar de nuevo. Los scripts solo leen, nunca sobrescriben.

```bash
cd sitio-web
npm run fotos:colecciones   # bandas de colección de /vinos (C2)
npm run fotos:contacto      # galería de /contacto
npm run foto:hero-vinos     # master horizontal del hero de /vinos
npm run foto:heros          # los 4 heros full-bleed, desktop + móvil
```

Si falta un archivo fuente, el script lo salta con un aviso y procesa el resto.

## Qué archivo espera cada script

### `npm run fotos:colecciones` → `public/images/vinos/coleccion-*.webp`
Recorte 4:5 centrado, 1200×1500, webp q82.

| Archivo fuente | Sale como |
|---|---|
| `ombu.jpg` | `coleccion-ombu.webp` |
| `ombu-carmenere.jpg` | `coleccion-ombu-2.webp` |
| `ombu-tannat.jpg` | `coleccion-ombu-3.webp` |
| `lajau.jpg` | `coleccion-lajau.webp` |
| `lajau-sam.jpg` | `coleccion-lajau-2.webp` |
| `lajau-deti.jpg` | `coleccion-lajau-3.webp` |
| `coleccion-et.jpg` | `coleccion-estacion-francia.webp` |
| `estacion-francia-carmenere.jpg` | `coleccion-estacion-francia-2.webp` |
| `estacion-francia-carmenere2.jpg` | `coleccion-estacion-francia-3.webp` |
| `estacion-francia-carmenere3.jpg` | `coleccion-estacion-francia-4.webp` |
| `bera.jpg` | `coleccion-bera.webp` |
| `bera2.jpg` | `coleccion-bera-2.webp` |
| `coleccion-guidai.jpg` | `coleccion-guidai-v2.webp` |
| `Guidaí.jpg` | `coleccion-guidai-2.webp` (rellena los lados con blur: la fuente es angosta) |

### `npm run fotos:contacto` → `public/images/contacto/`
`plato-cena.jpg` · `cena1.jpg` · `asado.JPG` · `letrero.JPG`

### `npm run foto:hero-vinos` → `public/images/vinos/hero-corchos.webp`
`corchos.jpg`

### `npm run foto:heros` → los 4 heros full-bleed

Cada hero se sirve en **dos encuadres**: el horizontal 3:2 de siempre para
desktop y un 9:16 para pantallas verticales. Sin el vertical, `object-cover`
estira la foto para cubrir el alto y en un celular queda visible apenas un
tercio, además de borrosa (medido: 0,31 píxeles de origen por píxel de pantalla,
contra 1,11 con el recorte).

| Página | Master horizontal (en el repo) | Master vertical (`_fuentes-fotos/`) |
|---|---|---|
| `/` (A1) | `images/home/hero-v2.jpg` 3840×2560 | `hero-movil.jpg` |
| `/vinos` (C1) | `images/vinos/hero-corchos.webp` 2560×1707 | `hero-vinos-movil.jpg` |
| `/historia` (B1) | `images/historia/vinos-retro.webp` 2400×1600 | `hero-historia-movil.jpg` |
| `/actividades` (D1) | `images/actividades/hero-grupal.webp` 2880×1920 | `hero-actividades-movil.jpg` |

Los masters horizontales están versionados, así que **la mitad de desktop se
regenera sin bajar nada**. Los verticales hay que reponerlos desde el respaldo;
si falta alguno el script lo avisa y sigue con el resto.

El `.webp` sin sufijo de ancho es el master a su tamaño nativo y se sirve tal
cual, como candidato más grande del srcset: reencodearlo al mismo tamaño solo
agregaría una segunda pasada de compresión.

**Los masters verticales tienen que ser 9:16.** La proporción está escrita en el
`sizes` del `<picture>` de cada página (`56.25vh` = 9/16, y el umbral
`max-aspect-ratio: 9/16`); si se cambia el recorte hay que actualizarla. Ideal
≥1440px de ancho, o sea ≥2560 de alto: es lo que necesita un celular vertical a
DPR 3. Dejar el 10% de cada borde lateral como zona de sacrificio — en pantallas
más altas que 9:16 el navegador se lo come.

El hero de `/actividades/[slug]` no lleva este tratamiento y no lo necesita: mide
443px de alto y su foto es casi vertical, así que `object-cover` no estira nada.

## Otros pipelines (no usan `_fuentes-fotos/`)

- `npm run fotos` lee de `sitio-web/_fotos-input/<Letra>/` con nombres por slot
  (`A1-…`, `B2-…`), según el MANIFEST de `scripts/optimize-fotos.mjs`.
- `npm run fotos:rendimiento` reoptimiza imágenes que **ya están** en
  `sitio-web/public/`.

## Ojo con el nombre del archivo de salida

Si cambiás la foto de un slot **manteniendo el nombre del webp**, el navegador y el
optimizador de Next siguen sirviendo la versión vieja. Al reemplazar una foto, subile
la versión al nombre de salida (`-v2`, `-v3`…) y actualizá la referencia en el código
(`data/wines.ts` para las colecciones).
