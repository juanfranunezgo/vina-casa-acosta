"use client";

import { useLocale } from "next-intl";
import { useEventoVendimia } from "@/lib/eventoVendimia";
import { formatoFechasEvento } from "@/lib/vendimiaReserva";

/** Las fechas del evento publicado. Sin evento, el texto de temporada que trae la página. */
export default function FechasVendimia({ respaldo }: { respaldo: string }) {
  const locale = useLocale();
  const { evento } = useEventoVendimia();
  return <>{evento ? formatoFechasEvento(evento, locale) : respaldo}</>;
}
