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
npm run fotos:vendimia      # los 4 encuadres del hub de Vendimia (Dv)
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
| `/actividades/vendimia` (Dv1) | `hero-vendimia.jpg` 8064×4536 (`_fuentes-fotos/`) | **no lleva** — ver abajo |

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

**Vendimia (`Dv1`) es la excepción y conviene saber por qué**, para que nadie
"complete" el encuadre que falta: su foto es una aérea de 8064×4536 donde el
grupo ocupa el 55% del ancho, y un recorte 9:16 se queda con el 32% — corta gente
en los dos extremos. Sale sin master vertical: en pantalla vertical se ve la
franja central (el grueso del grupo y el tractor) y la nitidez la sostiene el
`sizes` de la página, que va en `vh` como el de los otros heros —con una foto
16:9, `cover` pinta un ancho de `alto × 1,78`— y el alto del hero móvil está
puesto para que ese ancho entre en el candidato de 1280. Medido: 0,94 píxeles de
origen por píxel de pantalla en 375×812 a DPR 2, y 1,08 en escritorio. Si algún
día llega una toma vertical de la vendimia, entra como `hero-vendimia-movil.jpg`
y el script ya sabe qué hacer con ella.

**De esa misma aérea salen las cuatro fotos del hub** (`npm run fotos:vendimia` →
`vendimia-grupo`, `vendimia-gamelas`, `vendimia-hileras`, `vendimia-tractor`). Con 36
megapíxeles, un recorte de un cuarto del cuadro sigue saliendo por encima de 2000px de
ancho: son fotos de verdad, no ampliaciones. Se hizo así porque la alternativa era llenar
la página con fotos de otras actividades, que le habrían dicho al visitante que así se ve
la vendimia. Las coordenadas de cada encuadre van en fracción del original —no en
píxeles— para que sigan significando lo mismo si algún día llega el archivo a otro tamaño.

Esa misma foto lleva `quality: 72` en vez de la curva por megapíxeles: es textura
fina (follaje desde arriba) y ahí el codo cae más abajo. Medido a 1920px: q78 son
590 KB y q72, 500 KB, con el recorte 1:1 sobre las caras idéntico; de q72 hacia
abajo se ahorran ~20 KB por escalón. El campo `quality` de `scripts/optimize-heros.mjs`
existe para eso y se usa con la medición al lado.

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
