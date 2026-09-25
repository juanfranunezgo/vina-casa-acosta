import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ShieldCheck, Store, Truck } from "lucide-react";
import IconBadge from "@/components/ui/IconBadge";

/**
 * El logo oficial: `MP_RGB_HANDSHAKE_color_horizontal.svg` del paquete "Logos
 * Mercado Pago 2025" (versión marzo 2025), el que la marca indica para uso
 * digital sobre fondo claro. Se copió sin tocar: su guía prohíbe editar el
 * SVG, así que tampoco se le recorta el margen de respiro que trae —el dibujo
 * ocupa cerca del 45% del alto—, y el tamaño de abajo lo compensa.
 * `tests/vino-ficha` verifica que el archivo exista.
 */
const MERCADO_PAGO_LOGO = "/brand/mercado-pago.svg";

type Props = {
  /**
   * Si el pago en línea está encendido: la misma condición que muestra
   * "Pagar" en el carrito (`NEXT_PUBLIC_AFELEIA_CHECKOUT_URL`). Sin él, el
   * pedido cierra por WhatsApp y el sello de Mercado Pago no se dibuja.
   */
  pagoEnLinea: boolean;
  /** Botellas mínimas por pedido, del catálogo (`getMinBottles`). */
  minBottles: number;
  /**
   * `lista` — en la tarjeta de compra de la ficha de vino (Cd1): una fila por
   * dato, con su nota. `franja` — bajo el encabezado de la tienda (F1): los
   * títulos en una fila que se envuelve, sin notas.
   */
  variante?: "lista" | "franja";
};

/**
 * "Pago seguro con [logo]": el logo hace de nombre de la marca, como en los
 * checkouts, y un lector de pantalla lee "Pago seguro con Mercado Pago". Va
 * pegado al texto y no alineado a la derecha: en la columna angosta de la
 * tarjeta de compra se iba a la línea siguiente y quedaba colgado.
 */
function PagoSeguro({ texto, className }: { texto: string; className: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-1 ${className}`}>
      {texto}
      <Image
        src={MERCADO_PAGO_LOGO}
        alt="Mercado Pago"
        // La proporción del `viewBox` del archivo (1048.82 × 425.2).
        width={1049}
        height={425}
        // Un SVG no se optimiza: se sirve tal cual. Explícito aunque Next lo
        // deduzca de la extensión.
        unoptimized
        // 48px de caja para ~22px de dibujo. Los márgenes negativos descuentan
        // el respiro que trae el archivo (no se recorta: la guía de la marca
        // prohíbe editarlo), para que el logo quede pegado al texto y la fila
        // no crezca.
        className="-my-3 -ml-2.5 h-12 w-auto"
      />
    </p>
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

  if (variante === "franja") {
    const titulo = "font-body text-[14px] font-semibold leading-snug text-primary";
    return (
      <ul className="flex flex-wrap items-center gap-x-7 gap-y-3">
        {pagoEnLinea && (
          <li className="flex items-center gap-2.5">
            <IconBadge size="sm">
              <ShieldCheck />
            </IconBadge>
            <PagoSeguro texto={t("securePayment")} className={titulo} />
          </li>
        )}
        {filas.map(({ icon: Icon, title }) => (
          <li key={title} className="flex items-center gap-2.5">
            <IconBadge size="sm">
              <Icon />
            </IconBadge>
            <p className={titulo}>{title}</p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-5">
      {pagoEnLinea && (
        <li className="flex items-start gap-3.5">
          <IconBadge size="sm" className="mt-0.5">
            <ShieldCheck />
          </IconBadge>
          <div className="min-w-0 flex-1">
            <PagoSeguro
              texto={t("securePayment")}
              className="font-body text-[15px] font-semibold leading-snug text-primary"
            />
            <p className="mt-1 font-body text-[13px] leading-snug text-on-surface-variant">
              {t("securePaymentNote")}
            </p>
          </div>
        </li>
      )}
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
  );
}
