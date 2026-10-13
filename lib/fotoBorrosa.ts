import { fotosBorrosas } from "@/data/fotosBorrosas";

/**
 * La miniatura borrosa de una foto de `public/`, como data URI, o `undefined`
 * si todavía no se generó.
 *
 * `npm run fotos:borrosas` encuentra qué fotos necesitan miniatura buscando
 * justamente estas llamadas: la ruta tiene que ir escrita como texto literal,
 * `fotoBorrosa("/images/…")`, no armada en una variable.
 *
 * Sólo para componentes de servidor: importa el mapa entero. A uno de cliente
 * se le pasa el resultado por props (ver `AgeGate`).
 */
export function fotoBorrosa(ruta: string): string | undefined {
  return fotosBorrosas[ruta];
}
