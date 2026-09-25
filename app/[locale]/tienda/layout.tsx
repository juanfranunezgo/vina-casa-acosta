import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/lib/alternates";
import { checkoutIniciarUrl } from "@/lib/checkout";

/**
 * Este layout existe solo para poder declarar metadata: `tienda/page.tsx` es un
 * client component (usa el store del carrito y los filtros), y un client
 * component no puede exportar `generateMetadata`.
 *
 * El copy EN/PT es borrador optimizado, no traducción validada por el cliente
 * (ver el blocker de copy en docs/HANDOFF.md). Se escribió igual porque la
 * alternativa era peor: sin `metadata.tienda`, las tres URLs de la tienda
 * heredaban el título y la descripción de la portada, y competían con ella por
 * el mismo resultado en Google en vez de responder a la intención de compra.
 */
export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]/tienda">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.tienda" });
  // "Pago seguro con Mercado Pago" en el resultado de Google sólo con el pago
  // en línea encendido: la misma condición que la franja, el pie y el
  // "Pagar" del carrito (2026-09-25).
  const pagoEnLinea =
    checkoutIniciarUrl(process.env.NEXT_PUBLIC_AFELEIA_CHECKOUT_URL) !== null;
  return {
    title: t("title"),
    description: t(pagoEnLinea ? "descriptionOnline" : "description"),
    alternates: alternatesFor(locale, "/tienda"),
  };
}

export default function TiendaLayout({
  children,
}: LayoutProps<"/[locale]/tienda">) {
  return children;
}
