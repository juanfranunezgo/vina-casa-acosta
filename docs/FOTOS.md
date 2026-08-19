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

### Fotos propias de la jornada (2026-08-18)

El mismo `npm run fotos:vendimia` procesa además ocho fotos sueltas de una vendimia real,
que reemplazaron recortes de la aérea y fotos prestadas de otras actividades. Van a
`quality: 80` —no 72— porque se ven a tamaño de tarjeta y tienen caras y piel, donde el
bandeo se nota.

| Fuente en `_fuentes-fotos/` | Sale como | Ranura | Recorte |
|---|---|---|---|
| `vendimia-mosto.jpg` | `vendimia-mosto.webp` 800×1200 | Dv2, tríptico | ninguno (ya es 2:3) |
| `vendimia-mano-uva.jpg` | `vendimia-mano-uva.webp` 800×1200 | Dv2, tríptico | ninguno |
| `vendimia-pisoneo.jpg` | `vendimia-pisoneo.webp` 800×1200 | Dv2, tríptico | ninguno |
| `vendimia-mesa-desayuno.jpg` | `vendimia-desayuno.webp` 1100×1375 | Dv4, carrusel | 4:5, `anchorY 0.45` |
| `vendimia-personas.jpg` | `vendimia-personas.webp` 1000×1250 | Dv6, galería | 4:5, `anchorY 0.55` |
| `vendimia-bin.jpg` | `vendimia-bin.webp` 1000×1250 | Dv6, galería | 4:5, `anchorY 0.6` |
| `vendimia-charla.jpg` | `vendimia-charla.webp` 1000×1250 | Dv6, galería | 4:5, `anchorY 0.45` |
| `vendimia-formulario.jpg` | `vendimia-formulario.webp` 1600×1067 | Dv7, junto al formulario | ninguno |

**`anchorY` es la fracción del sobrante que se saca por arriba** (0 conserva el borde
superior, 1 el inferior). No es un valor por defecto que se pueda dejar en 0.5 y olvidar:
se eligió mirando cada foto, y con `personas` centrado la fila de gamelas rotuladas queda
cortada. Al cambiar una fuente hay que **abrir el `.webp` generado**, no sólo mirar sus
dimensiones.

**Dos trampas ya pagadas:**

- `personas`, `bin` y `charla` salieron de un teléfono en vertical: el archivo mide
  4000×2252 con `orientation: 6` en el EXIF. Sin `.rotate()` se procesan acostadas y el
  recorte cae en cualquier parte. El script calcula la caja sobre las medidas **ya
  rotadas**.
- La de `Dv7` no se recorta en el script y se ancla con `object-[16%_center]` en la
  página. La gamela roja ocupa del 11% al 57% del ancho y la ranura del formulario sólo
  muestra el 53%: pegada al borde izquierdo (`object-left`) la ventana termina en 53% y le
  corta el canto. Con 16% va de 7% a 60% y entra entera.

Dos nombres no coinciden con los del cliente, a propósito: `pisoneo-vendimia3` **no es un
pisoneo** —es el mosto cayendo de la canilla de la barrica— y se guarda como
`vendimia-mosto`; `pisoneo-vendimia2` sí lo es y quedó como `vendimia-pisoneo`. Un archivo
que miente sobre su contenido termina en un `alt` que miente sobre la foto.

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
