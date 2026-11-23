"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { edadConfirmada } from "@/components/AgeGate";
import { popupCerradoEnEstaVisita } from "@/lib/popupVendimia";

/** Se carga recién al mostrarse: el resto del sitio no paga ni su código ni el pedido del catálogo. */
const VendimiaPopupTarjeta = dynamic(() => import("@/components/VendimiaPopupTarjeta"), {
  ssr: false,
});

const ESPERA_MS = 5_000;
const REVISION_EDAD_MS = 500;
/** La página de la Vendimia ya muestra las fechas y la reserva. */
const RUTA_VENDIMIA = /\/actividades\/vendimia(\/|$)/;

/**
 * El aviso de la Vendimia, cinco segundos después de entrar. Nunca aparece encima de la pregunta de
 * edad: la espera parte cuando esa pregunta ya está respondida.
 */
export default function VendimiaPopup() {
  const pathname = usePathname();
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_VENDIMIA_RESERVAS !== "abierta") return;
    if (popupCerradoEnEstaVisita()) return;

    let espera: ReturnType<typeof setTimeout> | undefined;
    const programar = () => {
      espera = setTimeout(() => setListo(true), ESPERA_MS);
    };
    if (edadConfirmada()) {
      programar();
      return () => clearTimeout(espera);
    }
    const revision = setInterval(() => {
      if (!edadConfirmada()) return;
      clearInterval(revision);
      programar();
    }, REVISION_EDAD_MS);
    return () => {
      clearInterval(revision);
      clearTimeout(espera);
    };
  }, []);

  // El layout sobrevive a la navegación: al volver atrás no reabre lo que ya se cerró.
  if (!listo || RUTA_VENDIMIA.test(pathname) || popupCerradoEnEstaVisita()) return null;
  return <VendimiaPopupTarjeta />;
}
