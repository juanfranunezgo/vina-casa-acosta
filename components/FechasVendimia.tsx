"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEventoVendimia } from "@/lib/eventoVendimia";
import { formatoFechasEvento, horarioComun } from "@/lib/vendimiaReserva";

/** Las fechas del evento publicado. Sin evento, el texto de temporada que trae la página. */
export default function FechasVendimia({ respaldo }: { respaldo: string }) {
  const locale = useLocale();
  const { evento } = useEventoVendimia();
  return <>{evento ? formatoFechasEvento(evento, locale) : respaldo}</>;
}

/** El horario publicado, en hora de Chile. Sin evento, «Jornada completa». */
export function HorarioVendimia({ respaldo }: { respaldo: string }) {
  const locale = useLocale();
  const t = useTranslations("activities.vendimia.reserva");
  const { evento } = useEventoVendimia();
  const horario = evento ? horarioComun(evento, locale) : null;
  return <>{horario ? t("horario", horario) : respaldo}</>;
}
