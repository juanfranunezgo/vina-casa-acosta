/**
 * Compra mínima de la tienda, en botellas y sumando todo el carrito (no por
 * vino: seis botellas de seis etiquetas distintas cumplen). Es el respaldo:
 * si el catálogo publica `checkout.compra_minima_unidades`, manda ese
 * (`minBottlesFrom` en lib/checkout.ts).
 *
 * Es una regla del negocio, no del componente que la dibuja: el cajón la usa
 * para bloquear el cierre y la ficha de vino para anunciarla, y las dos leen
 * este mismo número.
 *
 * Vive fuera de `lib/cart.ts` porque ese módulo es "use client": una
 * constante importada de ahí en un componente de servidor llega como
 * referencia de cliente, no como el número. `lib/cart.ts` la reexporta.
 */
export const MIN_BOTTLES = 6;
