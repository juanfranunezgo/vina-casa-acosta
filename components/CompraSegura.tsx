import type { ReactNode } from "react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Store, Truck } from "lucide-react";
import IconBadge from "@/components/ui/IconBadge";

/**
 * El logo oficial: `MP_RGB_HANDSHAKE_color_horizontal.svg` del paquete "Logos
 * Mercado Pago 2025" (versión marzo 2025), el que la marca indica para uso
 * digital sobre fondo claro. Se copió sin tocar: su guía prohíbe editar el
 * SVG, así que tampoco se le recorta el margen de respiro que trae. Medido
 * sobre el archivo: el dibujo ocupa el 47% del alto y el 75% del ancho, con
 * un 27% libre arriba y abajo y un 12% a cada lado.
 * `tests/vino-ficha` verifica que el archivo exista.
 */
const MERCADO_PAGO_LOGO = "/brand/mercado-pago.svg";

type Props = {
  /**
   * Si el pago en línea está encendido: la misma condición que muestra
   * "Pagar" en el carrito (`NEXT_PUBLIC_AFELEIA_CHECKOUT_URL`). Sin él, el
   * pedido cierra por WhatsApp y la banda de Mercado Pago no se dibuja.
   */
  pagoEnLinea: boolean;
  /** Botellas mínimas por pedido, del catálogo (`getMinBottles`). */
  minBottles: number;
  /**
   * `lista` — en la tarjeta de compra de la ficha de vino (Cd1): la banda de
   * Mercado Pago y una fila por dato, con su nota. `franja` — bajo el
   * encabezado de la tienda (F1): la banda y los títulos en una fila, sin notas.
   */
  variante?: "lista" | "franja";
};

/**
 * La banda de Mercado Pago: el texto a la izquierda y el logo, grande, a la
 * derecha, sobre gris neutro.
 *
 * Hasta el 2026-10-12 el logo iba pegado a la frase "Pago seguro con", a la
 * altura del texto. Juan Francisco lo vio mal en la tienda y en la ficha —la
 * marca son dos renglones al lado de uno, y a 22 px de alto quedaba chica y
 * desalineada— y mandó de referencia una banda así. Se copió la forma, no su
 * texto ("hasta 6 cuotas sin interés"): eso depende de la cuenta de la viña y
 * nadie lo confirmó.
 *
 * El logo hace de nombre de la marca: el texto no la repite, y un lector de
 * pantalla la lee del `alt`.
 */
function BandaMercadoPago({
  titulo,
  nota,
  className = "",
}: {
  /** Con su negrita ya puesta (`t.rich`). */
  titulo: ReactNode;
  nota: string;
  className?: string;
}) {
  return (
    // Dos columnas: el texto y el logo. En celular la nota baja a una fila
    // propia, a todo el ancho —al lado del logo quedaba en cinco renglones—;
    // desde `sm` va bajo el título y el logo se centra contra los dos.
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-2xl bg-neutro-claro px-5 py-4 ${className}`}
    >
      <p className="font-body text-[16px] leading-snug text-on-surface-variant sm:text-[17px]">
        {titulo}
      </p>
      <Image
        src={MERCADO_PAGO_LOGO}
        alt="Mercado Pago"
        // La proporción del `viewBox` del archivo (1048.82 × 425.2).
        width={1049}
        height={425}
        // Un SVG no se optimiza: se sirve tal cual. Explícito aunque Next lo
        // deduzca de la extensión.
        unoptimized
        // 64 px de caja para 30 de dibujo (80 para 37 desde `sm`). Los
        // márgenes negativos descuentan el respiro que trae el archivo —no
        // se recorta: la guía de la marca prohíbe editarlo—, para que el
        // dibujo quede al borde de la banda y la banda no crezca. `max-w-none`
        // porque la columna mide el logo ya descontados esos márgenes, y el
        // `max-width: 100%` de base lo encogía a ese ancho (medido: 149 px en
        // vez de 197, con el dibujo un cuarto más chico).
        className="-mx-5 -my-4 h-16 w-auto max-w-none sm:row-span-2 sm:-mx-6 sm:-my-5 sm:h-20"
      />
      <p className="col-span-2 font-body text-[13px] leading-snug text-on-surface-variant sm:col-span-1">
        {nota}
      </p>
    </div>
  );
}

/**
 * "Compra segura": en la tarjeta de compra de la ficha de vino (Cd1) y bajo el
 * encabezado de la tienda (F1). Pedido de Juan Francisco del 2026-09-25: ni la
 * ficha ni la tienda decían cómo se paga ni a quién se le compra, que es lo
 * que frena a quien compra vino por internet a una viña que no conoce. Un solo
 * componente para los dos lugares: si cambia un dato, cambia en los dos.
 *
 * Tres datos y ninguno inventado: el pago lo procesa Mercado Pago (Checkout
 * Pro: el comprador paga en su sitio), se le compra a la viña, y el mínimo y
 * el despacho coordinado que el sitio ya publica en la tienda. Sin plazos ni
 * cobertura de envío: la viña no los dio.
 */
export default async function CompraSegura({
  pagoEnLinea,
  minBottles,
  variante = "lista",
}: Props) {
  const t = await getTranslations("wineDetail.trust");

  const filas = [
    { icon: Store, title: t("direct"), note: t("directNote") },
    {
      icon: Truck,
      title: t("minimum", { min: minBottles }),
      note: t("minimumNote"),
    },
  ];

  // "Compra en línea con **pago seguro**": la negrita viene marcada en el
  // mensaje, porque la parte que se destaca cambia de lugar según el idioma.
  const tituloBanda = t.rich("securePaymentBanner", {
    b: (texto) => <strong className="font-bold text-primary">{texto}</strong>,
  });

  if (variante === "franja") {
    const titulo = "font-body text-[14px] font-semibold leading-snug text-primary";
    return (
      <div className="space-y-5">
        {pagoEnLinea && (
          <BandaMercadoPago
            titulo={tituloBanda}
            nota={t("securePaymentNote")}
            // El ancho del subtítulo que tiene arriba.
            className="max-w-2xl"
          />
        )}
        <ul className="flex flex-wrap items-center gap-x-7 gap-y-3">
          {filas.map(({ icon: Icon, title }) => (
            <li key={title} className="flex items-center gap-2.5">
              <IconBadge size="sm">
                <Icon />
              </IconBadge>
              <p className={titulo}>{title}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {pagoEnLinea && (
        <BandaMercadoPago titulo={tituloBanda} nota={t("securePaymentNote")} />
      )}
      <ul className="space-y-5">
        {filas.map(({ icon: Icon, title, note }) => (
          <li key={title} className="flex items-start gap-3.5">
            <IconBadge size="sm" className="mt-0.5">
              <Icon />
            </IconBadge>
            <div className="min-w-0">
              <p className="font-body text-[15px] font-semibold leading-snug text-primary">{title}</p>
              <p className="mt-1 font-body text-[13px] leading-snug text-on-surface-variant">{note}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
