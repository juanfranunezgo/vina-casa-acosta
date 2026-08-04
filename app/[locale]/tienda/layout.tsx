import type { Metadata } from "next";
import { alternatesFor } from "@/lib/alternates";

/**
 * Este layout existe solo para poder declarar metadata: `tienda/page.tsx` es un
 * client component (usa el store del carrito y los filtros), y un client
 * component no puede exportar `generateMetadata`.
 *
 * PENDIENTE: `messages/*.json` no tiene un namespace `metadata.tienda`, así que
 * la tienda hereda el title y la description genéricos del sitio. Redactar ese
 * copy en es/en/pt es trabajo de contenido y necesita validación del cliente
 * (ver el blocker de copy EN/PT en docs/HANDOFF.md), por eso no se inventa acá.
 */
export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]/tienda">): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: alternatesFor(locale, "/tienda") };
}

export default function TiendaLayout({
  children,
}: LayoutProps<"/[locale]/tienda">) {
  return children;
}
