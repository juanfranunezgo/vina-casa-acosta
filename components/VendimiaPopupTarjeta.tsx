"use client";

import Image from "next/image";
import { ArrowRight, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import {
  aperturaVendimia,
  urlCheckoutVendimia,
  useAperturaPendiente,
  useEventoVendimia,
} from "@/lib/eventoVendimia";
import { marcarPopupCerrado } from "@/lib/popupVendimia";
import {
  estadoPopupVendimia,
  formatoApertura,
  formatoFechasEvento,
  formatoPrecio,
  precioAdultoDesde,
} from "@/lib/vendimiaReserva";

const TITULO_ID = "popup-vendimia-titulo";

export default function VendimiaPopupTarjeta() {
  const t = useTranslations("activities.vendimia.popup");
  const locale = useLocale();
  const { evento } = useEventoVendimia();
  const pendiente = useAperturaPendiente(evento);
  const dialogo = useRef<HTMLDialogElement>(null);
  const [cerrado, setCerrado] = useState(false);

  const estado =
    evento && urlCheckoutVendimia && !cerrado ? estadoPopupVendimia(evento, pendiente) : null;

  useEffect(() => {
    if (estado && !dialogo.current?.open) dialogo.current?.showModal();
  }, [estado]);

  if (!evento || !estado) return null;

  const cerrar = () => dialogo.current?.close();
  const alCerrar = () => {
    marcarPopupCerrado();
    setCerrado(true);
  };

  const apertura =
    estado === "abre" && aperturaVendimia !== null
      ? formatoApertura(aperturaVendimia, locale)
      : null;
  const desde = precioAdultoDesde(evento, estado === "abre");
  const destino = `/${locale}/actividades/vendimia${estado === "abierta" ? "#consulta" : ""}`;

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={TITULO_ID}
      onClose={alCerrar}
      onClick={(e) => {
        if (e.target === dialogo.current) cerrar();
      }}
      className="m-auto w-[min(92vw,26rem)] overflow-hidden rounded-2xl bg-white p-0 text-on-surface shadow-2xl backdrop:bg-black/55"
    >
      <div className="relative h-44">
        <Image
          src="/images/actividades/vendimia-cosecha.webp"
          alt=""
          fill
          sizes="(max-width: 480px) 92vw, 26rem"
          className="object-cover"
        />
        <button
          type="button"
          aria-label={t("cerrar")}
          onClick={cerrar}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-primary transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="p-6">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-primary/80">
          {estado === "abre" ? t("etiquetaProxima") : t("etiquetaAbierta")}
        </p>
        <h2 id={TITULO_ID} className="mt-1.5 font-body text-2xl font-bold leading-tight text-primary">
          {evento.nombre}
        </h2>
        <p className="mt-2 font-body text-body-md text-on-surface first-letter:uppercase">
          {formatoFechasEvento(evento, locale)}
        </p>
        {apertura && (
          <p className="mt-1 font-body text-body-md font-semibold text-primary">
            {t("abre", { dia: apertura.larga, hora: apertura.hora })}
          </p>
        )}
        {desde && (
          <p className="mt-1 font-body text-sm text-on-surface-variant">
            {t("desde", { precio: formatoPrecio(desde.precio, evento.moneda, locale) })}
          </p>
        )}
        <div className="mt-5">
          <Button
            href={destino}
            variant="primary"
            fullWidth
            multiline
            onClick={cerrar}
            iconRight={<ArrowRight className="h-4 w-4" />}
          >
            {estado === "abre" ? t("ctaVer") : t("ctaReservar")}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
