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
npm run foto:hero-vinos     # hero de /vinos
npm run foto:hero-home      # hero de la home (A1), desktop + móvil
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

### `npm run foto:hero-home` → `public/images/home/hero-*.webp`
Genera los dos encuadres del hero A1 con sus anchos de srcset:

| Archivo fuente | Sale como | Para |
|---|---|---|
| `public/images/home/hero-v2.jpg` (3840×2560, **sí está en el repo**) | `hero-1280` · `hero-1920` · `hero-2560` | desktop, 3:2 |
| `_fuentes-fotos/hero-movil.jpg` (9:16, ≥1600 de ancho) | `hero-movil-828` · `hero-movil-1200` · `hero-movil-1600` | pantallas verticales |

El desktop se regenera solo, sin bajar nada. Para el móvil hay que reponer
`hero-movil.jpg` desde el respaldo.

El master de móvil **tiene que ser 9:16**. Si se reemplaza por otro recorte con
otra proporción hay que actualizar el `sizes` del `<picture>` en
`app/[locale]/page.tsx`: lleva la proporción escrita en dos lugares (`56.25vh`
= 9/16, y el umbral `max-aspect-ratio: 9/16`).

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
