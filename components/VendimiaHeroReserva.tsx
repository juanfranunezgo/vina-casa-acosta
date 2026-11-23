"use client";

import { useLocale, useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import {
  aperturaVendimia,
  elegirFechaVendimia,
  urlCheckoutVendimia,
  useAperturaPendiente,
  useEventoVendimia,
} from "@/lib/eventoVendimia";
import {
  formatoApertura,
  formatoPrecio,
  partesFecha,
  precioAdultoDesde,
} from "@/lib/vendimiaReserva";

/**
 * Dv1 — La entrada del hero. Es lo primero que se ve y ya sirve para reservar:
 * tocar una fecha la deja elegida y baja al formulario. Fechas y precio salen del
 * catálogo. Sin evento publicado queda solo el botón a la consulta.
 */
export default function VendimiaHeroReserva() {
  const t = useTranslations("activities.vendimia.landing");
  const locale = useLocale();
  const { evento } = useEventoVendimia();
  const pendiente = useAperturaPendiente(evento);

  if (!evento || !urlCheckoutVendimia) {
    return (
      <div className="mt-7 flex justify-center">
        <Button href="#consulta" variant="primary" size="lg" multiline>
          {t("avisame")}
        </Button>
      </div>
    );
  }

  const apertura =
    pendiente && aperturaVendimia !== null ? formatoApertura(aperturaVendimia, locale) : null;
  const desde = precioAdultoDesde(evento, apertura !== null);

  return (
    <div className="ticket-vendimia mx-auto mt-4 grid w-full md:mt-6 max-w-3xl grid-cols-1 rounded-[22px] bg-white text-left text-on-surface md:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="p-4 md:p-5">
        <p className="font-body text-sm font-semibold text-primary">{t("eligeFecha")}</p>
        <ul className="mt-2.5 grid grid-cols-2 gap-2">
          {evento.fechas.map((fecha) => {
            const { semana, dia, mes } = partesFecha(fecha, locale);
            const contenido = (
              <>
                <span className="font-body text-[2rem] font-bold leading-none tabular-nums">
                  {dia}
                </span>
                <span className="min-w-0 font-body text-[13px] leading-tight">
                  <span className="block font-semibold first-letter:uppercase">{mes}</span>
                  <span className="block first-letter:uppercase">{semana}</span>
                </span>
                <span className="col-span-2 font-body text-xs font-medium">
                  {fecha.disponible
                    ? t("hayCupos")
                    : apertura
                      ? t("abreCorto", { dia: apertura.corta, hora: apertura.hora })
                      : t("sinCupos")}
                </span>
              </>
            );
            const base = "grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 rounded-xl px-3 py-2.5";
            return (
              <li key={fecha.clave}>
                {fecha.disponible ? (
                  <a
                    href="#consulta"
                    onClick={() => elegirFechaVendimia(fecha.clave)}
                    className={`${base} bg-primary/[0.06] text-primary transition-colors hover:bg-primary hover:text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                  >
                    {contenido}
                  </a>
                ) : (
                  <span className={`${base} bg-neutro-claro text-on-surface-variant/70`}>
                    {contenido}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-dashed border-outline-variant p-4 md:flex-col md:items-stretch md:justify-center md:border-l md:border-t-0 md:p-5">
        {desde && (
          <p className="min-w-0 font-body leading-tight">
            <span className="block text-xs text-on-surface-variant">{t("adultosDesde")}</span>
            <span className="block text-[1.4rem] font-bold tabular-nums text-primary">
              {formatoPrecio(desde.precio, evento.moneda, locale)}
            </span>
          </p>
        )}
        <Button href="#consulta" variant="primary" multiline className="shrink-0 justify-center">
          {apertura ? t("verFechas") : t("reservar")}
        </Button>
      </div>
    </div>
  );
}
