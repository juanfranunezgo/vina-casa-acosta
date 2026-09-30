// Fotos propias de las fichas de actividad — npm run fotos:actividades
//
// La tanda "Fotos Taller Web" que mandó la viña el 2026-09-29: una carpeta por
// actividad (los tours llevan el nombre de su vino). Entran todas menos las casi
// idénticas a otra de la misma carpeta, salvo en las fichas con menos de siete
// fotos, donde entra todo (decisión de Juan Francisco). La viña autorizó las
// fotos con menores. La subcarpeta `Premios` queda para otra etapa.
//
// Los originales van en `web/_fuentes-fotos/actividades/<slug>/` con el nombre
// que traían, para poder rastrear cada uno hasta el material del cliente. Las
// diez HEIC de pizzas se pasaron a JPEG (q95, `heic-convert`) antes de copiarlas:
// sharp no lee HEVC.
//
// Cada foto va a UNA ranura de la ficha (Dd1…Dd7, ver docs/NOMENCLATURA.md) y
// sale recortada a su proporción: lo que no se ve, no se descarga. Las que no
// caben en las ocho ranuras van a "Ver más fotos" (`mas-h` / `mas-v`), en 3:2 o
// 2:3 según vengan. Las cajas `box` van en fracciones del cuadro ya enderezado
// —no en píxeles—, elegidas mirando cada foto; el script las ajusta a la
// proporción exacta de la ranura y falla si eso le quita más de un 3%.
//
// `luz` es la luminancia media (0-255) a la que se lleva una foto subexpuesta,
// con una curva gamma: levanta las sombras sin quemar las luces. Sólo en las
// que llegaron oscuras (medidas: 17 a 47); el resto sale como vino. La curva
// sola deja los negros en gris (12-25) y la foto se ve lavada: por eso algunas
// declaran además `negro` y `blanco`, adónde van los percentiles 1 y 99 —los
// niveles de un editor de fotos—, y la gamma se busca con los niveles ya
// aplicados.

import sharp from "sharp";
import { mkdir, stat, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FUENTES = join(ROOT, "..", "_fuentes-fotos", "actividades");
const OUT_DIR = join(ROOT, "public", "images", "actividades");

/**
 * Proporción y ancho de salida de cada ranura. Sin `ratio`, la foto sale entera
 * y el encuadre lo resuelve `object-cover` en la página: el hero y el panel del
 * formulario cambian de proporción con la pantalla.
 */
const RANURAS = {
  hero: { width: 2400, widthVertical: 1600, quality: 76 },
  intro: { ratio: 4 / 3, width: 1200 },
  card: { ratio: 16 / 10, width: 1200 },
  reserve: { width: 1600, widthVertical: 1200 },
  wide: { ratio: 16 / 9, width: 1600 },
  portrait: { ratio: 2 / 3, width: 1000 },
  "mas-h": { ratio: 3 / 2, width: 1200 },
  "mas-v": { ratio: 2 / 3, width: 800 },
};

const QUALITY = 80;

const ACTIVIDADES = {
  alpacas: [
    // Hero: la visitante que ríe con el vellón en la mano. Hasta la revisión
    // de las capturas era el hero la de las tijeras, pero sin cara ni animal
    // se entendía sólo por el título.
    { source: "DSC01401.jpg", name: "alpacas-vellon", slot: "hero" },
    { source: "DSC01410.jpg", name: "alpacas-fibra", slot: "intro", box: [0.03, 0, 0.889, 1] },
    { source: "DSC01518.jpg", name: "alpacas-rueca", slot: "card", box: [0, 0.03, 1, 0.9375] },
    { source: "DSC01372.jpg", name: "alpacas-tijeras", slot: "reserve" },
    // Incluye al trasquilador arrodillado y saca parte de la grava de abajo.
    { source: "DSC01365.jpg", name: "alpacas-corral", slot: "wide", box: [0, 0.1, 1, 0.844] },
    { source: "DSC01390.jpg", name: "alpacas-instructor", slot: "portrait", box: [0.26, 0, 0.444, 1] },
    { source: "DSC01463.jpg", name: "alpacas-cardado", slot: "portrait", box: [0.33, 0, 0.444, 1] },
    // Sin la cara cortada del hombre que devana.
    { source: "DSC01522.jpg", name: "alpacas-madeja", slot: "portrait", box: [0.29, 0.1, 0.4, 0.9] },
    // Ver más, en el orden del programa.
    { source: "DSC01209.jpg", name: "alpacas-desayuno", slot: "mas-h" },
    { source: "DSC01266.jpg", name: "alpacas-charla", slot: "mas-h" },
    { source: "DSC01385.jpg", name: "alpacas-trasquila", slot: "mas-h" },
    { source: "DSC01358.jpg", name: "alpacas-vellon-lavado", slot: "mas-h" },
    { source: "DSC01459.jpg", name: "alpacas-artesana", slot: "mas-h" },
    { source: "DSC01534.jpg", name: "alpacas-hilado", slot: "mas-h" },
    { source: "DSC01557.jpg", name: "alpacas-rueca-hilado", slot: "mas-h" },
    { source: "DSC01485.jpg", name: "alpacas-telar", slot: "mas-h" },
    { source: "DSC01502.jpg", name: "alpacas-urdimbre", slot: "mas-h" },
    { source: "DSC01541.jpg", name: "alpacas-telar-familia", slot: "mas-h" },
    { source: "DSC01538.jpg", name: "alpacas-toldo", slot: "mas-h" },
    { source: "DSC01625.jpg", name: "alpacas-camino", slot: "mas-h" },
    { source: "DSC01650.jpg", name: "alpacas-almuerzo", slot: "mas-h" },
  ],

  // Seis fotos: entran todas y la galería queda con una sola vertical. Tres son
  // de WhatsApp (1280 px o menos) y van a las ranuras chicas.
  bera: [
    { source: "DSC08645.jpg", name: "bera-vinedo", slot: "hero" },
    // Vino sacado de la barrica con la pipeta: lo que promete el tour.
    { source: "1A PHOTO-2020-12-09-15-37-30 (4).jpg", name: "bera-barrica", slot: "intro", box: [0.055, 0, 0.889, 1] },
    { source: "OK PHOTO-2020-12-09-15-37-30 (1).jpg", name: "bera-sala-barricas", slot: "card", box: [0, 0.03, 1, 0.938] },
    { source: "_MG_1063.jpg", name: "bera-mesa", slot: "reserve" },
    { source: "DSC08589.jpg", name: "bera-camino", slot: "wide", box: [0, 0.12, 1, 0.844] },
    { source: "PHOTO-2026-09-27-20-49-48 (2).jpg", name: "bera-pipeta", slot: "portrait", box: [0.02, 0, 0.889, 1] },
  ],

  // Fuera `_DSC8771`: casi gemela de `_DSC8767` (la misma botella de Guidaí,
  // sirviéndose).
  carmenere: [
    // Follaje y grava, textura fina: a 2400 px y q76 pesaba 691 KB (y 615 a
    // q70). A 2000 px y q72 queda en la línea de los otros heros.
    { source: "DSC08581.jpg", name: "carmenere-grupo", slot: "hero", width: 2000, quality: 72 },
    { source: "PBJY2710.JPG", name: "carmenere-gran-reserva", slot: "intro", box: [0.055, 0, 0.888, 1] },
    { source: "DSC09077.jpg", name: "carmenere-guidai", slot: "card", box: [0, 0.06, 1, 0.936] },
    // Fondo negro a propósito: foto de producto. No se aclara.
    { source: "_DSC8767.jpg", name: "carmenere-espumante", slot: "reserve" },
    { source: "DSC09104.jpg", name: "carmenere-barricas", slot: "wide", box: [0, 0.08, 1, 0.843] },
    { source: "_DSC5616.JPG", name: "carmenere-pipeta", slot: "portrait", box: [0.31, 0, 0.444, 1], luz: 75 },
    { source: "_MG_1062.jpg", name: "carmenere-copas", slot: "portrait" },
    { source: "_MG_1060.jpg", name: "carmenere-mesa", slot: "portrait", box: [0.006, 0, 0.988, 1] },
    { source: "_DSC5619.JPG", name: "carmenere-cata", slot: "mas-h" },
    { source: "_DSC5595.JPG", name: "carmenere-botella", slot: "mas-h", luz: { media: 72, negro: 8 } },
    { source: "OK PHOTO-2020-12-09-15-37-30 (3).jpg", name: "carmenere-barrica-pipeta", slot: "mas-h" },
  ],

  // Fuera `_MG_0652`: la misma mesa de botellas que `_MG_0665`, más oscura.
  "enologo-por-un-dia": [
    { source: "_MG_0756.JPG", name: "enologo-probeta", slot: "hero" },
    // Sin la tele de arriba a la izquierda ni el florero.
    { source: "_MG_0782.JPG", name: "enologo-pipeta", slot: "intro", box: [0.1467, 0.04, 0.8533, 0.96] },
    // Sin la tele de arriba a la izquierda, pero con las cápsulas de las botellas.
    { source: "_MG_0665.JPG", name: "enologo-mesa", slot: "card", box: [0, 0.19, 0.8, 0.75] },
    { source: "_MG_0931.JPG", name: "enologo-copa", slot: "reserve" },
    // Sin la servilleta manchada de abajo.
    { source: "_MG_0980.JPG", name: "enologo-fichas", slot: "wide", box: [0.075, 0, 0.9245, 0.78] },
    { source: "_MG_0765.JPG", name: "enologo-medicion", slot: "portrait", box: [0.28, 0, 0.4444, 1], luz: { media: 68, blanco: 200 } },
    // Sin el celular que asoma bajo la botella.
    { source: "_MG_0857.JPG", name: "enologo-embotellado", slot: "portrait", box: [0.3, 0, 0.3689, 0.83], luz: 60 },
    { source: "_MG_0791.JPG", name: "enologo-maridaje", slot: "portrait", box: [0.5556, 0, 0.4444, 1], luz: 57 },
    { source: "_MG_0673.JPG", name: "enologo-botellas", slot: "mas-h", luz: { media: 70, negro: 8 } },
    { source: "_MG_0766.JPG", name: "enologo-varilla", slot: "mas-h" },
    { source: "_MG_0872.JPG", name: "enologo-etiqueta", slot: "mas-h" },
    { source: "_MG_0967.JPG", name: "enologo-botella-numerada", slot: "mas-h", luz: 57 },
  ],

  // Las ocho fotos del 2026-08-19 siguen saliendo de `npm run fotos:mimbre`.
  // Éstas son de otro taller, de teléfono y con sol. Fuera `IMG_3408` y
  // `IMG_3516`: la misma presentación y la misma foto grupal que `IMG_3411` y
  // `IMG_3517`.
  mimbre: [
    // Reemplaza a `mimbre-piezas` en el mosaico: la mesa de canastos ya está en
    // el hero y en la apertura, y ésta es la única con la viña y la cordillera.
    { source: "IMG_3457.JPG", name: "mimbre-preparacion", slot: "portrait", box: [0.2, 0.06, 0.8, 0.9] },
    // Arriba: abajo hay una cabeza que tapa el borde.
    { source: "IMG_3411.JPG", name: "mimbre-presentacion", slot: "mas-h", anchorY: 0 },
    { source: "IMG_3517.JPG", name: "mimbre-grupo", slot: "mas-h" },
    // Sin el pulgar del primer plano ni la vara del borde.
    { source: "IMG_3442.JPG", name: "mimbre-maestro-corte", slot: "mas-v", box: [0.3, 0.14, 0.66, 0.7425] },
    { source: "IMG_3465.JPG", name: "mimbre-ninas", slot: "mas-v" },
  ],

  // Cinco fotos: entran todas y la galería queda sólo con la apertura.
  noquis: [
    // Hero: los cilindros de masa y los ñoquis recién cortados. La de las
    // manos formando ñoquis era el hero, pero en la franja se leía como una
    // cata y los ñoquis quedaban bajo el título; pasa a la galería, recortada
    // desde abajo, que es donde están las manos.
    { source: "_MG_0839.JPG", name: "noquis-masa", slot: "hero" },
    // Pegada arriba: más abajo se cortaba la coronilla de la participante.
    { source: "_MG_0837.JPG", name: "noquis-formado", slot: "intro", box: [0.1, 0.02, 0.8, 0.9] },
    { source: "_MG_0822.JPG", name: "noquis-mesa", slot: "card", box: [0, 0.03, 1, 0.9375] },
    { source: "_MG_0848.JPG", name: "noquis-sonrisa", slot: "reserve" },
    { source: "_MG_0846.JPG", name: "noquis-bandeja", slot: "wide", box: [0, 0.156, 1, 0.844] },
  ],

  ombu: [
    { source: "_MG_1027.jpg", name: "ombu-copas", slot: "hero" },
    // La charla en la sala de barricas abre la galería, y la botella en la
    // penumbra baja a la bajada: es un fotograma de video, blando, y a 16:9 el
    // suéter de quien la sostiene ocupaba el 40% del cuadro.
    { source: "DSC09181.jpg", name: "ombu-barricas", slot: "wide", anchorY: 0.2 },
    { source: "DSC08946.JPG", name: "ombu-botella", slot: "card", box: [0, 0.03, 1, 0.9375] },
    { source: "IMG_3924.JPG", name: "ombu-rosado", slot: "reserve" },
    { source: "_DSC5632.JPG", name: "ombu-reserva", slot: "intro", box: [0.111, 0, 0.889, 1], luz: { media: 75, negro: 10, blanco: 210 } },
    { source: "_MG_1025.jpg", name: "ombu-mesa", slot: "portrait" },
    { source: "IMG_3873.JPG", name: "ombu-taponadora", slot: "portrait", box: [0.08, 0, 0.889, 1] },
    { source: "_DSC5641.JPG", name: "ombu-bodega", slot: "portrait", box: [0.278, 0, 0.444, 1], luz: 75 },
  ],

  // Fuera `_MG_1070`: la misma mesa que `_MG_1077`, más blanda y con un
  // celular en trípode al medio.
  pastas: [
    { source: "_MG_0404 - copia - copia.JPG", name: "pastas-fideos", slot: "hero" },
    { source: "_MG_1060 - copia - copia.JPG", name: "pastas-amasado", slot: "intro", box: [0.1, 0, 0.8889, 1] },
    // Más cerca del plato: arriba había sólo loza blanca.
    { source: "_MG_0496 - copia - copia.JPG", name: "pastas-plato", slot: "card", box: [0.1, 0.25, 0.8, 0.75] },
    // Junto al formulario, las manos doblando la pasta rellena, en el mismo
    // recorte 2:3 del mosaico. Estuvo la del participante con la manga, pero
    // viene cortada en la frente desde el original y en el panel se notaba;
    // pasa al mosaico, recortada a las manos y la manga.
    { source: "_MG_1064 - copia - copia.JPG", name: "pastas-doblado", slot: "reserve", box: [0.1, 0, 0.4444, 1] },
    { source: "_MG_1077 - copia - copia.JPG", name: "pastas-mesa", slot: "wide", box: [0, 0.05, 1, 0.84375] },
    { source: "_MG_1062 - copia - copia.JPG", name: "pastas-disco", slot: "portrait", box: [0.28, 0, 0.4444, 1] },
    { source: "_MG_1080 - copia.JPG", name: "pastas-relleno", slot: "portrait", box: [0.4, 0, 0.4444, 1] },
    { source: "_MG_0382 - copia - copia.JPG", name: "pastas-laminado", slot: "portrait", box: [0.4, 0, 0.4444, 1], luz: { media: 68, negro: 6 } },
  ],

  // Fuera `IMG_1369` (el mismo cuadro que `IMG_1368`, con la cabeza cortada),
  // `IMG_1389` / `IMG_1392` (casi iguales a `IMG_1376`) e `IMG_1376`, las risas
  // alrededor de la mesa: estuvo junto al formulario y Juan Francisco la sacó.
  pizzas: [
    // Vertical: en escritorio `heroPosition` sube la franja a las caras.
    { source: "IMG_1469.jpg", name: "pizzas-armadas", slot: "hero" },
    // Sin el techo.
    { source: "IMG_1386.jpg", name: "pizzas-amasado", slot: "intro", box: [0, 0.36, 1, 0.5625] },
    // Sin la mano desenfocada de abajo.
    { source: "IMG_1426.jpg", name: "pizzas-ingredientes", slot: "card", box: [0, 0.53, 1, 0.3516] },
    // Junto al formulario, la misma foto del hero, repetida a propósito (pedido
    // de Juan Francisco), en un archivo propio al tamaño del panel. Entera en
    // escritorio; en la franja del celular, caras y pizzas (`position` en
    // data/activities.ts).
    { source: "IMG_1469.jpg", name: "pizzas-armadas-panel", slot: "reserve" },
    { source: "IMG_1413.jpg", name: "pizzas-bodega", slot: "wide" },
    { source: "IMG_1444.jpg", name: "pizzas-queso", slot: "portrait", box: [0, 0.15625, 1, 0.84375] },
    { source: "IMG_1454.jpg", name: "pizzas-armado", slot: "portrait", box: [0, 0.15625, 1, 0.84375] },
    { source: "IMG_1362.jpg", name: "pizzas-amasador", slot: "portrait", box: [0, 0.3, 0.6, 0.675] },
    // Fotograma de video (2066x3672), blando. Cuarta vertical del mosaico:
    // sola detrás de "Ver más fotos" era un botón para una foto.
    { source: "IMG_1368.JPG", name: "pizzas-mesa", slot: "portrait" },
  ],
};

/** Caja en píxeles con la proporción exacta, dentro de la caja pedida. */
function caja(W, H, { box, ratio, anchorX = 0.5, anchorY = 0.5 }) {
  let [left, top, width, height] = box
    ? [box[0] * W, box[1] * H, box[2] * W, box[3] * H]
    : [0, 0, W, H];
  if (ratio) {
    const actual = width / height;
    if (actual > ratio) {
      const ancho = height * ratio;
      if (box && (width - ancho) / width > 0.03) throw new Error(`la caja pierde ${Math.round((1 - ancho / width) * 100)}% del ancho`);
      left += (width - ancho) * (box ? 0.5 : anchorX);
      width = ancho;
    } else if (actual < ratio) {
      const alto = width / ratio;
      if (box && (height - alto) / height > 0.03) throw new Error(`la caja pierde ${Math.round((1 - alto / height) * 100)}% del alto`);
      top += (height - alto) * (box ? 0.5 : anchorY);
      height = alto;
    }
  }
  const r = {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.floor(width),
    height: Math.floor(height),
  };
  if (r.left < 0 || r.top < 0 || r.left + r.width > W || r.top + r.height > H) {
    throw new Error(`la caja se sale del cuadro ${W}x${H}`);
  }
  return r;
}

/** Luminancia media (Rec. 709) de un buffer RGB crudo, con una curva gamma. */
function luminancia(data, lut) {
  let suma = 0;
  for (let i = 0; i < data.length; i += 3) {
    suma += 0.2126 * lut[data[i]] + 0.7152 * lut[data[i + 1]] + 0.0722 * lut[data[i + 2]];
  }
  return suma / (data.length / 3);
}

const curva = (gamma) => Uint8Array.from({ length: 256 }, (_, v) => Math.round(255 * (v / 255) ** (1 / gamma)));

/** Percentiles 1 y 99 de la luminancia, con una curva aplicada. */
function extremos(data, lut) {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 3) {
    hist[Math.round(0.2126 * lut[data[i]] + 0.7152 * lut[data[i + 1]] + 0.0722 * lut[data[i + 2]])]++;
  }
  const total = data.length / 3;
  let acumulado = 0;
  let p1 = 0;
  let p99 = 255;
  for (let v = 0; v < 256; v++) {
    acumulado += hist[v];
    if (acumulado < total * 0.01) p1 = v + 1;
    if (acumulado < total * 0.99) p99 = v + 1;
  }
  return [p1, p99];
}

/**
 * La curva completa para una gamma: la gamma y después los niveles, si la
 * foto los pide. Sin `negro` ni `blanco`, los extremos quedan donde caen.
 */
function curvaCompleta(data, gamma, { negro, blanco }) {
  const g = curva(gamma);
  if (negro === undefined && blanco === undefined) return g;
  const [p1, p99] = extremos(data, g);
  const [n, b] = [negro ?? p1, blanco ?? p99];
  return g.map((v) => Math.max(0, Math.min(255, Math.round(n + ((v - p1) * (b - n)) / Math.max(1, p99 - p1)))));
}

/** La curva que lleva la media a `media`, buscando la gamma por bisección. */
function curvaPara(data, luz) {
  let [bajo, alto] = [0.5, 4];
  for (let i = 0; i < 20; i++) {
    const medio = (bajo + alto) / 2;
    if (luminancia(data, curvaCompleta(data, medio, luz)) < luz.media) bajo = medio;
    else alto = medio;
  }
  const gamma = (bajo + alto) / 2;
  return { gamma, lut: curvaCompleta(data, gamma, luz) };
}

const exists = async (p) => access(p).then(() => true, () => false);

await mkdir(OUT_DIR, { recursive: true });

const solo = process.argv[2];
for (const [slug, fotos] of Object.entries(ACTIVIDADES)) {
  if (solo && slug !== solo) continue;
  console.log(`\n${slug}`);
  for (const foto of fotos) {
    const { source, name, slot, luz } = foto;
    const input = join(FUENTES, slug, source);
    if (!(await exists(input))) {
      console.log(`  ⚠ falta ${slug}/${source} en _fuentes-fotos/actividades/ — se salta`);
      continue;
    }
    const ranura = RANURAS[slot];

    // Medidas ya enderezadas: las de teléfono traen `orientation: 6`.
    const meta = await sharp(input).metadata();
    const acostada = (meta.orientation ?? 1) >= 5;
    const W = acostada ? meta.height : meta.width;
    const H = acostada ? meta.width : meta.height;

    let recorte;
    try {
      recorte = caja(W, H, { ...foto, ratio: ranura.ratio });
    } catch (error) {
      throw new Error(`${slug}/${source}: ${error.message}`);
    }
    const vertical = recorte.height > recorte.width;
    const ancho = foto.width ?? (vertical && ranura.widthVertical ? ranura.widthVertical : ranura.width);

    let pipeline = sharp(input)
      .rotate()
      .extract(recorte)
      // Con proporción fija se pide también el alto: si no, el redondeo deja
      // un píxel de más o de menos.
      .resize({
        width: ancho,
        height: ranura.ratio ? Math.round(ancho / ranura.ratio) : undefined,
        withoutEnlargement: true,
      })
      .removeAlpha();

    let nota = "";
    if (luz) {
      const ajuste = typeof luz === "number" ? { media: luz } : luz;
      const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
      const antes = luminancia(data, curva(1));
      const { gamma, lut } = curvaPara(data, ajuste);
      for (let i = 0; i < data.length; i++) data[i] = lut[data[i]];
      const [p1, p99] = extremos(data, curva(1));
      pipeline = sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });
      nota = `  luz ${Math.round(antes)}→${Math.round(luminancia(data, curva(1)))} (gamma ${gamma.toFixed(2)}, negro ${p1}, blanco ${p99})`;
    }

    const quality = foto.quality ?? ranura.quality ?? QUALITY;
    const output = join(OUT_DIR, `${name}.webp`);
    await pipeline.webp({ quality, effort: 6, smartSubsample: true }).toFile(output);

    const { size } = await stat(output);
    const salida = await sharp(output).metadata();
    console.log(
      `  ✓ ${name}.webp  ${slot}  origen ${W}x${H} → ${salida.width}x${salida.height}  q${quality}  ${Math.round(size / 1024)} KB${nota}`,
    );
  }
}
