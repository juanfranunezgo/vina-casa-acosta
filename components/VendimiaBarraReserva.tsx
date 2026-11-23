"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import {
  urlCheckoutVendimia,
  useAperturaPendiente,
  useEventoVendimia,
} from "@/lib/eventoVendimia";
import { formatoPrecio, precioAdultoDesde } from "@/lib/vendimiaReserva";

/**
 * La barra de reserva: acompaña desde que la entrada del hero sale de pantalla
 * hasta que aparece el formulario, para que reservar esté siempre a un toque.
 * `data-subnav-abajo` es lo que lee `globals.css` para subir el carrito flotante.
 */
export default function VendimiaBarraReserva() {
  const t = useTranslations("activities.vendimia.landing");
  const locale = useLocale();
  const { evento } = useEventoVendimia();
  const pendiente = useAperturaPendiente(evento);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.querySelector("main > section");
    const reserva = document.getElementById("consulta");
    if (!hero || !reserva) return;
    let cuadro = 0;
    const medir = () => {
      cuadro = 0;
      const pasoElHero = hero.getBoundingClientRect().bottom < 96;
      const { top, bottom } = reserva.getBoundingClientRect();
      const enReserva = top < window.innerHeight && bottom > 0;
      setVisible(pasoElHero && !enReserva);
    };
    const pedirMedida = () => {
      if (!cuadro) cuadro = requestAnimationFrame(medir);
    };
    pedirMedida();
    window.addEventListener("scroll", pedirMedida, { passive: true });
    window.addEventListener("resize", pedirMedida);
    return () => {
      window.removeEventListener("scroll", pedirMedida);
      window.removeEventListener("resize", pedirMedida);
      if (cuadro) cancelAnimationFrame(cuadro);
    };
  }, []);

  const abierta = evento !== null && urlCheckoutVendimia !== null;
  const desde = abierta ? precioAdultoDesde(evento, pendiente) : null;

  return (
    <div
      data-subnav-abajo={visible ? "visible" : "oculta"}
      data-vendimia-barra={visible ? "visible" : "oculta"}
      className={`pointer-events-none fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 transition-[opacity,translate,visibility] duration-300 motion-reduce:transition-none ${
        visible ? "" : "invisible translate-y-4 opacity-0"
      }`}
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-4 rounded-2xl bg-white py-2 pl-5 pr-2 shadow-[0_18px_44px_-14px_rgba(27,28,28,0.5)] ring-1 ring-outline-variant/50">
        <p className="min-w-0 font-body leading-tight">
          {abierta && desde ? (
            <>
              <span className="block text-xs text-on-surface-variant">{t("adultosDesde")}</span>
              <span className="block text-lg font-bold tabular-nums text-primary">
                {formatoPrecio(desde.precio, evento.moneda, locale)}
              </span>
            </>
          ) : (
            <span className="block text-sm font-semibold text-primary">{t("barraSinEvento")}</span>
          )}
        </p>
        <Button href="#consulta" variant="primary" multiline className="shrink-0">
          {abierta ? (pendiente ? t("verFechas") : t("reservar")) : t("avisarme")}
        </Button>
      </div>
    </div>
  );
}
