import type { Sale } from "@/lib/afeleia/contract";

/** Lo que la rebaja agrega al precio, ya en texto y en el idioma de la página. */
export type SaleCopy = {
  /** El precio de antes, formateado: el que va tachado. */
  previousPrice: string;
  /** La etiqueta «−N %». */
  discount: string;
  /** «Precio anterior» y «Precio actual», para quien no ve el tachado. */
  previousLabel: string;
  currentLabel: string;
};

/** Lo que hace falta de un traductor de next-intl, sin atarse a su tipo genérico. */
type Translator = (key: string, values?: Record<string, number>) => string;

/**
 * Los textos de la rebaja de un producto, o `undefined` si no tiene.
 *
 * `t` es el traductor del espacio `vinos`, que la tarjeta y la ficha ya tienen.
 * El porcentaje es el que publica Afeleia: acá se le pone el signo y el «%» del
 * idioma, no se calcula.
 */
export function saleCopy(
  sale: Sale | undefined,
  formatPrice: (amount: number) => string,
  t: Translator,
): SaleCopy | undefined {
  if (!sale) return undefined;
  return {
    previousPrice: formatPrice(sale.previousPriceCLP),
    discount: t("price.discount", { percent: sale.discountPercent }),
    previousLabel: t("price.previous"),
    currentLabel: t("price.current"),
  };
}

/**
 * El precio de un vino: lo usan la tarjeta de la tienda y la ficha.
 *
 * Sin rebaja dibuja lo mismo que antes de existir —un elemento con el precio y
 * las clases que le pasa cada página—. Con rebaja agrega arriba el precio
 * anterior tachado y la etiqueta «−N %»; el precio de venta sigue siendo el
 * número grande, porque es lo que se cobra.
 *
 * El tachado no se anuncia: un lector de pantalla lee dos precios seguidos sin
 * saber cuál vale. Por eso cada uno lleva su rótulo en `sr-only`, y como texto y
 * no en `aria-label`, que sobre un `span` sin rol no se lee.
 *
 * Todo son `span`: el precio de la ficha es un `<p>`, y un párrafo no admite
 * bloques adentro. La etiqueta usa la pastilla llena de los filtros de la tienda.
 */
export default function PrecioProducto({
  as: Tag = "span",
  className,
  price,
  sale,
}: {
  /** `p` en la ficha, donde el precio es un párrafo; `span` en la tarjeta. */
  as?: "span" | "p";
  /** Tipografía del precio de venta. Es la misma con y sin rebaja. */
  className: string;
  /** El precio de venta, ya formateado. */
  price: string;
  sale?: SaleCopy;
}) {
  if (!sale) return <Tag className={className}>{price}</Tag>;

  return (
    <Tag className="flex flex-col items-start gap-1.5">
      <span className="flex items-center gap-2">
        <span className="sr-only">{sale.previousLabel}: </span>
        <s className="font-body text-[15px] font-normal leading-none text-on-surface-variant line-through tabular-nums">
          {sale.previousPrice}
        </s>
        <span className="inline-flex items-center rounded-full bg-primary px-2 py-1 font-body text-[12px] font-semibold leading-none text-on-primary tabular-nums">
          {sale.discount}
        </span>
      </span>
      <span className={className}>
        <span className="sr-only">{sale.currentLabel}: </span>
        {price}
      </span>
    </Tag>
  );
}
