/**
 * Las fotos del hub de Vendimia (`app/[locale]/actividades/vendimia/page.tsx`)
 * y cómo se reparten entre el carrusel de la jornada (Dv4) y la galería (Dv6).
 *
 * Vive fuera de la página porque `node --test` no puede cargar un componente de
 * React: acá lo lee `tests/vendimia-galeria.test.mjs`, que comprueba que cada
 * archivo exista, que tenga la proporción de su ranura, que su `alt` esté en los
 * tres idiomas y que ninguna foto se repita en la página.
 *
 * Cada foto aparece una sola vez, en la sección cuyo texto describe. La versión
 * anterior usaba `mesa` dos veces y ponía `parras` de fondo tapada al 88% —se
 * descargaba entera para no verse— mientras la galería mostraba cuatro recortes
 * de la aérea como si fueran cuatro momentos distintos.
 *
 * El `alt` de cada una está en `activities.vendimia.photos.<clave>`, con la
 * misma clave que acá. Salen de `npm run fotos:vendimia` — ver docs/FOTOS.md.
 */
export const VENDIMIA_FOTOS = {
  // De la viña, no de una vendimia: su `alt` no afirma que lo sea.
  asado: "/images/contacto/asado.webp",
  // Fotos propias de la jornada (2026-08-18), de teléfono.
  mosto: "/images/actividades/vendimia-mosto.webp",
  manoUva: "/images/actividades/vendimia-mano-uva.webp",
  pisoneo: "/images/actividades/vendimia-pisoneo.webp",
  desayuno: "/images/actividades/vendimia-desayuno.webp",
  personas: "/images/actividades/vendimia-personas.webp",
  bin: "/images/actividades/vendimia-bin.webp",
  charla: "/images/actividades/vendimia-charla.webp",
  formulario: "/images/actividades/vendimia-formulario.webp",
  // Tanda del fotógrafo de la vendimia (2026-09-22).
  cosecha: "/images/actividades/vendimia-cosecha.webp",
  pisoneoBarricas: "/images/actividades/vendimia-pisoneo-barricas.webp",
  desayunoDetalle: "/images/actividades/vendimia-desayuno-detalle.webp",
  corte: "/images/actividades/vendimia-corte.webp",
  despalillado: "/images/actividades/vendimia-despalillado.webp",
  asadoJornada: "/images/actividades/vendimia-asado-jornada.webp",
  pisoneoNinos: "/images/actividades/vendimia-pisoneo-ninos.webp",
  almuerzo: "/images/actividades/vendimia-almuerzo.webp",
  fotoGrupal: "/images/actividades/vendimia-foto-grupal.webp",
} as const;

export type VendimiaFoto = keyof typeof VENDIMIA_FOTOS;

/**
 * Dv4 — el carrusel junto a "La jornada incluye", en el orden del día:
 * desayuno, corte, almuerzo. Marco 4:5 (`CollectionPhotos`).
 */
export const VENDIMIA_CARRUSEL: readonly VendimiaFoto[] = ["desayuno", "cosecha", "asado"];

/** Proporción de una fila de la galería, como la escribe Tailwind. */
export type ProporcionFila = "16/9" | "3/2" | "4/5";

/** Una fila de la galería. Todas sus fotos comparten proporción. */
export type FilaGaleria = {
  proporcion: ProporcionFila;
  fotos: readonly VendimiaFoto[];
};

/**
 * Dv6 — la galería, en filas. Cada fila tiene una sola proporción y cada foto
 * se recorta a esa proporción en el script, no con `object-cover`: lo que no se
 * ve, no se descarga.
 *
 * `visibles` es lo que se ve al llegar: una apertura ancha y una fila de tres
 * con las fotos del fotógrafo, que cuentan el día en orden (el pisoneo abre
 * porque es la imagen de la vendimia; después desayuno, corte y despalillado).
 * `mas` queda detrás de "Ver más fotos" y cierra con la foto grupal. Las fotos
 * de teléfono del 2026-08-18 van ahí, en una fila 4:5 propia, porque son
 * verticales.
 *
 * Una fila de tres en móvil se dibuja en dos columnas con la última a lo ancho;
 * una de dos, apilada; una de cuatro, en dos por dos.
 */
export const VENDIMIA_GALERIA: {
  visibles: readonly FilaGaleria[];
  mas: readonly FilaGaleria[];
} = {
  visibles: [
    { proporcion: "16/9", fotos: ["pisoneoBarricas"] },
    { proporcion: "3/2", fotos: ["desayunoDetalle", "corte", "despalillado"] },
  ],
  mas: [
    { proporcion: "4/5", fotos: ["personas", "bin", "charla", "asadoJornada"] },
    { proporcion: "3/2", fotos: ["pisoneoNinos", "almuerzo"] },
    { proporcion: "16/9", fotos: ["fotoGrupal"] },
  ],
};
