export type Parte = { texto: string; destacado: boolean };

/**
 * Parte un texto de `messages` en tramos normales y destacados. Lo destacado va
 * entre dobles asteriscos: "Recibimos al grupo con **agua saborizada**."
 *
 * Existe por un pedido de Juan Francisco (2026-09-24): leer tiene que ser más
 * amable, con lo importante de cada párrafo en negrita, como en Quorum Legal.
 * El destacado lo decide quien escribe el texto y viaja con él en los tres
 * idiomas —cada idioma pone la negrita donde cae la frase—, así que la marca
 * vive en el mensaje y no en el componente.
 *
 * No es Markdown ni lo pretende: sólo `**`. Un par sin cerrar se queda como
 * texto normal en vez de romper la frase; `tests/enfasis.test.mjs` exige que
 * todos los mensajes cierren sus pares.
 */
export function partesConEnfasis(texto: string): Parte[] {
  const tramos = texto.split("**");
  // Número par de tramos = hay un `**` sin pareja: no se destaca nada.
  if (tramos.length % 2 === 0) return [{ texto, destacado: false }];
  return tramos
    .map((tramo, i) => ({ texto: tramo, destacado: i % 2 === 1 }))
    .filter((parte) => parte.texto.length > 0);
}

/** El texto sin las marcas, para donde no se dibuja: `alt`, metadatos, WhatsApp. */
export function sinEnfasis(texto: string): string {
  return partesConEnfasis(texto)
    .map((parte) => parte.texto)
    .join("");
}
