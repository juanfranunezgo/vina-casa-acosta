/**
 * La versión borrosa de una foto de portada: lo que se ve mientras baja la real.
 *
 * Va justo ANTES del `<picture>` de la foto, dentro del mismo contenedor: la
 * foto real se pinta encima y la tapa cuando termina de bajar. Sin esto, en ese
 * rato se veía el fondo blanco de la página bajo el velo oscuro de la portada
 * —"un gris feo", Juan Francisco, 2026-10-12—, y con datos móviles dura uno o
 * dos segundos en cada cambio de página.
 *
 * Las miniaturas son data URI de unos 300 bytes (`data/fotosBorrosas.ts`, de
 * `npm run fotos:borrosas`): viajan dentro del HTML, así que están desde el
 * primer pintado, sin pedir nada a la red. Se piden con `fotoBorrosa()` de
 * `lib/fotoBorrosa.ts`.
 *
 * `className` tiene que ser el de la foto real —mismo `object-cover` y misma
 * posición—: si los encuadres difieren, la imagen salta al enfocarse. El
 * navegador suaviza solo una imagen estirada cincuenta veces, así que no lleva
 * `filter: blur`, que sobre una portada a pantalla completa cuesta GPU.
 */
export default function FotoBorrosa({
  movil,
  escritorio,
  className,
}: {
  /** El encuadre vertical. Ausente en las portadas de un solo encuadre. */
  movil?: string;
  /** El encuadre horizontal: pantallas más anchas que 3:4, como en la portada. */
  escritorio?: string;
  /** Las clases de la foto real, sin su animación de entrada. */
  className: string;
}) {
  const base = movil ?? escritorio;
  if (!base) return null;
  return (
    <picture className="absolute inset-0">
      {movil && escritorio && <source media="(min-aspect-ratio: 3/4)" srcSet={escritorio} />}
      {/* `alt=""` la declara decorativa: un lector de pantalla la salta, y la
          foto real de arriba es la que lleva la descripción. `<picture>` no
          admite `aria-hidden`. */}
      <img src={base} alt="" className={className} />
    </picture>
  );
}
