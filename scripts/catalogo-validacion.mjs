/**
 * Qué respuesta puede convertirse en snapshot, y cuál no.
 *
 * Vive aparte del generador —y no adentro— por dos motivos: importar el
 * generador lo EJECUTA (tiene efectos al cargarse), y esta decisión es
 * exactamente la que hay que poder probar sin red.
 *
 * La regla de fondo: el snapshot es la ultima linea de defensa del sitio. Pisar
 * uno bueno con uno inservible no es "quedarse igual", es quedarse peor que
 * antes — y desde que el snapshot se refresca en cada build, esta funcion corre
 * en cada deploy en vez de cuando alguien se acuerda.
 *
 * Se reusa `isValidCatalog`, el MISMO guard que aplica el runtime a la respuesta
 * viva. Si el generador aceptara algo que el runtime rechaza, el sitio quedaria
 * con un fallback que no puede servir: el peor de los dos mundos, y sin aviso.
 */
import { CONTRACT_VERSION, isValidCatalog } from "../lib/afeleia/contract.ts";

/**
 * Motivo por el que esta respuesta NO puede escribirse como snapshot, o `null`
 * si puede.
 *
 * @param {unknown} payload respuesta ya parseada de la API
 * @param {string} sitioEsperado slug que se pidió (`NEXT_PUBLIC_AFELEIA_SITIO`)
 * @returns {string | null}
 */
export function razonParaRechazar(payload, sitioEsperado) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return "la respuesta no es un objeto";
  }

  if (payload.version !== CONTRACT_VERSION) {
    return `se esperaba version ${CONTRACT_VERSION} y llego ${JSON.stringify(payload.version)}`;
  }

  // Un 200 con el catalogo de OTRO cliente es la falla mas peligrosa de todas:
  // el sitio publicaria nombres y precios ajenos, y ese catalogo quedaria
  // sellado como fallback legitimo. Un endpoint mal configurado, un slug mal
  // escrito o una API redirigida bastan para producirlo, sin que nada falle.
  if (payload.sitio !== sitioEsperado) {
    return `la respuesta es del sitio ${JSON.stringify(payload.sitio)} y se pidio ${JSON.stringify(sitioEsperado)}`;
  }

  if (!Array.isArray(payload.productos) || payload.productos.length === 0) {
    return "el catalogo llego vacio";
  }

  // El guard del runtime, al pie de la letra: un producto sin slug rompe
  // `generateStaticParams` y hace fallar el build entero — o sea, un 200
  // malformado impediria desplegar, que es justo lo que el fallback existe para
  // evitar.
  if (!isValidCatalog(payload)) {
    return `la respuesta no cumple el contrato v${CONTRACT_VERSION}: algun producto no trae slug, nombre, precio, imagenes, agotado o atributos`;
  }

  return null;
}
